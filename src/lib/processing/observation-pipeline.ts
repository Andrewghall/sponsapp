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

interface ProcessedObservation extends Observation {
  observation_text: string
  quantity: number
}

// Step 1: Clean grammar and spelling
export async function cleanTranscript(transcript: string, traceId?: string): Promise<string> {
  console.log(`[${traceId}] CLEAN: Fixing grammar and spelling`)
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Clean this building inspection transcript:

Rules:
- Fix spelling errors
- Fix grammar
- Expand abbreviations: a h u → AHU, kw → kilowatt, led → LED, hvac → HVAC
- Remove filler words: um, uh, like, you know, I think, seems
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
  
  const cleanedText = response.choices[0].message.content || transcript
  console.log(`[${traceId}] Cleaned transcript`)
  return cleanedText
}

// Step 2: Create observation_text for each observation
export function createObservationTexts(observations: Observation[], traceId?: string): ProcessedObservation[] {
  console.log(`[${traceId}] Creating observation texts for ${observations.length} observations`)
  
  const processedObservations: ProcessedObservation[] = observations.map(obs => {
    // Create clean observation text
    const parts = [
      obs.asset_type,
      obs.issue,
      obs.location ? `at ${obs.location}` : '',
      obs.trade !== 'General' ? `(${obs.trade})` : ''
    ].filter(Boolean)
    
    const observationText = parts.join(' ')
    
    // Default quantity
    let quantity = 1
    
    // Try to extract quantity from attributes or text
    if (obs.attributes.count) {
      quantity = obs.attributes.count
    } else if (obs.attributes.identifier && /\d+/.test(obs.attributes.identifier)) {
      const match = obs.attributes.identifier.match(/\d+/)
      if (match) quantity = parseInt(match[0])
    } else {
      // Try to infer from text
      const text = `${obs.asset_type} ${obs.issue}`.toLowerCase()
      if (text.includes('three') || text.includes('3')) quantity = 3
      else if (text.includes('two') || text.includes('2')) quantity = 2
      else if (text.includes('four') || text.includes('4')) quantity = 4
      else if (text.includes('five') || text.includes('5')) quantity = 5
      else if (text.includes('six') || text.includes('6')) quantity = 6
      else if (text.includes('seven') || text.includes('7')) quantity = 7
      else if (text.includes('eight') || text.includes('8')) quantity = 8
      else if (text.includes('nine') || text.includes('9')) quantity = 9
      else if (text.includes('ten') || text.includes('10')) quantity = 10
    }
    
    return {
      ...obs,
      observation_text: observationText,
      quantity: quantity
    }
  })
  
  console.log(`[${traceId}] Created observation texts`)
  return processedObservations
}

// Step 3: Deduplicate observations
export function deduplicateObservations(observations: ProcessedObservation[], traceId?: string): ProcessedObservation[] {
  console.log(`[${traceId}] DEDUPLICATE: Removing duplicate observations`)
  
  const deduplicated: ProcessedObservation[] = []
  const seen = new Set<string>()
  
  for (const obs of observations) {
    // Create deduplication key
    const key = `${obs.asset_type}|${obs.issue}|${obs.location || ''}|${obs.trade}`
    
    if (seen.has(key)) {
      // Find existing observation and merge quantities
      const existing = deduplicated.find(o => 
        `${o.asset_type}|${o.issue}|${o.location || ''}|${o.trade}` === key
      )
      if (existing) {
        existing.quantity += obs.quantity
        console.log(`[${traceId}] Merged duplicate: ${obs.asset_type} - quantity now ${existing.quantity}`)
      }
    } else {
      seen.add(key)
      deduplicated.push({...obs})
    }
  }
  
  console.log(`[${traceId}] Deduplicated from ${observations.length} to ${deduplicated.length} observations`)
  return deduplicated
}

// Step 4: Infer quantity from plural indicators
export function inferQuantities(observations: ProcessedObservation[], traceId?: string): ProcessedObservation[] {
  console.log(`[${traceId}] INFERRING: Checking for plural indicators`)
  
  return observations.map(obs => {
    // Skip if quantity already > 1
    if (obs.quantity > 1) return obs
    
    const text = obs.observation_text.toLowerCase()
    
    // Check for plural indicators
    if (text.includes('doors') || text.includes('door')) {
      if (text.includes('three') || text.includes('3')) obs.quantity = 3
      else if (text.includes('two') || text.includes('2')) obs.quantity = 2
      else if (text.includes('four') || text.includes('4')) obs.quantity = 4
      else if (text.includes('five') || text.includes('5')) obs.quantity = 5
      else if (text.includes('six') || text.includes('6')) obs.quantity = 6
      else if (text.includes('seven') || text.includes('7')) obs.quantity = 7
      else if (text.includes('eight') || text.includes('8')) obs.quantity = 8
      else if (text.includes('nine') || text.includes('9')) obs.quantity = 9
      else if (text.includes('ten') || text.includes('10')) obs.quantity = 10
      else if (text.includes('multiple') || text.includes('several') || text.includes('various')) {
        obs.quantity = 2 // Default for unspecified multiples
      }
    }
    
    if (text.includes('lights') || text.includes('luminaires') || text.includes('fittings')) {
      if (text.includes('three') || text.includes('3')) obs.quantity = 3
      else if (text.includes('two') || text.includes('2')) obs.quantity = 2
      else if (text.includes('four') || text.includes('4')) obs.quantity = 4
      else if (text.includes('five') || text.includes('5')) obs.quantity = 5
      else if (text.includes('six') || text.includes('6')) obs.quantity = 6
      else if (text.includes('multiple') || text.includes('several')) obs.quantity = 2
    }
    
    if (text.includes('dampers') || text.includes('valves') || text.includes('pumps')) {
      if (text.includes('three') || text.includes('3')) obs.quantity = 3
      else if (text.includes('two') || text.includes('2')) obs.quantity = 2
      else if (text.includes('four') || text.includes('4')) obs.quantity = 4
      else if (text.includes('multiple') || text.includes('several')) obs.quantity = 2
    }
    
    if (obs.quantity > 1) {
      console.log(`[${traceId}] Inferred quantity ${obs.quantity} for: ${obs.asset_type}`)
    }
    
    return obs
  })
}

// Complete processing pipeline
export async function processObservationsPipeline(
  transcript: string,
  observations: Observation[],
  traceId?: string
): Promise<ProcessedObservation[]> {
  console.log(`[${traceId}] Starting complete observations pipeline`)
  
  // Step 1: Clean transcript (for consistency)
  const cleanedTranscript = await cleanTranscript(transcript, traceId)
  
  // Step 2: Create observation texts
  let processed = createObservationTexts(observations, traceId)
  
  // Step 3: Deduplicate
  processed = deduplicateObservations(processed, traceId)
  
  // Step 4: Infer quantities
  processed = inferQuantities(processed, traceId)
  
  console.log(`[${traceId}] Pipeline complete: ${processed.length} final observations`)
  return processed
}
