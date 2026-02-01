import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/captures/[captureId]/status - Get processing status of a capture
export async function GET(
  request: NextRequest,
  { params }: { params: { captureId: string } }
) {
  try {
    const { captureId } = params

    const capture = await prisma.captures.findUnique({
      where: { id: captureId },
      include: {
        line_items: true
      }
    })

    if (!capture) {
      return NextResponse.json({ error: 'Capture not found' }, { status: 404 })
    }

    const lineItems = capture.line_items as any[]
    const lineItem = lineItems?.[0]
    
    return NextResponse.json({
      captureId,
      status: lineItem?.status || 'UNKNOWN',
      transcript: capture.transcript,
      transcribedAt: capture.transcribed_at,
    })
  } catch (error) {
    console.error('Failed to get capture status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
