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

interface MatchResult {
  spons_code: string | null
  description: string | null
  confidence: number
  reasoning: string
  attempts: number
  final_query: string
}

// Step 1: Normalize transcript
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

// Step 2: Agent decides if multiple assets present
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

// Step 3a: Generate clean search phrase
async function generateSearchQuery(observation: Observation, attempt: number = 1): Promise<string> {
  const previousAttempts = attempt > 1 ? `\nPrevious attempts failed. Be more specific.` : ''
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Generate a precise SPONS search query for this building inspection observation:
        
        Asset type: ${observation.asset_type}
        Issue: ${observation.issue}
        Location: ${observation.location || 'Not specified'}
        Trade: ${observation.trade}
        
        Rules:
        - Use technical terminology
        - Include size/capacity if specified
        - Be specific but not overly detailed
        - 3-6 words maximum${previousAttempts}`
      },
      {
        role: 'user',
        content: `${observation.asset_type} - ${observation.issue} at ${observation.location || 'unknown location'}`
      }
    ],
    temperature: attempt > 1 ? 0.3 : 0.1,
  })
  
  return response.choices[0].message.content || `${observation.asset_type} ${observation.issue}`
}

// Step 3c: Evaluate result quality
async function evaluateMatchQuality(
  observation: Observation,
  candidates: any[],
  query: string
): Promise<{ bestCandidate: any | null, confidence: number, reasoning: string }> {
  if (candidates.length === 0) {
    return {
      bestCandidate: null,
      confidence: 0,
      reasoning: 'No SPONS candidates found for this observation'
    }
  }

  // Use GPT-4 to evaluate and rank candidates
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Evaluate SPONS candidates for this building inspection observation:
        
        Observation:
        - Asset: ${observation.asset_type}
        - Issue: ${observation.issue}
        - Location: ${observation.location || 'Not specified'}
        - Trade: ${observation.trade}
        
        Search query used: "${query}"
        
        Candidates:
        ${candidates.map((c, i) => `${i+1}. ${c.item_code}: ${c.description} (${c.trade})`).join('\n')}
        
        Analyze each candidate for:
        1. Semantic similarity to the observation
        2. Trade/category match
        3. Description overlap
        4. Technical accuracy
        
        Return JSON: {"bestIndex": 0-9, "confidence": 0.00-1.00, "reasoning": "detailed explanation"}`
      },
      {
        role: 'user',
        content: `Which candidate best matches: ${observation.asset_type} - ${observation.issue}?`
      }
    ],
    temperature: 0.2,
  })
  
  try {
    const result = JSON.parse(response.choices[0].message.content || '{}')
    const bestCandidate = candidates[result.bestIndex] || candidates[0]
    
    return {
      bestCandidate,
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Selected best matching candidate'
    }
  } catch {
    // Fallback to first candidate
    return {
      bestCandidate: candidates[0],
      confidence: 0.5,
      reasoning: 'Fallback to first candidate due to evaluation error'
    }
  }
}

// Step 4: Rewrite query for retry
async function rewriteQuery(
  originalQuery: string,
  observation: Observation,
  previousResults: any[]
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Rewrite this SPONS search query to get better results:
        
        Original query: "${originalQuery}"
        Observation: ${observation.asset_type} - ${observation.issue}
        
        Previous results were poor. Rewrite to:
        - Use different keywords
        - Focus on core function
        - Try alternative terminology
        - Keep it concise (3-5 words)`
      },
      {
        role: 'user',
        content: 'Give me a better search query'
      }
    ],
    temperature: 0.4,
  })
  
  return response.choices[0].message.content || originalQuery
}

// Main agentic matching loop
export async function agenticMatcher(
  observation: Observation,
  lineItemId: string,
  traceId?: string
): Promise<MatchResult> {
  let attempts = 0
  const maxAttempts = 3
  let bestResult: { bestCandidate: any | null, confidence: number, reasoning: string } = {
    bestCandidate: null,
    confidence: 0,
    reasoning: 'No match found'
  }
  let query = ''
  
  console.log(`[${traceId}] Starting agentic matching for: ${observation.asset_type} - ${observation.issue}`)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts++
    
    // Generate search query
    query = await generateSearchQuery(observation, attempt)
    console.log(`[${traceId}] Attempt ${attempt}: Query="${query}"`)
    
    // Run SPONS search
    const candidates = await retrieveCandidates(
      lineItemId,
      {
        type: observation.asset_type,
        category: observation.trade,
        description: observation.issue,
        floor: '',
        location: observation.location || '',
        assetCondition: undefined,
        observations: query,
      },
      traceId
    )
    
    console.log(`[${traceId}] Found ${candidates.length} candidates`)
    
    // Evaluate results
    const evaluation = await evaluateMatchQuality(observation, candidates, query)
    
    // Update best result if this is better
    if (evaluation.confidence > bestResult.confidence) {
      bestResult = evaluation
      console.log(`[${traceId}] New best result: confidence=${evaluation.confidence}`)
    }
    
    // Check if we have a good match
    if (evaluation.confidence >= 0.75) {
      console.log(`[${traceId}] High confidence match found, stopping`)
      break
    }
    
    // If not last attempt, prepare for retry
    if (attempt < maxAttempts) {
      console.log(`[${traceId}] Low confidence, retrying...`)
      // The next iteration will generate a new query
    }
  }
  
  // Prepare final result
  const result: MatchResult = {
    spons_code: bestResult.bestCandidate?.item_code || null,
    description: bestResult.bestCandidate?.description || null,
    confidence: bestResult.confidence,
    reasoning: bestResult.reasoning,
    attempts,
    final_query: query
  }
  
  console.log(`[${traceId}] Final result: ${result.spons_code || 'NO MATCH'} (confidence: ${result.confidence})`)
  
  return result
}

// Process multiple observations for a line item
export async function processObservationsAgentic(
  observations: Observation[],
  lineItemId: string,
  traceId?: string
): Promise<MatchResult[]> {
  const results: MatchResult[] = []
  
  for (const observation of observations) {
    try {
      const result = await agenticMatcher(observation, lineItemId, traceId)
      results.push(result)
      
      // Persist result to line item
      await prisma.line_items.update({
        where: { id: lineItemId },
        data: {
          pass2_status: result.confidence >= 0.75 ? 'MATCHED' : 'QS_REVIEW',
          pass2_confidence: result.confidence,
          spons_candidate_code: result.spons_code,
          spons_candidate_label: result.description,
          spons_candidates: result.spons_code ? [{
            item_code: result.spons_code,
            description: result.description || '',
            score: result.confidence
          }] : [],
          pass2_error_new: result.confidence < 0.75 ? result.reasoning : null,
        },
      })
    } catch (error) {
      console.error(`[${traceId}] Error in agentic matcher for ${lineItemId}:`, error)
      
      // Still create a fallback result
      const fallbackResult: MatchResult = {
        spons_code: null,
        description: null,
        confidence: 0,
        reasoning: error instanceof Error ? error.message : 'Matching failed',
        attempts: 0,
        final_query: ''
      }
      results.push(fallbackResult)
      
      // Mark as QS Review but keep visible
      try {
        await prisma.line_items.update({
          where: { id: lineItemId },
          data: {
            pass2_status: 'QS_REVIEW',
            pass2_confidence: 0,
            spons_candidate_code: null,
            spons_candidate_label: null,
            spons_candidates: [],
            pass2_error_new: fallbackResult.reasoning,
          },
        })
      } catch (updateError) {
        console.error(`[${traceId}] Failed to update line item ${lineItemId}:`, updateError)
      }
    }
  }
  
  return results
}
