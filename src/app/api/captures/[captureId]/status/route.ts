import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/captures/[captureId]/status - Get processing status of a capture
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ captureId: string }> }
) {
  try {
    const { captureId } = await context.params

    // Get all line items for this capture (including child items)
    const lineItems = await prisma.line_items.findMany({
      where: {
        OR: [
          { captures: { some: { id: captureId } } },
          { source_capture_id: captureId }
        ]
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    })

    // Get the main capture
    const capture = await prisma.captures.findUnique({
      where: { id: captureId },
      include: {
        line_item: true
      }
    })

    if (!capture) {
      return NextResponse.json(
        { error: 'Capture not found' },
        { status: 404 }
      )
    }

    // Determine overall state
    const states = lineItems.map(item => item.pass2_status || 'PENDING')
    const hasFailed = states.includes('FAILED')
    const hasPlanning = states.includes('PLANNING')
    const hasMatching = states.includes('MATCHING')
    const allComplete = states.every(s => s === 'MATCHED' || s === 'QS_REVIEW')
    
    let state = 'TRANSCRIBED'
    if (hasFailed) state = 'FAILED'
    else if (hasMatching) state = 'MATCHING'
    else if (hasPlanning) state = 'PLANNING'
    else if (allComplete) state = 'COMPLETE'

    return NextResponse.json({
      state,
      captureId,
      captureGroupId: captureId,
      items: lineItems.map(item => ({
        id: item.id,
        status: item.status,
        pass2_status: item.pass2_status,
        pass2_confidence: item.pass2_confidence,
        spons_candidate_code: item.spons_candidate_code,
        spons_candidate_label: item.spons_candidate_label,
        spons_candidates: item.spons_candidates,
        col_b_type: item.col_b_type,
        col_e_object: item.col_e_object,
        col_g_description: item.col_g_description,
        created_at: item.created_at,
        source_capture_id: item.source_capture_id
      }))
    })
  } catch (error) {
    console.error('Failed to get capture status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
