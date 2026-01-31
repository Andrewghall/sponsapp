import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// POST /api/sync - Sync offline captures to server
export async function POST(request: NextRequest) {
  try {
    const { captures } = await request.json()

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const capture of captures) {
      try {
        // Check idempotency - skip if already processed
        const existing = await prisma.captures.findUnique({
          where: { idempotency_key: capture.idempotencyKey },
        })

        if (existing) {
          results.synced++
          continue
        }

        // Create line item for this capture
        const lineItem = await prisma.line_items.create({
          data: {
            project_id: capture.projectId,
            zone_id: capture.zoneId,
            status: 'PENDING_PASS1',
            raw_transcript: capture.transcript,
            transcript_timestamp: new Date(capture.timestamp),
          },
        })

        // Upload audio to Supabase Storage
        let audioUrl = null
        if (capture.audioBase64) {
          const supabase = await createClient()
          const audioBuffer = Buffer.from(capture.audioBase64, 'base64')
          const fileName = `${capture.id}.webm`
          
          const { data, error } = await supabase.storage
            .from('audio-captures')
            .upload(fileName, audioBuffer, {
              contentType: 'audio/webm',
              upsert: true,
            })

          if (!error && data) {
            const { data: urlData } = supabase.storage
              .from('audio-captures')
              .getPublicUrl(fileName)
            audioUrl = urlData.publicUrl
          }
        }

        // Create capture record
        await prisma.captures.create({
          data: {
            id: capture.id,
            line_item_id: lineItem.id,
            idempotency_key: capture.idempotencyKey,
            audio_url: audioUrl,
            audio_duration: capture.audioDuration,
            transcript: capture.transcript,
            is_offline: true,
            synced_at: new Date(),
          },
        })

        // Create audit entry
        await prisma.audit_entries.create({
          data: {
            line_item_id: lineItem.id,
            action: 'CREATED',
            spoken_sentence: capture.transcript,
            metadata: {
              source: 'offline_sync',
              originalTimestamp: capture.timestamp,
            },
          },
        })

        results.synced++
      } catch (error) {
        results.failed++
        results.errors.push(`Capture ${capture.id}: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      serverTimestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
}

// GET /api/sync - Get pending items for processing
export async function GET() {
  try {
    const pendingItems = await prisma.line_items.findMany({
      where: {
        status: {
          in: ['PENDING_PASS1', 'PASS1_COMPLETE', 'PENDING_PASS2'],
        },
      },
      include: {
        captures: true,
      },
      orderBy: {
        created_at: 'asc',
      },
      take: 50,
    })

    return NextResponse.json({
      items: pendingItems,
      count: pendingItems.length,
    })
  } catch (error) {
    console.error('Get pending error:', error)
    return NextResponse.json(
      { error: 'Failed to get pending items' },
      { status: 500 }
    )
  }
}
