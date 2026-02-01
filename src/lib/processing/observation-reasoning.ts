import OpenAI from 'openai'

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

interface NormalizedObservation {
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
  // QS-grade fields
  qs_asset: string
  qs_action: string
  qs_condition: string
  qs_description: string
}

interface SPONSCandidate {
  item_code: string
  description: string
  trade: string
  similarity_score: number
}

interface ReasonedSelection {
  selected_candidate: SPONSCandidate | null
  confidence: number
  reasoning: string
  structured_fields: {
    trade: string
    asset: string
    action: string
    condition: string
  }
}

// Step 1: Observation Normalization Agent
export async function normalizeObservation(observation: Observation): Promise<NormalizedObservation> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a building inspection expert. Convert raw speech observations into QS-grade fault descriptions.

Your task:
1. Convert colloquial descriptions ("making noise", "leaking", "broken") into professional terminology
2. Identify the specific action needed (repair, replace, inspect, test)
3. Determine the condition state (defective, damaged, missing, inoperative)
4. Create a structured description suitable for quantity surveying

Mapping examples:
- "making noise" → "operating abnormally" → action: "repair" → condition: "defective"
- "leaking" → "fluid discharge" → action: "repair" → condition: "damaged"
- "broken" → "inoperative" → action: "replace" → condition: "defective"
- "missing" → "not installed" → action: "install" → condition: "missing"

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
  "qs_action": "repair|replace|install|inspect|test|maintain",
  "qs_condition": "defective|damaged|missing|inoperative|expired|obstructed",
  "qs_description": "Professional QS description"
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
    const normalized = JSON.parse(response.choices[0].message.content || '{}') as NormalizedObservation
    return {
      ...observation,
      ...normalized
    }
  } catch (error) {
    console.error('Error normalizing observation:', error)
    // Fallback with basic mapping
    return {
      ...observation,
      qs_asset: observation.asset_type,
      qs_action: 'repair',
      qs_condition: 'defective',
      qs_description: `${observation.asset_type} - ${observation.issue}`
    }
  }
}

// Step 2: Candidate Reasoning Agent
export async function reasonCandidateSelection(
  normalizedObservation: NormalizedObservation,
  candidates: SPONSCandidate[]
): Promise<ReasonedSelection> {
  if (candidates.length === 0) {
    return {
      selected_candidate: null,
      confidence: 0,
      reasoning: 'No SPONS candidates available for selection',
      structured_fields: {
        trade: normalizedObservation.trade,
        asset: normalizedObservation.qs_asset,
        action: normalizedObservation.qs_action,
        condition: normalizedObservation.qs_condition
      }
    }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a building inspection and QS expert. Select the best SPONS item from candidates based on multiple factors, not just similarity.

Evaluation criteria:
1. Asset type match (exact > similar > generic)
2. Trade alignment (must match observation trade)
3. Action compatibility (repair/replace/install/test)
4. Condition relevance (defective/damaged/missing)
5. Technical specificity (size, rating, capacity)
6. Description semantic meaning

Analysis process:
1. Filter candidates by trade match first
2. Rank by asset type specificity
3. Evaluate action/condition compatibility
4. Consider technical parameters
5. Select best overall match

Output JSON format:
{
  "selected_index": 0-9,
  "confidence": 0.00-1.00,
  "reasoning": "Detailed explanation of selection logic",
  "structured_fields": {
    "trade": "Fire|HVAC|Mechanical|Electrical|General",
    "asset": "specific asset name",
    "action": "repair|replace|install|inspect|test|maintain",
    "condition": "defective|damaged|missing|inoperative|expired|obstructed"
  }
}`
      },
      {
        role: 'user',
        content: `Observation:
${JSON.stringify(normalizedObservation, null, 2)}

Candidates:
${candidates.map((c, i) => `${i}. ${c.item_code}: ${c.description} (Trade: ${c.trade}, Similarity: ${c.similarity_score})`).join('\n')}

Select the best candidate and explain your reasoning.`
      }
    ],
    temperature: 0.3,
  })
  
  try {
    const result = JSON.parse(response.choices[0].message.content || '{}')
    const selectedIndex = result.selected_index || 0
    
    return {
      selected_candidate: candidates[selectedIndex],
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Selected based on overall match criteria',
      structured_fields: result.structured_fields || {
        trade: normalizedObservation.trade,
        asset: normalizedObservation.qs_asset,
        action: normalizedObservation.qs_action,
        condition: normalizedObservation.qs_condition
      }
    }
  } catch (error) {
    console.error('Error reasoning candidate selection:', error)
    // Fallback to first candidate
    return {
      selected_candidate: candidates[0],
      confidence: 0.5,
      reasoning: 'Fallback to first candidate due to reasoning error',
      structured_fields: {
        trade: normalizedObservation.trade,
        asset: normalizedObservation.qs_asset,
        action: normalizedObservation.qs_action,
        condition: normalizedObservation.qs_condition
      }
    }
  }
}
