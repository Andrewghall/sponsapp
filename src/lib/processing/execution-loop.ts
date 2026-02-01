import OpenAI from 'openai'
import { retrieveCandidates } from './retrieval'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Observation {
  asset_type: string
  issue: string
  location: string | null
  trade: 'Fire' | 'HVAC' | 'Mechanical' | 'Electrical' | 'General'
  attributes: {
    size: string | null
    rating: string | null
    capacity_kw: number | null
    phase: string | null
    count: number | null
    identifier: string | null
  }
  confidence: 'high' | 'medium' | 'low'
}

interface SPONSCandidate {
  item_code: string
  description: string
  trade: string
  similarity_score: number
  unit?: string
  rate?: number
}

interface AgenticDecision {
  action: 'MATCHED' | 'MULTIPLE_CANDIDATES' | 'QS_REVIEW'
  selected_item_code: string | null
  selected_item_label: string | null
  confidence: number
  reasoning: string
  top_candidates: SPONSCandidate[]
}

// Step 1: Clean and normalize text
export async function cleanAndNormalizeObservation(observation: Observation, traceId?: string): Promise<string> {
  console.log(`[${traceId}] CLEAN: Normalizing observation text`)
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Clean and normalize this building inspection observation:

Rules:
- Fix spelling errors
- Normalize abbreviations: a h u → AHU, kw → kilowatt, led → LED, hvac → HVAC
- Remove filler words: um, uh, like, you know, I think, seems
- Standardize asset language
- Keep technical terms
- Return clean, professional description`
      },
      {
        role: 'user',
        content: `Asset: ${observation.asset_type}
Issue: ${observation.issue}
Location: ${observation.location || 'Not specified'}
Trade: ${observation.trade}`
      }
    ],
    temperature: 0.1,
  })
  
  const cleanedText = response.choices[0].message.content || `${observation.asset_type} ${observation.issue}`
  console.log(`[${traceId}] Cleaned: "${cleanedText}"`)
  return cleanedText
}

// Step 2: Agentic validation - check for merged assets
export async function validateAndSplitObservation(cleanedText: string, traceId?: string): Promise<string[]> {
  console.log(`[${traceId}] VALIDATE: Checking for merged assets`)
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Analyze this building inspection observation to determine if it contains multiple distinct assets that should be split.

If multiple assets are detected, split them into separate observations.
If single asset, return as-is.

Return JSON:
{
  "is_multiple_assets": true/false,
  "observations": ["observation 1", "observation 2", ...]
}`
      },
      {
        role: 'user',
        content: cleanedText
      }
    ],
    temperature: 0.2,
  })
  
  try {
    const result = JSON.parse(response.choices[0].message.content || '{}')
    const observations = result.is_multiple_assets ? result.observations : [cleanedText]
    console.log(`[${traceId}] Split into ${observations.length} observations`)
    return observations
  } catch (error) {
    console.warn(`[${traceId}] Failed to parse validation result, treating as single observation`)
    return [cleanedText]
  }
}

