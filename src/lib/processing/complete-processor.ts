import OpenAI from 'openai'
import { retrieveCandidates } from './retrieval'
import { generateEmbedding } from './retrieval'
import { normalizeStructuredFields } from './trade-normalization'
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

interface VerificationResult {
  spons_code: string | null
  spons_description: string | null
  confidence: number
  reasoning: string
  work_classification: 'repair' | 'replace' | 'inspect' | 'install' | 'maintain'
  structured_fields: {
    trade: string
    asset: string
    action: string
    condition: string
  }
}

// Step 1: Create clean observation text for embedding
export function createObservationText(observation: Observation): string {
  const parts = [
    observation.asset_type,
    observation.issue,
    observation.location ? `at ${observation.location}` : '',
    observation.trade !== 'General' ? `(${observation.trade})` : ''
  ].filter(Boolean)
  
  return parts.join(' ')
}

// Step 2: LLM Verification - QS Agent chooses best SPONS item
export async function verifySPONSCandidates(
  observation: Observation,
  candidates: SPONSCandidate[]
): Promise<VerificationResult> {
  if (candidates.length === 0) {
    return {
      spons_code: null,
      spons_description: null,
      confidence: 0,
      reasoning: 'No SPONS candidates found for this observation',
      work_classification: 'inspect',
      structured_fields: {
        trade: observation.trade,
        asset: observation.asset_type,
        action: 'inspect',
        condition: 'defective'
      }
    }
  }

  const observationText = createObservationText(observation)

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a Quantity Surveying expert. Select the best SPONS item for this building inspection observation.

Evaluation criteria:
1. Asset type match (exact > similar > generic)
2. Trade alignment (must match observation trade)
3. Work scope compatibility
4. Technical specifications
5. Description relevance

Classification rules:
- "defective" or "inoperative" → repair or replace
- "damaged" → repair
- "missing" → install
- "expired" → replace
- Uncertain → inspect

Output JSON format:
{
  "selected_index": 0-9,
  "confidence": 0.00-1.00,
  "reasoning": "Detailed explanation of selection",
  "work_classification": "repair|replace|inspect|install|maintain",
  "structured_fields": {
    "trade": "Fire|HVAC|Mechanical|Electrical|General",
    "asset": "specific asset name",
    "action": "repair|replace|inspect|install|maintain",
    "condition": "defective|damaged|missing|inoperative|expired"
  }
}`
      },
      {
        role: 'user',
        content: `Observation: ${observationText}

SPONS Candidates:
${candidates.map((c, i) => `${i}. ${c.item_code}: ${c.description} (Trade: ${c.trade}, Similarity: ${c.similarity_score.toFixed(3)})`).join('\n')}

Select the best SPONS item.`
      }
    ],
    temperature: 0.2,
  })
  
  try {
    const result = JSON.parse(response.choices[0].message.content || '{}')
    const selectedIndex = result.selected_index || 0
    const selectedCandidate = candidates[selectedIndex]
    
    // Normalize structured fields
    const normalizedFields = normalizeStructuredFields(result.structured_fields || {
      trade: observation.trade,
      asset: observation.asset_type,
      action: result.work_classification || 'inspect',
      condition: 'defective'
    })
    
    return {
      spons_code: selectedCandidate.item_code,
      spons_description: selectedCandidate.description,
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Selected based on QS evaluation criteria',
      work_classification: result.work_classification || 'inspect',
      structured_fields: normalizedFields
    }
  } catch (error) {
    console.error('Error verifying SPONS candidates:', error)
    // Fallback to first candidate
    const firstCandidate = candidates[0]
    return {
      spons_code: firstCandidate.item_code,
      spons_description: firstCandidate.description,
      confidence: 0.5,
      reasoning: 'Fallback to first candidate due to verification error',
      work_classification: 'inspect',
      structured_fields: normalizeStructuredFields({
        trade: observation.trade,
        asset: observation.asset_type,
        action: 'inspect',
        condition: 'defective'
      })
    }
  }
}

// Complete processing pipeline for a single observation
export async function processObservationComplete(
  observation: Observation,
  lineItemId: string,
  traceId?: string
): Promise<VerificationResult> {
  console.log(`[${traceId}] Processing observation: ${observation.asset_type} - ${observation.issue}`)
  
  // Step 1: Create clean observation text
  const observationText = createObservationText(observation)
  console.log(`[${traceId}] Observation text: "${observationText}"`)
  
  // Step 2: Embed the observation text
  console.log(`[${traceId}] Generating embedding for observation`)
  const embedding = await generateEmbedding(observationText)
  
  // Step 3: Vector search against SPONS dataset
  console.log(`[${traceId}] Running vector search`)
  const candidates = await retrieveCandidates(
    lineItemId,
    {
      type: observation.asset_type,
      category: observation.trade,
      description: observation.issue,
      floor: '',
      location: observation.location || '',
      assetCondition: undefined,
      observations: observationText,
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
  
  console.log(`[${traceId}] Found ${candidates.length} SPONS candidates`)
  
  // Step 4: LLM verification
  console.log(`[${traceId}] Running LLM verification`)
  const verification = await verifySPONSCandidates(observation, mappedCandidates)
  
  // Step 5: Determine final status
  const confidenceThreshold = 0.75
  const finalStatus = verification.confidence >= confidenceThreshold ? 'MATCHED' : 'QS_REVIEW'
  
  console.log(`[${traceId}] Verification result: ${verification.spons_code || 'NO MATCH'} (confidence: ${verification.confidence}, status: ${finalStatus})`)
  
  // Step 6: Persist to database
  console.log(`[${traceId}] Persisting results to database`)
  await prisma.line_items.update({
    where: { id: lineItemId },
    data: {
      pass2_status: finalStatus,
      pass2_confidence: verification.confidence,
      spons_candidate_code: verification.spons_code,
      spons_candidate_label: verification.spons_description,
      spons_candidates: verification.spons_code ? [{
        item_code: verification.spons_code,
        description: verification.spons_description || '',
        score: verification.confidence
      }] : [],
      pass2_error_new: finalStatus === 'QS_REVIEW' ? verification.reasoning : null,
    },
  })
  
  console.log(`[${traceId}] Successfully persisted and updated status to ${finalStatus}`)
  
  return verification
}
