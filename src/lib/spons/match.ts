// SPONS Matching - Retrieval only, NEVER generate
// Rules:
// 1. Selection from retrieved candidates only
// 2. Units must match
// 3. Trade must match
// 4. Action must match
// 5. If no compatible candidates: mark as UNMATCHED, do not guess

import { prisma } from '@/lib/prisma'

export interface SponsCandidate {
  id: string
  itemCode: string
  description: string
  unit: string
  trade: string | null
  rate: number | null
  similarityScore: number
  unitMatches: boolean
  tradeMatches: boolean
}

export interface MatchResult {
  lineItemId: string
  candidates: SponsCandidate[]
  selectedId: string | null
  status: 'MATCHED' | 'UNMATCHED' | 'PENDING_QS_REVIEW'
  requiresReview: boolean
}

// Match a line item to SPONS candidates
export async function matchToSpons(
  lineItemId: string,
  options?: {
    autoSelect?: boolean
    confidenceThreshold?: number
  }
): Promise<MatchResult> {
  const { autoSelect = false, confidenceThreshold = 0.8 } = options || {}

  const lineItem = await prisma.line_items.findUnique({
    where: { id: lineItemId },
    include: {
      captures: {
        orderBy: { created_at: 'desc' },
        take: 1,
      },
    },
  })

  if (!lineItem) {
    throw new Error('Line item not found')
  }

  // Get raw components and determine trade/unit requirements
  const capture = lineItem.captures[0]
  const rawComponents = (capture?.raw_components as string[]) || []
  const rawQuantities = (capture?.raw_quantities as { value: number; unit: string }[]) || []

  // Determine expected unit from quantities
  const expectedUnit = rawQuantities[0]?.unit || 'nr'
  
  // Determine trade from type/category
  const trade = determineTrade(lineItem.col_b_type, lineItem.col_c_category)

  // Search for candidates - filter by trade and unit FIRST
  const searchTerms = [
    lineItem.col_g_description,
    lineItem.col_b_type,
    ...rawComponents,
  ].filter(Boolean).join(' ')

  const candidates = await searchSponsItems(searchTerms, trade, expectedUnit)

  // Score and filter candidates
  const scoredCandidates: SponsCandidate[] = candidates.map(item => ({
    id: item.id,
    itemCode: item.item_code,
    description: item.description,
    unit: item.unit,
    trade: item.trade,
    rate: item.rate ? Number(item.rate) : null,
    similarityScore: calculateSimilarity(searchTerms, item.description),
    unitMatches: item.unit.toLowerCase() === expectedUnit.toLowerCase(),
    tradeMatches: !trade || item.trade?.toLowerCase() === trade.toLowerCase(),
  }))

  // Filter to only compatible candidates (unit and trade must match)
  const compatibleCandidates = scoredCandidates.filter(
    c => c.unitMatches && c.tradeMatches
  )

  // Sort by similarity
  compatibleCandidates.sort((a, b) => b.similarityScore - a.similarityScore)

  // Store all candidates in database
  for (const candidate of compatibleCandidates) {
    await prisma.spons_matches.upsert({
      where: {
        line_item_id_spons_item_id: {
          line_item_id: lineItemId,
          spons_item_id: candidate.id,
        },
      },
      create: {
        line_item_id: lineItemId,
        spons_item_id: candidate.id,
        similarity_score: candidate.similarityScore,
        unit_matches: candidate.unitMatches,
        trade_matches: candidate.tradeMatches,
      },
      update: {
        similarity_score: candidate.similarityScore,
      },
    })
  }

  // Create audit entry for candidates retrieved
  await prisma.audit_entries.create({
    data: {
      line_item_id: lineItemId,
      action: 'SPONS_CANDIDATES_RETRIEVED',
      spons_candidates_json: compatibleCandidates.map(c => ({
        id: c.id,
        itemCode: c.itemCode,
        similarity: c.similarityScore,
      })),
    },
  })

  // Determine result
  let status: 'MATCHED' | 'UNMATCHED' | 'PENDING_QS_REVIEW'
  let selectedId: string | null = null
  let requiresReview = false

  if (compatibleCandidates.length === 0) {
    // No compatible candidates - mark as UNMATCHED
    status = 'UNMATCHED'
    requiresReview = true
  } else if (compatibleCandidates.length === 1 && autoSelect) {
    // Single candidate with auto-select
    const candidate = compatibleCandidates[0]
    if (candidate.similarityScore >= confidenceThreshold) {
      status = 'MATCHED'
      selectedId = candidate.id
      await selectSponsMatch(lineItemId, candidate.id, 'auto')
    } else {
      status = 'PENDING_QS_REVIEW'
      requiresReview = true
    }
  } else if (autoSelect && compatibleCandidates[0].similarityScore >= confidenceThreshold) {
    // High confidence top match
    const topCandidate = compatibleCandidates[0]
    const secondScore = compatibleCandidates[1]?.similarityScore || 0
    
    // Only auto-select if clear winner (>10% better than second)
    if (topCandidate.similarityScore - secondScore > 0.1) {
      status = 'MATCHED'
      selectedId = topCandidate.id
      await selectSponsMatch(lineItemId, topCandidate.id, 'auto')
    } else {
      status = 'PENDING_QS_REVIEW'
      requiresReview = true
    }
  } else {
    // Multiple candidates or low confidence - needs review
    status = 'PENDING_QS_REVIEW'
    requiresReview = true
  }

  // Update line item status
  await prisma.line_items.update({
    where: { id: lineItemId },
    data: {
      status: status === 'MATCHED' ? 'APPROVED' : 
              status === 'UNMATCHED' ? 'UNMATCHED' : 'PENDING_QS_REVIEW',
    },
  })

  return {
    lineItemId,
    candidates: compatibleCandidates,
    selectedId,
    status,
    requiresReview,
  }
}

