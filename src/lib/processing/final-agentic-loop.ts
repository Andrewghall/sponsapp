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
}

interface AgenticDecision {
  selected_item_code: string | null
  selected_item_label: string | null
  confidence: number
  reasoning: string
  requires_qs_review: boolean
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
- Return clean, professional description

Example:
Input: "a h u zero one making noise um like"
Output: "AHU 01 making noise"`
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

// Step 2: Agentic validation - check if multiple assets merged
export async function validateAndSplitObservation(cleanedText: string, traceId?: string): Promise<string[]> {
  console.log(`[${traceId}] VALIDATE: Checking for merged assets`)
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Analyze this building inspection observation to determine if it contains multiple distinct assets that should be split.

Examples of merged observations:
- "Fire door strip needs replacing and AHU making noise" → 2 separate assets
- "LED lights flickering and emergency light not working" → 2 separate assets
- "Boiler leaking and distribution board damaged" → 2 separate assets

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

// Step 4: Final agentic decision step
export async function makeAgenticDecision(
  cleanedObservation: string,
  candidates: SPONSCandidate[],
  originalObservation: Observation,
  traceId?: string
): Promise<AgenticDecision> {
  console.log(`[${traceId}] DECIDE: Making final agentic decision`)
  
  if (candidates.length === 0) {
    return {
      selected_item_code: null,
      selected_item_label: null,
      confidence: 0,
      reasoning: 'No SPONS candidates found for this observation',
      requires_qs_review: true
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a Quantity Surveying expert making the final decision on SPONS item selection.

Evaluate this cleaned observation against the retrieved SPONS candidates and decide:

1. Which SPONS item best represents this work
2. Confidence in your decision (0.00-1.00)
3. Whether QS review is required
4. Detailed reasoning

Consider:
- Asset type compatibility
- Trade alignment
- Work scope match
- Technical specifications
- Description relevance

Rules:
- Select ONE best SPONS item
- If uncertain, confidence < 0.75 and require QS review
- Never invent SPONS codes
- Provide detailed reasoning

Return JSON:
{
  "selected_item_code": "string or null",
  "selected_item_label": "string or null",
  "confidence": 0.00-1.00,
  "requires_qs_review": true/false,
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
    const decision = JSON.parse(response.choices[0].message.content || '{}') as AgenticDecision
    
    // Validate the decision
    if (decision.selected_item_code && !candidates.find(c => c.item_code === decision.selected_item_code)) {
      console.warn(`[${traceId}] Invalid SPONS code selected: ${decision.selected_item_code}`)
      return {
        selected_item_code: null,
        selected_item_label: null,
        confidence: 0,
        reasoning: 'Invalid SPONS code selected',
        requires_qs_review: true
      }
    }
    
    // Ensure QS review requirement matches confidence
    decision.requires_qs_review = decision.confidence < 0.75
    
    console.log(`[${traceId}] Decision: ${decision.selected_item_code || 'NO MATCH'} (confidence: ${decision.confidence}, QS review: ${decision.requires_qs_review})`)
    return decision
  } catch (error) {
    console.error(`[${traceId}] Error parsing decision:`, error)
    return {
      selected_item_code: null,
      selected_item_label: null,
      confidence: 0,
      reasoning: 'Failed to parse decision',
      requires_qs_review: true
    }
  }
}

// Step 5: Persist the decision
export async function persistAgenticDecision(
  lineItemId: string,
  decision: AgenticDecision,
  candidates: SPONSCandidate[],
  traceId?: string
): Promise<void> {
  console.log(`[${traceId}] PERSIST: Writing decision to database`)
  
  const status = decision.requires_qs_review ? 'QS_REVIEW' : 'MATCHED'
  
  await prisma.line_items.update({
    where: { id: lineItemId },
    data: {
      spons_candidate_code: decision.selected_item_code,
      spons_candidate_label: decision.selected_item_label,
      pass2_confidence: decision.confidence,
      pass2_status: status,
      spons_candidates: candidates.map(c => ({
        item_code: c.item_code,
        description: c.description,
        score: c.similarity_score
      })),
      pass2_error_new: decision.requires_qs_review ? decision.reasoning : null,
    },
  })
  
  console.log(`[${traceId}] Persisted: status=${status}, code=${decision.selected_item_code}, confidence=${decision.confidence}`)
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
        similarity_score: c.similarity_score || 0
      }))
      
      // Step 4: Final agentic decision
      const decision = await makeAgenticDecision(validatedObs, mappedCandidates, observation, traceId)
      
      // Step 5: Persist the decision
      await persistAgenticDecision(lineItemId, decision, mappedCandidates, traceId)
    }
    
    console.log(`[${traceId}] Complete agentic loop finished successfully`)
  } catch (error) {
    console.error(`[${traceId}] Agentic loop failed:`, error)
    
    // Still persist a failure state
    await persistAgenticDecision(lineItemId, {
      selected_item_code: null,
      selected_item_label: null,
      confidence: 0,
      reasoning: error instanceof Error ? error.message : 'Unknown error',
      requires_qs_review: true
    }, [], traceId)
  }
}
