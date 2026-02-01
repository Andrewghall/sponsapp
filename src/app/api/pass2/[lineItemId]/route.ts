import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

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
    
    // Check for PASS2_ERROR in audit_entries
    const errorEntry = await prisma.audit_entries.findFirst({
      where: {
        line_item_id: lineItemId,
        action: 'PASS2_ERROR' as any
      },
      orderBy: { timestamp: 'desc' }
    })
    
    return NextResponse.json({
      lineItemId,
      status: lineItem.status,
      pass2Error: errorEntry?.metadata ? (errorEntry.metadata as any)?.error : null,
      pass2CompletedAt: errorEntry?.timestamp,
      candidates: lineItem.spons_matches?.map((m: any) => ({
        id: m.id,
        similarityScore: m.similarity_score,
        isSelected: m.is_selected,
        item: m.spons_items
      })) || []
    })
  } catch (error) {
    console.error('Get Pass 2 status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
