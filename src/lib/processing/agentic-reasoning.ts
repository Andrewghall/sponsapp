import OpenAI from 'openai'
import { normalizeStructuredFields } from './trade-normalization'

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

interface RefinedObservation {
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
  // Refined QS-grade fields
  qs_asset: string
  qs_action: string
  qs_condition: string
  qs_description: string
  refined_sentence: string
}

interface SPONSCandidate {
  item_code: string
  description: string
  trade: string
  similarity_score: number
}

interface AgenticMatchResult {
  selected_candidate: SPONSCandidate | null
  confidence: number
  reasoning: string
  work_classification: 'repair' | 'replace' | 'inspect' | 'install' | 'maintain'
  structured_fields: {
    trade: 'Fire' | 'HVAC' | 'Mechanical' | 'Electrical' | 'General'
    asset: string
    action: string
    condition: string
  }
  verification_passed: boolean
}

// Step 1: Observation Refinement Pass
export async function refineObservation(observation: Observation): Promise<RefinedObservation> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a building inspection expert. Refine raw observations into clean QS inspection language.

Your task:
1. Rewrite into professional QS terminology
2. Normalize abbreviations and acronyms:
   - "a h u" → "AHU"
   - "f d" → "fire damper"
   - "m d b" → "main distribution board"
   - "led" → "LED luminaire"
   - "h v a c" → "HVAC"
3. Remove conversational noise ("um", "I think", "seems like")
4. Extract technical details (sizes, ratings, identifiers)
5. Produce a single clear defect sentence
6. Classify the required action (repair/replace/inspect/install/maintain)
7. Determine the condition state (defective/damaged/missing/inoperative)

