import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/deepgram'
import { prisma } from '@/lib/prisma'

// POST /api/deepgram/transcribe - Batch transcription for offline audio
export async function POST(request: NextRequest) {
  try {
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: 'Server missing DEEPGRAM_API_KEY' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const captureId = formData.get('captureId') as string
    const lineItemId = formData.get('lineItemId') as string

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    console.log('Transcribe request', {
      captureId: captureId || undefined,
      lineItemId: lineItemId || undefined,
      audioType: audioFile?.type,
      audioSize: audioFile?.size,
    })

    // Convert to buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Transcribe with Deepgram
    const result = await transcribeAudio(buffer)

    // Update capture with transcript
    if (captureId) {
      const data = {
        transcript: result.transcript,
        transcribed_at: new Date(),
        raw_quantities: extractQuantities(result.transcript),
        raw_components: extractComponents(result.transcript),
      }

      const existing = await prisma.captures.findUnique({ where: { id: captureId } })
      if (existing) {
        await prisma.captures.update({
          where: { id: captureId },
          data,
        })
      } else {
        if (!lineItemId) {
          return NextResponse.json(
            { error: 'captureId not found; lineItemId is required to create capture' },
            { status: 400 }
          )
        }

        await prisma.captures.create({
          data: {
            id: captureId,
            line_item_id: lineItemId,
            ...data,
          },
        })
      }
    }

    // Update line item status to PASS1_COMPLETE
    if (lineItemId) {
      await prisma.line_items.update({
        where: { id: lineItemId },
        data: {
          status: 'PASS1_COMPLETE',
          raw_transcript: result.transcript,
          transcript_timestamp: new Date(),
        },
      })

      // Create audit entry
      await prisma.audit_entries.create({
        data: {
          line_item_id: lineItemId,
          action: 'TRANSCRIBED',
          spoken_sentence: result.transcript,
        },
      })
    }

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
      rawQuantities: extractQuantities(result.transcript),
      rawComponents: extractComponents(result.transcript),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Transcription error:', message)
    return NextResponse.json(
      { error: 'Transcription failed', details: message },
      { status: 500 }
    )
  }
}

// Pass 1: Extract raw quantities (no inference)
function extractQuantities(transcript: string): { value: number; unit: string }[] {
  const quantities: { value: number; unit: string }[] = []
  
  // Match patterns like "2 doors", "three units", "10 metres"
  const patterns = [
    /(\d+)\s*(doors?|units?|metres?|meters?|m|nr|no|each|ea|linear\s*m|lm|sqm|m2|m²)/gi,
    /(one|two|three|four|five|six|seven|eight|nine|ten)\s*(doors?|units?|metres?|meters?)/gi,
  ]

  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  }

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(transcript)) !== null) {
      const value = numberWords[match[1].toLowerCase()] || parseInt(match[1])
      const unit = match[2].toLowerCase()
      quantities.push({ value, unit })
    }
  }

  return quantities
}

// Pass 1: Extract raw components (no inference)
function extractComponents(transcript: string): string[] {
  const components: string[] = []
  
  // Common equipment terms to look for
  const equipmentTerms = [
    'fire door', 'door', 'ahu', 'air handling unit', 'chiller', 'boiler',
    'pump', 'fan', 'motor', 'valve', 'damper', 'duct', 'pipe', 'cable tray',
    'lighting', 'luminaire', 'distribution board', 'panel', 'switch',
    'socket', 'containment', 'trunking', 'conduit', 'busbar',
  ]

  const lowerTranscript = transcript.toLowerCase()
  
  for (const term of equipmentTerms) {
    if (lowerTranscript.includes(term)) {
      components.push(term)
    }
  }

  return components
}
