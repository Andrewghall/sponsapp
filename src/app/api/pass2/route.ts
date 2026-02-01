import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processPass2 } from '@/lib/processing/pass2'
import { v4 as uuidv4 } from 'uuid'

// POST /api/pass2 - Async Pass 2 processing (non-blocking)
export async function POST(request: NextRequest) {
  const traceId = uuidv4()
  console.log(`[${traceId}] Pass 2 API called`)
  
  try {
    const { lineItemId } = await request.json()
    
    if (!lineItemId) {
      console.log(`[${traceId}] Missing lineItemId`)
      return NextResponse.json({ 
        success: false, 
        error: 'Missing lineItemId',
        traceId 
      }, { status: 400 })
    }
    
    console.log(`[${traceId}] Processing line item: ${lineItemId}`)
    
    // Update status to processing
    await prisma.line_items.update({
      where: { id: lineItemId },
      data: { 
        status: 'PENDING_PASS2',
        pass2_error: null,
        pass2_completed_at: null
      }
    })
    
    // Process Pass 2 with full error handling
    try {
      const result = await processPass2(lineItemId, traceId)
      
      // Update status to completed
      await prisma.line_items.update({
        where: { id: lineItemId },
        data: { 
          status: result.status,
          pass2_completed_at: new Date(),
          pass2_error: null
        }
      })
      
      console.log(`[${traceId}] Pass 2 completed successfully for ${lineItemId}`)
      
      return NextResponse.json({ 
        success: true, 
        traceId,
        result: {
          status: result.status,
          candidatesFound: result.candidates?.length || 0,
          agentDecision: result.agentDecision ? 'completed' : 'skipped'
        }
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[${traceId}] Pass 2 failed for ${lineItemId}:`, errorMessage)
      
      // Store error on line item
      await prisma.line_items.update({
        where: { id: lineItemId },
        data: { 
          status: 'PASS2_ERROR',
          pass2_error: errorMessage,
          pass2_completed_at: new Date()
        }
      })
      
      // Always return success (endpoint never throws)
      return NextResponse.json({ 
        success: true, // API succeeded, even if Pass 2 failed
        traceId,
        result: {
          status: 'PASS2_ERROR',
          error: errorMessage,
          candidatesFound: 0
        }
      })
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[${traceId}] Pass 2 API error:`, errorMessage)
    
    // Always return a valid response
    return NextResponse.json({ 
      success: false, // API itself failed
      error: errorMessage,
      traceId
    }, { status: 500 })
  }
}

// GET /api/pass2/[lineItemId] - Get Pass 2 status
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lineItemId: string }> }
) {
  try {
    const { lineItemId } = await context.params
    
    const lineItem = await prisma.line_items.findUnique({
      where: { id: lineItemId },
      select: {
        id: true,
        status: true,
        pass2_error: true,
        pass2_completed_at: true,
        spons_matches: {
          select: {
            id: true,
            similarity_score: true,
            is_selected: true,
            spons_items: {
              select: {
                item_code: true,
                description: true,
                unit: true,
                trade: true
              }
            }
          }
        }
      }
    })
    
    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      lineItemId,
      status: lineItem.status,
      pass2Error: lineItem.pass2_error,
      pass2CompletedAt: lineItem.pass2_completed_at,
      candidates: lineItem.spons_matches.map(m => ({
        id: m.id,
        similarityScore: m.similarity_score,
        isSelected: m.is_selected,
        item: m.spons_items
      }))
    })
  } catch (error) {
    console.error('Get Pass 2 status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
