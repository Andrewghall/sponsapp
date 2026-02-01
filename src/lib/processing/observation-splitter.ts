import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Observation {
  asset_type: string
  location: string
  condition: string
  full_observation: string
}

export async function splitTranscriptIntoObservations(transcript: string): Promise<Observation[]> {
  const prompt = `You are a building surveyor assistant. Split the following transcript into distinct observations about building assets.

For each observation, extract:
1. Asset type (e.g., Door, Fire door, AHU, Boiler, Luminaire, Cable tray)
2. Location (e.g., main entrance, basement corridor, plant, office, ceiling)
3. Condition/issue (e.g., damaged, needs repair, making noise, requires servicing, flickering)

Return ONLY a JSON array of observations with this exact structure:
[
  {
    "asset_type": "Door",
    "location": "main entrance", 
    "condition": "timber frame damaged",
    "full_observation": "Door – main entrance – timber frame damaged"
  }
]

Transcript: "${transcript}"

Observations:`

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

    const parsed = JSON.parse(content)
    
    // Ensure we have an array
    const observations = Array.isArray(parsed) ? parsed : (parsed.observations || [])
    
    // Validate and clean each observation
    return observations.map((obs: any) => ({
      asset_type: obs.asset_type || 'Unknown',
      location: obs.location || 'Unknown',
      condition: obs.condition || 'Unknown',
      full_observation: obs.full_observation || `${obs.asset_type || 'Unknown'} – ${obs.location || 'Unknown'} – ${obs.condition || 'Unknown'}`
    }))
  } catch (error) {
    console.error('Error splitting transcript:', error)
    // Fallback: treat entire transcript as one observation
    return [{
      asset_type: 'Unknown',
      location: 'Unknown',
      condition: transcript,
      full_observation: transcript
    }]
  }
}
