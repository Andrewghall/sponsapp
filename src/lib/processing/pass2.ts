/**
 * Pass 2 — Agentic Normalisation & SPONS Matching
 *
 * The second (and heavier) stage of the processing pipeline. Takes the raw
 * entities from Pass 1 and:
 *   1. Resolves synonyms to canonical types/categories (e.g. "ahu" → "AHU").
 *   2. Extracts location and floor from the transcript via regex patterns.
 *   3. Classifies asset condition as LOW / MEDIUM / HIGH.
 *   4. Validates that all mandatory LCY3 fields are present.
 *   5. If valid, runs retrieval-only SPONS candidate lookup (pgvector search).
 *   6. Triggers agentic selection (LLM picks the best candidate).
 *   7. Writes final status + SPONS data back to the line_items row.
 *   8. Creates an audit entry for the full normalisation trace.
 *
 * Final status is one of: PASS2_COMPLETE | UNMATCHED | PENDING_QS_REVIEW | APPROVED.
 */

import { prisma } from '@/lib/prisma'
import { retrieveCandidates } from './retrieval'

export interface Pass2Result {
  lineItemId: string
  status: 'PASS2_COMPLETE' | 'UNMATCHED' | 'PENDING_QS_REVIEW' | 'APPROVED'
  normalised: {
    type?: string
    category?: string
    description?: string
    floor?: string
    location?: string
    assetCondition?: 'LOW' | 'MEDIUM' | 'HIGH'
    observations?: string
  }
  unitConversionLogic?: string
  missingMandatory: string[]
  isValid: boolean
  candidates?: any[]
}

/** LCY3 column references that must be populated for export-ready items. */
const MANDATORY_FIELDS = [
  'colB_type',
  'colC_category',
  'colG_description',
  'colS_floor',
  'colT_location',
  'colY_observations',
]

