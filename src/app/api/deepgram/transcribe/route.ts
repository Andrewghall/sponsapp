import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Deepgram } from '@deepgram/sdk'
import { prisma } from '@/lib/prisma'
import { splitTranscriptIntoObservations } from '@/lib/processing/observation-splitter'
import { processPass2 } from '@/lib/processing/pass2'
import { transcribeAudio } from '@/lib/deepgram'

export const runtime = 'nodejs'

// POST /api/deepgram/transcribe - Batch transcription for offline audio
export async function POST(request: NextRequest) {
  console.log('Transcription endpoint called')
  
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

    // Transcribe with Deepgram
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const result = await transcribeAudio(audioBuffer)
    console.log('Transcription result:', result)
      
    if (!result || !result.transcript) {
      throw new Error('Transcription failed: No transcript returned')
    }

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

    // Split transcript into observations
    console.log('Splitting transcript into observations:', result.transcript)
    const observations = await splitTranscriptIntoObservations(result.transcript)
    console.log('Split into observations:', observations)

    // Create or update line items for each observation
    if (lineItemId && observations.length > 0) {
      // Get the original line item to copy project and zone info
      const originalLineItem = await prisma.line_items.findUnique({ 
        where: { id: lineItemId } 
      })
      
      if (!originalLineItem) {
        throw new Error('Original line item not found')
      }

      // If this is the first observation, update the original line item
      const firstObservation = observations[0]
      await prisma.line_items.update({
        where: { id: lineItemId },
        data: {
          status: 'PASS1_COMPLETE',
          raw_transcript: result.transcript,
          transcript_timestamp: new Date(),
          col_b_type: firstObservation.asset_type,
          col_e_object: firstObservation.location || undefined,
          col_g_description: firstObservation.issue,
        },
      })

      // Create additional line items for remaining observations
      for (let i = 1; i < observations.length; i++) {
        const obs = observations[i]
        
        // Create dedupe key to prevent duplicates
        const normalizedText = `${obs.asset_type?.toLowerCase().trim() || ''}-${obs.issue?.toLowerCase().trim() || ''}-${obs.location?.toLowerCase().trim() || ''}`
        const dedupeKey = `${captureId}-${normalizedText}`
        
        // Check if this observation already exists
        const existingLineItem = await prisma.line_items.findFirst({
          where: {
            project_id: originalLineItem.project_id,
            zone_id: originalLineItem.zone_id,
            col_b_type: obs.asset_type,
            col_g_description: obs.issue,
            col_e_object: obs.location || undefined,
          }
        })
        
        if (existingLineItem) {
          console.log(`Skipping duplicate observation: ${dedupeKey}`)
          continue
        }
        
        const newLineItem = await prisma.line_items.create({
          data: {
            project_id: originalLineItem.project_id,
            zone_id: originalLineItem.zone_id,
            status: 'PASS1_COMPLETE',
            raw_transcript: result.transcript,
            transcript_timestamp: new Date(),
            col_b_type: obs.asset_type,
            col_e_object: obs.location || undefined,
            col_g_description: obs.issue,
          },
        })

        // Create audit entry for new line item
        await prisma.audit_entries.create({
          data: {
            line_item_id: newLineItem.id,
            action: 'TRANSCRIBED',
            spoken_sentence: `${obs.asset_type} - ${obs.issue}`,
          },
        })

        // Trigger Pass 2 for new line item
        console.log('Triggering async Pass 2 for new line item:', newLineItem.id)
        try {
          const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://sponsapp-prelive.vercel.app'
          fetch(`${base}/api/pass2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineItemId: newLineItem.id }),
          }).catch(err => console.error('Failed to trigger Pass 2:', err))
        } catch (error) {
          console.error('Error triggering Pass 2:', error)
        }
      }

      // Create audit entry for first line item
      await prisma.audit_entries.create({
        data: {
          line_item_id: lineItemId,
          action: 'TRANSCRIBED',
          spoken_sentence: `${firstObservation.asset_type} - ${firstObservation.issue}`,
        },
      })

      // Trigger Agentic Assessment
      console.log('Triggering agentic assessment for capture:', captureId)
      try {
        const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://sponsapp-prelive.vercel.app'
        fetch(`${base}/api/agentic-assessment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId: originalLineItem.project_id,
            captureId,
            lineItemId: lineItemId,
            transcript: result.transcript 
          }),
        }).catch(err => console.error('Failed to trigger agentic assessment:', err))
      } catch (error) {
        console.error('Error triggering agentic assessment:', error)
      }
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
