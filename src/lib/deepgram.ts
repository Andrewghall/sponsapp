import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'

export interface TranscriptionResult {
  transcript: string
  confidence: number
  words: Array<{
    word: string
    start: number
    end: number
    confidence: number
  }>
  isFinal: boolean
}

// Server-side Deepgram client
export function getDeepgramClient() {
  return createClient(process.env.DEEPGRAM_API_KEY!)
}

// Batch transcription for offline audio files
export async function transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
  const deepgram = getDeepgramClient()
  
  const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
    model: 'nova-2',
    language: 'en-GB',
    smart_format: true,
    punctuate: true,
  })

  const transcript = result?.results?.channels?.[0]?.alternatives?.[0]
  
  return {
    transcript: transcript?.transcript || '',
    confidence: transcript?.confidence || 0,
    words: transcript?.words || [],
    isFinal: true,
  }
}

export { LiveTranscriptionEvents }
