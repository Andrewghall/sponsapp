// Retrieval-only SPONS candidate lookup
// - Filter by trade and compatible unit
// - Vector similarity on description
// - Return top N candidates with scores

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface RetrievedCandidate {
  id: string
  item_code: string
  description: string
  unit: string
  trade?: string
  book?: string
  section?: string
  rate?: number
  similarity_score: number
  unit_matches: boolean
  trade_matches: boolean
}

const SIMILARITY_THRESHOLD = 0.65
const MAX_CANDIDATES = 10

/**
 * Retrieve SPONS candidates for a line item using filtering + pgvector similarity.
 * Stores candidates in spons_matches (is_selected = false) and updates line_item status.
 */
export async function retrieveCandidates(lineItemId: string): Promise<RetrievedCandidate[]> {
  const lineItem = await prisma.line_items.findUnique({
    where: { id: lineItemId },
    include: {
      captures: {
        orderBy: { created_at: 'desc' },
        take: 1,
      },
    },
  })

  if (!lineItem) throw new Error('Line item not found')
  const capture = lineItem.captures[0]
  if (!capture) throw new Error('No capture found for line item')

  const normalized = {
    type: lineItem.col_b_type || undefined,
    category: lineItem.col_c_category || undefined,
    description: lineItem.col_g_description || undefined,
    unit: extractUnitFromQuantities(capture.raw_quantities as { value: number; unit: string }[]),
    trade: inferTradeFromType(lineItem.col_b_type || undefined, lineItem.col_c_category || undefined),
  }

  // 1. Filter by trade and compatible unit
  const baseQuery = {
    where: {
      ...(normalized.trade && { trade: normalized.trade }),
      unit: {
        in: compatibleUnits(normalized.unit),
      },
    },
  }

  // 2. Vector similarity on description (if embedding exists)
  const candidates: RetrievedCandidate[] = []
  if (normalized.description) {
    // Get compatible units as PostgreSQL array
    const compatibleUnitsArray = compatibleUnits(normalized.unit)
    console.log('Compatible units array:', compatibleUnitsArray)
    
    // Build parameterized query with proper type casting
    const queryParams: any[] = []
    let paramIndex = 1
    
    let whereClause = `unit = ANY($${paramIndex}::text[])`
    queryParams.push(compatibleUnitsArray)
    paramIndex++
    
    if (normalized.trade) {
      whereClause += ` AND trade = $${paramIndex}::text`
      queryParams.push(normalized.trade)
      paramIndex++
    }
    
    whereClause += ' AND embedding IS NOT NULL'
    
    const fullSql = `SELECT 
        id, item_code, description, unit, trade, book, section, rate,
        (embedding <=> $${paramIndex}::vector) AS similarity
      FROM spons_items
      WHERE ${whereClause}
      ORDER BY similarity ASC
      LIMIT ${MAX_CANDIDATES}`
    
    console.log('Full SQL:', fullSql)
    console.log('SQL params (including description):', [...queryParams, normalized.description])
    
    const similarityResults = await prisma.$queryRaw<Array<{
      id: string
      item_code: string
      description: string
      unit: string
      trade?: string
      book?: string
      section?: string
      rate?: number
      similarity: number
    }>>(
      Prisma.raw(fullSql),
      ...queryParams,
      normalized.description
    )

    for (const row of similarityResults) {
      const score = 1 - row.similarity // Convert distance to similarity
      if (score < SIMILARITY_THRESHOLD) continue

      candidates.push({
        id: row.id,
        item_code: row.item_code,
        description: row.description,
        unit: row.unit,
        trade: row.trade,
        book: row.book,
        section: row.section,
        rate: row.rate ? Number(row.rate) : undefined,
        similarity_score: score,
        unit_matches: areUnitsCompatible(normalized.unit, row.unit),
        trade_matches: normalized.trade ? normalized.trade === row.trade : false,
      })
    }
  }

  // 3. Store candidates in spons_matches
  if (candidates.length > 0) {
    await prisma.spons_matches.createMany({
      data: candidates.map(c => ({
        line_item_id: lineItemId,
        spons_item_id: c.id,
        similarity_score: c.similarity_score,
        unit_matches: c.unit_matches,
        trade_matches: c.trade_matches,
        is_selected: false,
      })),
      skipDuplicates: true,
    })

    await prisma.line_items.update({
      where: { id: lineItemId },
      data: { status: 'PENDING_SPONS' },
    })

    await prisma.audit_entries.create({
      data: {
        line_item_id: lineItemId,
        action: 'SPONS_CANDIDATES_RETRIEVED',
        metadata: {
          candidateCount: candidates.length,
          topScore: candidates[0]?.similarity_score,
        },
      },
    })
  } else {
    // No candidates found
    await prisma.line_items.update({
      where: { id: lineItemId },
      data: { status: 'UNMATCHED' },
    })

    await prisma.audit_entries.create({
      data: {
        line_item_id: lineItemId,
        action: 'SPONS_CANDIDATES_RETRIEVED',
        metadata: { candidateCount: 0, reason: 'No compatible candidates' },
      },
    })
  }

  return candidates
}

// Helpers ---------------------------------------------------------

function inferTradeFromType(type?: string, category?: string): string | undefined {
  const t = (type || '').toLowerCase()
  const c = (category || '').toLowerCase()
  if (t.includes('door') || c.includes('door')) return 'Carpentry'
  if (t.includes('ahu') || t.includes('chiller') || t.includes('boiler') || t.includes('pump') || t.includes('fan')) return 'Mechanical'
  if (t.includes('distribution board') || t.includes('lighting') || t.includes('cable') || t.includes('trunking') || t.includes('conduit')) return 'Electrical'
  if (t.includes('pipe') || t.includes('valve') || t.includes('duct')) return 'Mechanical'
  return undefined
}

function extractUnitFromQuantities(qs?: { value: number; unit: string }[]): string {
  if (!qs || qs.length === 0) return 'NR'
  return qs[0].unit
}

function compatibleUnits(unit: string): string[] {
  const u = unit.toLowerCase()
  if (u === 'nr' || u === 'each' || u === 'ea') return ['NR', 'EACH', 'EA']
  if (u.includes('m') && !u.includes('sqm')) return ['M', 'LINEAR M', 'LM', 'METRE']
  if (u.includes('sqm') || u.includes('m2')) return ['SQM', 'M2', 'SQ METRE']
  return [unit.toUpperCase()]
}

function areUnitsCompatible(a?: string, b?: string): boolean {
  if (!a || !b) return false
  return compatibleUnits(a).includes(b.toUpperCase())
}
