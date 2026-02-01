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

interface ObservationResponse {
  observations: Observation[]
}

export async function splitTranscriptIntoObservations(transcript: string): Promise<Observation[]> {
  const prompt = `You are a building inspection expert. Split this transcript into discrete observations.
  
Each observation should contain:
- asset_type: Type of equipment/element
- issue: What's wrong or needed
- location: Where it is (if mentioned)
- trade: Fire|HVAC|Mechanical|Electrical|General
- attributes: size, rating, capacity_kw, phase, count, identifier
- confidence: high|medium|low

Rules:
• Split multiple assets into separate observations
• If unclear, use "low" confidence
• Extract technical details (sizes, ratings)
• If the transcript contains multiple assets in one sentence, still split.
• Output MUST be valid JSON only, no commentary.

Output schema:
{
"observations": [
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
"confidence": "high|medium|low"
}
]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      temperature: 0.1,
    })
    
    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('No content from OpenAI')
    }
    
    // Parse JSON response
    const parsed = JSON.parse(content) as ObservationResponse
    
    // Ensure we have an array
    const observations = parsed.observations || []
    
    // Validate and clean each observation
    return observations.map((obs: Observation) => ({
      asset_type: obs.asset_type || 'Unknown',
      issue: obs.issue || 'Unknown',
      location: obs.location || null,
      trade: obs.trade || 'General',
      attributes: {
        size: obs.attributes?.size || null,
        rating: obs.attributes?.rating || null,
        capacity_kw: obs.attributes?.capacity_kw || null,
        phase: obs.attributes?.phase || null,
        count: obs.attributes?.count || null,
        identifier: obs.attributes?.identifier || null,
      },
      confidence: obs.confidence || 'medium'
    }))
  } catch (error) {
    console.error('Error splitting transcript:', error)
    // Fallback: treat entire transcript as one observation
    return [{
      asset_type: 'Unknown',
      issue: transcript,
      location: null,
      trade: 'General',
      attributes: {
        size: null,
        rating: null,
        capacity_kw: null,
        phase: null,
        count: null,
        identifier: null,
      },
      confidence: 'low'
    }]
  }
}