// Select a SPONS match (user or auto)
export async function selectSponsMatch(
  lineItemId: string,
  sponsItemId: string,
  selectedBy: string
): Promise<void> {
  // Deselect any existing selection
  await prisma.spons_matches.updateMany({
    where: { line_item_id: lineItemId, is_selected: true },
    data: { is_selected: false },
  })

  // Select the new match
  await prisma.spons_matches.update({
    where: {
      line_item_id_spons_item_id: {
        line_item_id: lineItemId,
        spons_item_id: sponsItemId,
      },
    },
    data: {
      is_selected: true,
      selected_by: selectedBy,
      selected_at: new Date(),
    },
  })

  // Get the SPONS item to update line item cost
  const sponsItem = await prisma.spons_items.findUnique({
    where: { id: sponsItemId },
  })

  if (sponsItem) {
    await prisma.line_items.update({
      where: { id: lineItemId },
      data: {
        col_x_spons_cost_excl_vat: sponsItem.rate,
        status: 'APPROVED',
      },
    })
  }

  // Create audit entry
  await prisma.audit_entries.create({
    data: {
      line_item_id: lineItemId,
      action: 'SPONS_SELECTED',
      final_selection_id: sponsItemId,
      metadata: {
        selectedBy,
        sponsCode: sponsItem?.item_code,
      },
    },
  })
}

// Search SPONS items with filters
async function searchSponsItems(
  query: string,
  trade: string | null,
  unit: string
) {
  const where: Record<string, unknown> = {}
  
  // Filter by trade if specified
  if (trade) {
    where.trade = trade
  }
  
  // Filter by unit
  where.unit = { equals: unit, mode: 'insensitive' }

  // Text search on description
  if (query) {
    where.OR = [
      { description: { contains: query, mode: 'insensitive' } },
      { tags: { hasSome: query.toLowerCase().split(' ') } },
    ]
  }

  return prisma.spons_items.findMany({
    where,
    take: 20,
    select: {
      id: true,
      item_code: true,
      description: true,
      unit: true,
      trade: true,
      rate: true,
    },
  })
}

// Determine trade from type/category
function determineTrade(type: string | null, category: string | null): string | null {
  const tradeMap: Record<string, string> = {
    'Door': 'Doors',
    'AHU': 'HVAC',
    'Chiller': 'HVAC',
    'Boiler': 'HVAC',
    'Pump': 'Mechanical',
    'Fan': 'HVAC',
    'Distribution Board': 'Electrical',
    'Lighting': 'Electrical',
    'Containment': 'Electrical',
    'HVAC': 'HVAC',
    'Electrical': 'Electrical',
    'Mechanical': 'Mechanical',
    'Doors & Ironmongery': 'Doors',
  }

  if (type && tradeMap[type]) return tradeMap[type]
  if (category && tradeMap[category]) return tradeMap[category]
  return null
}

// Simple similarity calculation (Jaccard-like)
function calculateSimilarity(query: string, description: string): number {
  const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const descWords = new Set(description.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  
  let matches = 0
  for (const word of queryWords) {
    if (descWords.has(word)) matches++
  }
  
  const union = new Set([...queryWords, ...descWords]).size
  return union > 0 ? matches / union : 0
}