Output JSON format:
{
  "asset_type": "string",
  "issue": "string",
  "location": "string|null",
  "trade": "Fire|HVAC|Mechanical|Electrical|General",
  "attributes": {
    "size": "string|null",
    "rating": "string|null",
    "capacity_kw": "number|null",
    "phase": "string|null",
    "count": "number|null",
    "identifier": "string|null"
  },
  "confidence": "high|medium|low",
  "qs_asset": "professional asset name",
  "qs_action": "repair|replace|inspect|install|maintain",
  "qs_condition": "defective|damaged|missing|inoperative|expired",
  "qs_description": "Professional QS description",
  "refined_sentence": "Single clear defect sentence"
}`
      },
      {
        role: 'user',
        content: JSON.stringify(observation)
      }
    ],
    temperature: 0.2,
  })
  
  try {
    const refined = JSON.parse(response.choices[0].message.content || '{}') as RefinedObservation
    return refined
  } catch (error) {
    console.error('Error refining observation:', error)
    // Fallback with basic refinement
    const refinedSentence = `${observation.asset_type} at ${observation.location || 'unknown location'} requires ${observation.issue} to be addressed`
    
    return {
      ...observation,
      qs_asset: observation.asset_type,
      qs_action: 'repair',
      qs_condition: 'defective',
      qs_description: `${observation.asset_type} - ${observation.issue}`,
      refined_sentence: refinedSentence
    }
  }
}

// Step 2: Agentic SPONS Matching Pass
export async function agenticSPONSMatch(
  refinedObservation: RefinedObservation,
  candidates: SPONSCandidate[]
): Promise<AgenticMatchResult> {
  if (candidates.length === 0) {
    return {
      selected_candidate: null,
      confidence: 0,
      reasoning: 'No SPONS candidates available for matching',
      work_classification: 'inspect',
      structured_fields: normalizeStructuredFields({
        trade: refinedObservation.trade,
        asset: refinedObservation.qs_asset,
        action: refinedObservation.qs_action,
        condition: refinedObservation.qs_condition
      }),
      verification_passed: false
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a building inspection and QS expert. Select the best SPONS item using agentic reasoning.

Analysis process:
1. Evaluate asset type compatibility (exact > similar > generic)
2. Verify trade alignment (must match observation trade)
3. Assess work classification compatibility:
   - Defective conditions → repair/replace
   - Missing items → install
   - Maintenance needs → maintain
   - Uncertain state → inspect
4. Consider technical specifications (size, rating, capacity)
5. Evaluate description semantic meaning
6. Select best overall match with confidence

Classification rules:
- "defective" or "inoperative" → repair or replace
- "damaged" → repair
- "missing" → install
- "expired" → replace
- "obstructed" → maintain or repair
- Uncertain → inspect

Output JSON format:
{
  "selected_index": 0-9,
  "confidence": 0.00-1.00,
  "reasoning": "Detailed explanation of selection logic",
  "work_classification": "repair|replace|inspect|install|maintain",
  "structured_fields": {
    "trade": "Fire|HVAC|Mechanical|Electrical|General",
    "asset": "specific asset name",
    "action": "repair|replace|inspect|install|maintain",
    "condition": "defective|damaged|missing|inoperative|expired|obstructed"
  },
  "verification_passed": true/false
}`
      },
      {
        role: 'user',
        content: `Refined Observation:
${JSON.stringify(refinedObservation, null, 2)}

SPONS Candidates:
${candidates.map((c, i) => `${i}. ${c.item_code}: ${c.description} (Trade: ${c.trade}, Similarity: ${c.similarity_score})`).join('\n')}

Select the best candidate and explain your reasoning.`
      }
    ],
    temperature: 0.3,
  })
  
  try {
    const result = JSON.parse(response.choices[0].message.content || '{}')
    const selectedIndex = result.selected_index || 0
    
    // Normalize structured fields
    const normalizedFields = normalizeStructuredFields(result.structured_fields || {
      trade: refinedObservation.trade,
      asset: refinedObservation.qs_asset,
      action: result.work_classification || refinedObservation.qs_action,
      condition: refinedObservation.qs_condition
    })
    
    return {
      selected_candidate: candidates[selectedIndex],
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Selected based on agentic reasoning',
      work_classification: result.work_classification || 'inspect',
      structured_fields: normalizedFields,
      verification_passed: result.confidence >= 0.75
    }
  } catch (error) {
    console.error('Error in agentic SPONS matching:', error)
    // Fallback to first candidate
    return {
      selected_candidate: candidates[0],
      confidence: 0.5,
      reasoning: 'Fallback to first candidate due to reasoning error',
      work_classification: refinedObservation.qs_action as 'repair' | 'replace' | 'inspect' | 'install' | 'maintain',
      structured_fields: normalizeStructuredFields({
        trade: refinedObservation.trade,
        asset: refinedObservation.qs_asset,
        action: refinedObservation.qs_action,
        condition: refinedObservation.qs_condition
      }),
      verification_passed: false
    }
  }
}

// Verification step - final quality check
export async function verifyMatch(
  refinedObservation: RefinedObservation,
  matchResult: AgenticMatchResult
): Promise<{ verified: boolean, confidence: number, reasoning: string }> {
  if (!matchResult.selected_candidate) {
    return {
      verified: false,
      confidence: 0,
      reasoning: 'No candidate selected for verification'
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a building inspection quality assurance expert. Verify the SPONS match quality.

Verification criteria:
1. Asset type relevance (0-25 points)
2. Trade alignment (0-25 points)
3. Work classification appropriateness (0-25 points)
4. Technical specification match (0-25 points)

Score >= 75 points = verified
Score 50-74 = acceptable but needs review
Score < 50 = poor match

Output JSON format:
{
  "verified": true/false,
  "confidence": 0.00-1.00,
  "reasoning": "Detailed verification explanation"
}`
      },
      {
        role: 'user',
        content: `Observation: ${refinedObservation.refined_sentence}
Selected SPONS: ${matchResult.selected_candidate.item_code} - ${matchResult.selected_candidate.description}
Classification: ${matchResult.work_classification}

Verify this match quality.`
      }
    ],
    temperature: 0.1,
  })
  
  try {
    const result = JSON.parse(response.choices[0].message.content || '{}')
    return {
      verified: result.verified || false,
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Verification completed'
    }
  } catch (error) {
    console.error('Error verifying match:', error)
    return {
      verified: false,
      confidence: 0,
      reasoning: 'Verification failed due to error'
    }
  }
}