// Step 3: Final agentic decision step
export async function makeAgenticDecision(
  cleanedObservation: string,
  candidates: SPONSCandidate[],
  originalObservation: Observation,
  traceId?: string
): Promise<AgenticDecision> {
  console.log(`[${traceId}] DECIDE: Making final agentic decision`)
  
  const confidenceThreshold = 0.75
  
  if (candidates.length === 0) {
    return {
      action: 'QS_REVIEW',
      selected_item_code: null,
      selected_item_label: null,
      confidence: 0,
      reasoning: 'No SPONS candidates found for this observation',
      top_candidates: []
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a Quantity Surveying expert making the final decision on SPONS item selection.

Evaluate this cleaned observation against the retrieved SPONS candidates and decide:

1. Which action to take: MATCHED | MULTIPLE_CANDIDATES | QS_REVIEW
2. Which SPONS item is the best match (if any)
3. Confidence in your decision (0.00-1.00)
4. Detailed reasoning

Decision Rules:
- MATCHED: Single clear winner, confidence ≥ 0.75
- MULTIPLE_CANDIDATES: Several good options, confidence 0.5-0.74
- QS_REVIEW: No good match, confidence < 0.5

Return JSON:
{
  "action": "MATCHED|MULTIPLE_CANDIDATES|QS_REVIEW",
  "selected_item_code": "string or null",
  "selected_item_label": "string or null",
  "confidence": 0.00-1.00,
  "reasoning": "detailed explanation"
}`
      },
      {
        role: 'user',
        content: `Cleaned Observation: ${cleanedObservation}

Original Context:
- Asset: ${originalObservation.asset_type}
- Issue: ${originalObservation.issue}
- Location: ${originalObservation.location || 'Not specified'}
- Trade: ${originalObservation.trade}

SPONS Candidates:
${candidates.map((c, i) => `${i}. ${c.item_code}: ${c.description} (Trade: ${c.trade}, Similarity: ${c.similarity_score.toFixed(3)})`).join('\n')}

Make your decision.`
      }
    ],
    temperature: 0.2,
  })
  
  try {
    const decision = JSON.parse(response.choices[0].message.content || '{}')
    
    // Validate the decision
    if (decision.selected_item_code && !candidates.find(c => c.item_code === decision.selected_item_code)) {
      console.warn(`[${traceId}] Invalid SPONS code selected: ${decision.selected_item_code}`)
      return {
        action: 'QS_REVIEW',
        selected_item_code: null,
        selected_item_label: null,
        confidence: 0,
        reasoning: 'Invalid SPONS code selected',
        top_candidates: candidates.slice(0, 5)
      }
    }
    
    // Determine top candidates based on action
    let topCandidates: SPONSCandidate[] = []
    if (decision.action === 'MATCHED') {
      topCandidates = candidates.filter(c => c.item_code === decision.selected_item_code).slice(0, 1)
    } else if (decision.action === 'MULTIPLE_CANDIDATES') {
      topCandidates = candidates.slice(0, 5)
    } else {
      topCandidates = candidates.slice(0, 3)
    }
    
    console.log(`[${traceId}] Decision: ${decision.action} - ${decision.selected_item_code || 'NO MATCH'} (confidence: ${decision.confidence})`)
    return {
      action: decision.action,
      selected_item_code: decision.selected_item_code,
      selected_item_label: decision.selected_item_label,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      top_candidates: topCandidates
    }
  } catch (error) {
    console.error(`[${traceId}] Error parsing decision:`, error)
    return {
      action: 'QS_REVIEW',
      selected_item_code: null,
      selected_item_label: null,
      confidence: 0,
      reasoning: 'Failed to parse decision',
      top_candidates: candidates.slice(0, 3)
    }
  }
}

// Step 4: Persist the decision and populate spreadsheet fields
export async function persistAgenticDecision(
  lineItemId: string,
  decision: AgenticDecision,
  traceId?: string
): Promise<void> {
  console.log(`[${traceId}] PERSIST: Writing decision to database`)
  
  // Determine final status
  let finalStatus: string
  if (decision.action === 'MATCHED') {
    finalStatus = 'MATCHED'
  } else if (decision.action === 'MULTIPLE_CANDIDATES') {
    finalStatus = 'MULTIPLE_CANDIDATES'
  } else {
    finalStatus = 'QS_REVIEW'
  }
  
  // Prepare update data
  const updateData: any = {
    pass2_status: finalStatus,
    pass2_confidence: decision.confidence,
    spons_candidate_code: decision.selected_item_code,
    spons_candidate_label: decision.selected_item_label,
    spons_candidates: decision.top_candidates.map(c => ({
      item_code: c.item_code,
      description: c.description,
      score: c.similarity_score
    })),
    pass2_error_new: decision.action === 'QS_REVIEW' ? decision.reasoning : null,
  }
  
  // When confidence ≥ threshold, populate spreadsheet-ready fields
  if (decision.action === 'MATCHED' && decision.selected_item_code && decision.confidence >= 0.75) {
    const selectedCandidate = decision.top_candidates[0]
    updateData.col_e_code = decision.selected_item_code
    updateData.col_f_description = decision.selected_item_label
    updateData.col_d_trade = selectedCandidate.trade
    updateData.col_h_unit = selectedCandidate.unit || 'EA'
    updateData.col_i_rate = selectedCandidate.rate || 0
    updateData.col_j_quantity = 1
    updateData.col_k_amount = selectedCandidate.rate || 0
  }
  
  await prisma.line_items.update({
    where: { id: lineItemId },
    data: updateData,
  })
  
  console.log(`[${traceId}] Persisted: status=${finalStatus}, code=${decision.selected_item_code}, confidence=${decision.confidence}`)
}

// Complete agentic loop for one observation
export async function runCompleteAgenticLoop(
  observation: Observation,
  lineItemId: string,
  traceId?: string
): Promise<void> {
  console.log(`[${traceId}] Starting complete agentic loop for: ${observation.asset_type} - ${observation.issue}`)
  
  try {
    // Step 1: Clean and normalize text
    const cleanedText = await cleanAndNormalizeObservation(observation, traceId)
    
    // Step 2: Agentic validation - check for merged assets
    const validatedObservations = await validateAndSplitObservation(cleanedText, traceId)
    
    // Process each validated observation
    for (const validatedObs of validatedObservations) {
      // Step 3: SPONS retrieval
      const candidates = await retrieveCandidates(
        lineItemId,
        {
          type: observation.asset_type,
          category: observation.trade,
          description: validatedObs,
          floor: '',
          location: observation.location || '',
          assetCondition: undefined,
          observations: validatedObs,
        },
        traceId
      )
      
      const mappedCandidates: SPONSCandidate[] = candidates.map(c => ({
        item_code: c.item_code,
        description: c.description || '',
        trade: c.trade || 'General',
        similarity_score: c.similarity_score || 0,
        unit: c.unit,
        rate: c.rate
      }))
      
      // Step 4: Final agentic decision
      const decision = await makeAgenticDecision(validatedObs, mappedCandidates, observation, traceId)
      
      // Step 5: Persist the decision and populate fields
      await persistAgenticDecision(lineItemId, decision, traceId)
    }
    
    console.log(`[${traceId}] Complete agentic loop finished successfully`)
  } catch (error) {
    console.error(`[${traceId}] Agentic loop failed:`, error)
    
    // Still persist a failure state
    await persistAgenticDecision(lineItemId, {
      action: 'QS_REVIEW',
      selected_item_code: null,
      selected_item_label: null,
      confidence: 0,
      reasoning: error instanceof Error ? error.message : 'Unknown error',
      top_candidates: []
    }, traceId)
  }
}
