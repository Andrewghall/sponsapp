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

interface LLMDecision {
  selected_item_code: string | null
  selected_item_label: string | null
  confidence: number
  reasoning: string
}

// Step 2: ACT - Retrieve SPONS candidates
export async function retrieveSponsCandidates(observation: Observation, lineItemId: string, traceId?: string): Promise<SPONSCandidate[]> {
  console.log(`[${traceId}] ACT: Retrieving SPONS candidates for ${observation.asset_type}`)
  
  // Create search text from observation
  const searchText = `${observation.asset_type} ${observation.issue} ${observation.location || ''} ${observation.trade}`.trim()
  
  // Run vector search
  const candidates = await retrieveCandidates(
    lineItemId,
    {
      type: observation.asset_type,
      category: observation.trade,
      description: observation.issue,
      floor: '',
      location: observation.location || '',
      assetCondition: undefined,
      observations: searchText,
    },
    traceId
  )
  
  // Map to expected format
  const mappedCandidates: SPONSCandidate[] = candidates.map(c => ({
    item_code: c.item_code,
    description: c.description || '',
    trade: c.trade || 'General',
    similarity_score: c.similarity_score || 0
  }))
  
  console.log(`[${traceId}] Retrieved ${mappedCandidates.length} SPONS candidates`)
  return mappedCandidates
}

// Step 3: VERIFY - LLM decision step
export async function llmVerifyCandidate(observation: Observation, candidates: SPONSCandidate[], traceId?: string): Promise<LLMDecision> {
  console.log(`[${traceId}] VERIFY: LLM deciding best SPONS match`)
  
  if (candidates.length === 0) {
    return {
      selected_item_code: null,
      selected_item_label: null,
      confidence: 0,
      reasoning: 'No SPONS candidates found for this observation'
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a Quantity Surveyor. Select the best SPONS item for this building inspection observation.

Your job: Decide which SPONS item best represents this inspection observation.

Rules:
- Select ONE best SPONS item
- If uncertain, return low confidence (< 0.75)
- Never invent SPONS codes - only select from provided candidates
- Consider asset type, trade, and work scope compatibility

Return strict JSON:
{
  "selected_item_code": "string or null",
  "selected_item_label": "string or null", 
  "confidence": 0.00-1.00,
  "reasoning": "string"
}`
      },
      {
        role: 'user',
        content: `Observation:
Asset: ${observation.asset_type}
Issue: ${observation.issue}
Location: ${observation.location || 'Not specified'}
Trade: ${observation.trade}

SPONS Candidates:
${candidates.map((c, i) => `${i}. ${c.item_code}: ${c.description} (Trade: ${c.trade})`).join('\n')}

Select the best SPONS item.`
      }
    ],
    temperature: 0.2,
  })
  
  try {
    const decision = JSON.parse(response.choices[0].message.content || '{}') as LLMDecision
    
    // Validate the decision
    if (decision.selected_item_code && !candidates.find(c => c.item_code === decision.selected_item_code)) {
      console.warn(`[${traceId}] LLM selected invalid SPONS code: ${decision.selected_item_code}`)
      return {
        selected_item_code: null,
        selected_item_label: null,
        confidence: 0,
        reasoning: 'Invalid SPONS code selected by LLM'
      }
    }
    
    console.log(`[${traceId}] LLM selected: ${decision.selected_item_code || 'NO MATCH'} (confidence: ${decision.confidence})`)
    return decision
  } catch (error) {
    console.error(`[${traceId}] Error parsing LLM decision:`, error)
    return {
      selected_item_code: null,
      selected_item_label: null,
      confidence: 0,
      reasoning: 'Failed to parse LLM decision'
    }
  }
}

// Step 4: COMMIT - Persist decision to database
export async function commitAgentDecision(lineItemId: string, decision: LLMDecision, traceId?: string): Promise<void> {
  console.log(`[${traceId}] COMMIT: Persisting decision to database`)
  
  // Determine status based on confidence
  const status = decision.confidence >= 0.75 ? 'MATCHED' : 'QS_REVIEW'
  
  // Update the line item
  await prisma.line_items.update({
    where: { id: lineItemId },
    data: {
      spons_candidate_code: decision.selected_item_code,
      spons_candidate_label: decision.selected_item_label,
      pass2_confidence: decision.confidence,
      pass2_status: status,
      spons_candidates: decision.selected_item_code ? [{
        item_code: decision.selected_item_code,
        description: decision.selected_item_label || '',
        score: decision.confidence
      }] : [],
      pass2_error_new: status === 'QS_REVIEW' ? decision.reasoning : null,
    },
  })
  
  console.log(`[${traceId}] Committed: status=${status}, code=${decision.selected_item_code}, confidence=${decision.confidence}`)
}

// Complete agentic loop for one observation
export async function runAgenticLoop(
  observation: Observation,
  lineItemId: string,
  traceId?: string
): Promise<void> {
  console.log(`[${traceId}] Starting agentic loop for: ${observation.asset_type} - ${observation.issue}`)
  
  try {
    // Step 1: PLAN - Observation already exists in structured form
    console.log(`[${traceId}] PLAN: Observation ready - ${observation.asset_type}, ${observation.issue}, ${observation.location}`)
    
    // Step 2: ACT - Retrieve SPONS candidates
    const candidates = await retrieveSponsCandidates(observation, lineItemId, traceId)
    
    // Step 3: VERIFY - LLM decision
    const decision = await llmVerifyCandidate(observation, candidates, traceId)
    
    // Step 4: COMMIT - Persist decision
    await commitAgentDecision(lineItemId, decision, traceId)
    
    console.log(`[${traceId}] Agentic loop completed successfully`)
  } catch (error) {
    console.error(`[${traceId}] Agentic loop failed:`, error)
    
    // Still commit a failure state
    await commitAgentDecision(lineItemId, {
      selected_item_code: null,
      selected_item_label: null,
      confidence: 0,
      reasoning: error instanceof Error ? error.message : 'Unknown error'
    }, traceId)
  }
}

// Helper functions for transcript processing
export async function normalizeTranscript(transcript: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Normalize this building inspection transcript:
- Fix spelling errors
- Expand abbreviations (AHU → Air Handling Unit, kW → kilowatt, etc)
- Remove filler words (um, uh, like, you know)
- Keep technical terms
- Return clean, professional text`
      },
      {
        role: 'user',
        content: transcript
      }
    ],
    temperature: 0.1,
  })
  
  return response.choices[0].message.content || transcript
}

export async function detectMultipleAssets(normalizedText: string): Promise<boolean> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Detect if this inspection observation mentions multiple distinct assets that should be split:
        
        Asset types to look for:
        - fire door, intumescent strip, fire damper
        - AHU, chiller, boiler, fan coil unit
        - lighting, LED luminaire, emergency light
        - cable tray, conduit, trunking
        - distribution board, MCC panel, switchgear
        
        Return ONLY "true" or "false"`
      },
      {
        role: 'user',
        content: normalizedText
      }
    ],
    temperature: 0.1,
  })
  
  return response.choices[0].message.content?.toLowerCase().includes('true') || false
}
