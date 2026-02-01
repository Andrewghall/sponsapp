import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
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
        status: 'PENDING_PASS2'
      }
    })
    
    // Process Pass 2 with full error handling
    try {
      const result = await processPass2(lineItemId, traceId)
      
      // Update status to completed
      await prisma.line_items.update({
        where: { id: lineItemId },
        data: { 
          status: 'PASS2_COMPLETE'
        }
      })
      
      console.log(`[${traceId}] Pass 2 completed successfully for ${lineItemId}`)
      
      return NextResponse.json({ 
        success: true, 
        traceId,
        result: {
          status: result.status,
          candidatesFound: result.candidates?.length || 0
        }
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[${traceId}] Pass 2 failed for ${lineItemId}:`, errorMessage)
      
      // Store error on line item (using audit_entries for now since schema not updated)
      await prisma.audit_entries.create({
        data: {
          line_item_id: lineItemId,
          action: 'PASS2_ERROR' as any,
          metadata: { error: errorMessage, traceId }
        }
      })
      
      // Update status to error
      await prisma.line_items.update({
        where: { id: lineItemId },
        data: { 
          status: 'PASS2_ERROR'
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
