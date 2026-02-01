import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Observation {
  asset_type: string
  issue: string
  location: string | null
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
  const prompt = `You are an extraction engine for building-condition survey notes. Your job is to convert a spoken inspection transcript into a clean list of discrete observations. Do not price, do not recommend repairs beyond what is stated, and do not guess. If something is unclear, set the field to null.

Extract discrete inspection observations from the transcript below.

Rules:
•	Split into separate observations. One observation equals one asset or one defect event.
•	If multiple issues refer to the same asset, keep them in one observation only if clearly the same asset.
•	Keep wording short, factual, and survey-style.
•	Do not invent locations, quantities, ratings, or sizes.
•	Normalise units where possible (kW, mm, 600x600).
•	If the transcript contains multiple assets in one sentence, still split.
•	Output MUST be valid JSON only, no commentary.

Output schema:
{
"observations": [
{
"asset_type": "string",
"issue": "string",
"location": "string|null",
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
}

Transcript:
<<<
${transcript}
<<<`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content) as ObservationResponse
    
    // Ensure we have an array
    const observations = parsed.observations || []
    
    // Validate and clean each observation
    return observations.map((obs: Observation) => ({
      asset_type: obs.asset_type || 'Unknown',
      issue: obs.issue || 'Unknown',
      location: obs.location || null,
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