// Process a line item through Pass 2
export async function processPass2(lineItemId: string, traceId?: string): Promise<Pass2Result> {
  console.log(`[${traceId || 'unknown'}] Pass 2: Processing line item:`, lineItemId)

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

  // CRITICAL: Check if we're processing the right transcript
  console.log(`[${traceId || 'unknown'}] Pass 2: Raw transcript:`, lineItem.raw_transcript)
  console.log(`[${traceId || 'unknown'}] Pass 2: Raw transcript type:`, typeof lineItem.raw_transcript)
  console.log(`[${traceId || 'unknown'}] Pass 2: Is segment ID?`, lineItem.raw_transcript?.includes('segment-') || false)

  const capture = lineItem.captures[0]
  if (!capture) {
    throw new Error('No capture found for line item')
  }

  const rawComponents = (capture.raw_components as string[]) || []
  const rawQuantities = (capture.raw_quantities as { value: number; unit: string }[]) || []
  const transcript = capture.transcript || ''

  // Synonym resolution
  const resolvedType = resolveType(rawComponents)
  const resolvedCategory = resolveCategory(rawComponents)
  
  // Extract location info from transcript
  const locationInfo = extractLocationInfo(transcript)
  
  // Extract condition
  const condition = extractCondition(transcript)

  // Unit conversion logic
  const unitConversionLogic = rawQuantities.length > 0
    ? `Extracted: ${rawQuantities.map(q => `${q.value} ${q.unit}`).join(', ')}`
    : undefined

  // Build normalised data from structured observation fields
  const normalised = {
    type: lineItem.col_b_type || resolveType(rawComponents),
    category: lineItem.col_c_category || resolveCategory(rawComponents),
    description: lineItem.col_g_description || buildDescription(rawComponents, rawQuantities),
    floor: locationInfo.floor,
    location: lineItem.col_e_object || locationInfo.location,
    assetCondition: condition,
    observations: lineItem.col_g_description || transcript,
  }

  // Check mandatory fields
  const missingMandatory: string[] = []
  if (!normalised.type) missingMandatory.push('Type')
  if (!normalised.category) missingMandatory.push('Category')
  if (!normalised.description) missingMandatory.push('Description')
  if (!normalised.floor) missingMandatory.push('Floor')
  if (!normalised.location) missingMandatory.push('Location')

  const isValid = missingMandatory.length === 0

  // If valid, run retrieval-only SPONS candidate lookup
  let candidates: any[] = []
  if (isValid) {
    try {
      console.log(`[${traceId || 'unknown'}] Pass 2: Retrieving candidates for trade=${normalised.type}, unit filters applied`)
      candidates = await retrieveCandidates(lineItemId, normalised, traceId)
      console.log(`[${traceId || 'unknown'}] Pass 2 candidates count = ${candidates.length}`)
      
      // Log top 3 candidates
      if (candidates.length > 0) {
        const top3 = candidates.slice(0, 3)
        console.log(`[${traceId || 'unknown'}] Pass 2: Top 3 candidates:`)
        top3.forEach((candidate, index) => {
          console.log(`  ${index + 1}. item_code=${candidate.item_code}, confidence=${candidate.confidence}`)
        })
      } else {
        console.log(`[${traceId || 'unknown'}] Pass 2: No candidates found`)
      }
    } catch (err) {
      console.error(`[${traceId || 'unknown'}] Retrieval failed after Pass 2:`, err)
      // Continue; status will remain PASS2_COMPLETE or PENDING_PASS2
    }
  } else {
    console.log(`[${traceId || 'unknown'}] Pass 2: Skipping retrieval - missing mandatory fields:`, missingMandatory)
  }

  // If retrieval returned candidates, run agentic selection
  if (candidates.length > 0) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/spons/agent-select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItemId }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        console.error('Agent selection failed:', err)
      }
    } catch (err) {
      console.error('Failed to call agent selection:', err)
    }
  }

  // Determine final status
  let finalStatus: Pass2Result['status'] = 'UNMATCHED'
  if (candidates.length > 0) {
    finalStatus = 'PASS2_COMPLETE'
    console.log(`[${traceId || 'unknown'}] Pass 2: Found ${candidates.length} candidates, status = PASS2_COMPLETE`)
  } else {
    console.log(`[${traceId || 'unknown'}] Pass 2: No candidates found, status = UNMATCHED`)
  }

  // Update line item with final status and SPONS data
  const updateData: any = {
    status: finalStatus,
    col_b_type: normalised.type,
    col_c_category: normalised.category,
    col_g_description: normalised.description,
    col_s_floor: normalised.floor,
    col_t_location: normalised.location,
    col_u_asset_condition: normalised.assetCondition,
    col_y_observations: normalised.observations,
    unit_conversion_logic: unitConversionLogic,
  }

  // Add SPONS fields if candidates found
  if (candidates.length > 0) {
    const topCandidate = candidates[0]
    const top5Candidates = candidates.slice(0, 5)
    
    updateData.pass2_status = finalStatus === 'PASS2_COMPLETE' ? 'MATCHED' : 'QS_REVIEW'
    updateData.pass2_confidence = topCandidate.confidence || 0.5
    updateData.spons_candidate_code = topCandidate.item_code
    updateData.spons_candidate_label = topCandidate.description || topCandidate.item_code
    updateData.spons_candidates = JSON.stringify(top5Candidates)
    updateData.pass2_completed_at = new Date()
    
    console.log(`[${traceId || 'unknown'}] Pass 2: Updating line item with SPONS data:`)
    console.log(`  pass2_status: ${updateData.pass2_status}`)
    console.log(`  pass2_confidence: ${updateData.pass2_confidence}`)
    console.log(`  spons_candidate_code: ${updateData.spons_candidate_code}`)
    console.log(`  spons_candidate_label: ${updateData.spons_candidate_label}`)
    console.log(`  spons_candidates count: ${top5Candidates.length}`)
  }

  await prisma.line_items.update({
    where: { id: lineItemId },
    data: updateData,
  })

  console.log(`[${traceId || 'unknown'}] LineItem updated with SPONS match`)

  // Create audit entry
  await prisma.audit_entries.create({
    data: {
      line_item_id: lineItemId,
      action: 'PASS2_NORMALISED',
      unit_conversion_logic: unitConversionLogic,
      metadata: {
        normalised,
        missingMandatory,
        isValid,
        candidatesCount: candidates.length,
        finalStatus,
      },
    },
  })
  
  return {
    lineItemId,
    status: finalStatus,
    normalised,
    unitConversionLogic,
    missingMandatory,
    isValid,
    candidates,
  }
}

/** Map raw component names to canonical asset types (e.g. "ahu" → "AHU"). */
function resolveType(components: string[]): string | undefined {
  const typeMap: Record<string, string> = {
    'fire door': 'Door',
    'steel door': 'Door',
    'timber door': 'Door',
    'double door': 'Door',
    'door': 'Door',
    'ahu': 'AHU',
    'air handling unit': 'AHU',
    'chiller': 'Chiller',
    'boiler': 'Boiler',
    'pump': 'Pump',
    'fan': 'Fan',
    'distribution board': 'Distribution Board',
    'db': 'Distribution Board',
    'lighting': 'Lighting',
    'luminaire': 'Lighting',
    'light fitting': 'Lighting',
    'cable tray': 'Containment',
    'cable ladder': 'Containment',
    'trunking': 'Containment',
    'conduit': 'Containment',
    'containment': 'Containment',
  }

  for (const component of components) {
    const type = typeMap[component.toLowerCase()]
    if (type) return type
  }
  return undefined
}

/** Map raw component names to trade categories (e.g. "cable tray" → "Electrical"). */
function resolveCategory(components: string[]): string | undefined {
  const categoryMap: Record<string, string> = {
    'fire door': 'Doors & Ironmongery',
    'steel door': 'Doors & Ironmongery',
    'timber door': 'Doors & Ironmongery',
    'door': 'Doors & Ironmongery',
    'ahu': 'HVAC',
    'air handling unit': 'HVAC',
    'chiller': 'HVAC',
    'boiler': 'HVAC',
    'pump': 'Mechanical',
    'fan': 'HVAC',
    'distribution board': 'Electrical',
    'db': 'Electrical',
    'lighting': 'Electrical',
    'luminaire': 'Electrical',
    'cable tray': 'Electrical',
    'containment': 'Electrical',
    'trunking': 'Electrical',
    'conduit': 'Electrical',
  }

  for (const component of components) {
    const category = categoryMap[component.toLowerCase()]
    if (category) return category
  }
  return undefined
}

/**
 * Extract floor and location from the transcript using regex heuristics.
 * Looks for patterns like "floor 2", "ground floor", "in the server room".
 */
function extractLocationInfo(transcript: string): { floor?: string; location?: string } {
  const lower = transcript.toLowerCase()
  
  // Floor patterns
  const floorPatterns = [
    /(?:floor|level)\s*(\d+|ground|basement|mezzanine|roof)/i,
    /(?:on the|at)\s*(ground|first|second|third|fourth|fifth)\s*floor/i,
    /(gf|ff|sf|bf|mf|rf)\b/i,
  ]

  let floor: string | undefined
  for (const pattern of floorPatterns) {
    const match = lower.match(pattern)
    if (match) {
      floor = normalizeFloor(match[1])
      break
    }
  }

  // Location patterns
  const locationPatterns = [
    /(?:in|at|near|by)\s+(?:the\s+)?([a-z\s]+(?:room|area|bay|zone|corridor|hall|entrance|exit|office|warehouse|plant\s*room))/i,
    /(?:loading\s*bay|plant\s*room|switch\s*room|server\s*room|comms\s*room)/i,
  ]

  let location: string | undefined
  for (const pattern of locationPatterns) {
    const match = lower.match(pattern)
    if (match) {
      location = match[1] || match[0]
      location = location.trim().replace(/\s+/g, ' ')
      location = location.charAt(0).toUpperCase() + location.slice(1)
      break
    }
  }

  return { floor, location }
}

/** Convert floor abbreviations and ordinals to human-readable labels. */
function normalizeFloor(floor: string): string {
  const floorMap: Record<string, string> = {
    'ground': 'Ground Floor',
    'gf': 'Ground Floor',
    'basement': 'Basement',
    'bf': 'Basement',
    'mezzanine': 'Mezzanine',
    'mf': 'Mezzanine',
    'roof': 'Roof Level',
    'rf': 'Roof Level',
    'first': 'First Floor',
    'ff': 'First Floor',
    'second': 'Second Floor',
    'sf': 'Second Floor',
    'third': 'Third Floor',
    'fourth': 'Fourth Floor',
    'fifth': 'Fifth Floor',
  }
  
  const normalized = floorMap[floor.toLowerCase()]
  if (normalized) return normalized
  
  // Numeric floor
  const num = parseInt(floor)
  if (!isNaN(num)) {
    return `Floor ${num}`
  }
  
  return floor
}

/**
 * Classify asset condition based on keywords in the transcript.
 * HIGH = damaged/urgent/critical, LOW = good/new, MEDIUM = fair/moderate.
 */
function extractCondition(transcript: string): 'LOW' | 'MEDIUM' | 'HIGH' | undefined {
  const lower = transcript.toLowerCase()
  
  // High risk indicators
  if (lower.includes('poor') || lower.includes('bad') || lower.includes('damaged') ||
      lower.includes('broken') || lower.includes('failed') || lower.includes('urgent') ||
      lower.includes('critical') || lower.includes('high risk')) {
    return 'HIGH'
  }
  
  // Low risk indicators
  if (lower.includes('good') || lower.includes('excellent') || lower.includes('new') ||
      lower.includes('recently') || lower.includes('low risk')) {
    return 'LOW'
  }
  
  // Medium risk indicators
  if (lower.includes('fair') || lower.includes('average') || lower.includes('moderate') ||
      lower.includes('medium risk') || lower.includes('some wear')) {
    return 'MEDIUM'
  }
  
  return undefined
}

/** Compose a short description like "2 x Fire Door" from extracted data. */
function buildDescription(
  components: string[],
  quantities: { value: number; unit: string }[]
): string | undefined {
  if (components.length === 0) return undefined
  
  const mainComponent = components[0]
  const qty = quantities[0]
  
  if (qty) {
    return `${qty.value} x ${mainComponent.charAt(0).toUpperCase() + mainComponent.slice(1)}`
  }
  
  return mainComponent.charAt(0).toUpperCase() + mainComponent.slice(1)
}

export { resolveType, resolveCategory, extractLocationInfo, extractCondition }
