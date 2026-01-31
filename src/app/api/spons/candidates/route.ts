import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/spons/candidates?lineItemId=xxx - Fetch candidates and agent decision for a line item
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lineItemId = searchParams.get('lineItemId')

    if (!lineItemId) {
      return NextResponse.json({ error: 'lineItemId required' }, { status: 400 })
    }

    const lineItem = await prisma.line_items.findUnique({
      where: { id: lineItemId },
      include: {
        captures: { orderBy: { created_at: 'desc' }, take: 1 },
        spons_matches: {
          include: { spons_items: true },
          orderBy: { similarity_score: 'desc' },
        },
        audit_entries: {
          where: { action: { in: ['SPONS_SELECTED', 'QS_REVIEWED'] } },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }

    const capture = lineItem.captures[0]
    const latestAudit = lineItem.audit_entries[0]

    const candidates = lineItem.spons_matches.map(m => ({
      id: m.spons_items.id,
      item_code: m.spons_items.item_code,
      description: m.spons_items.description,
      unit: m.spons_items.unit,
      trade: m.spons_items.trade,
      rate: m.spons_items.rate ? Number(m.spons_items.rate) : undefined,
      similarity_score: Number(m.similarity_score) || 0,
      unit_matches: Boolean(m.unit_matches),
      trade_matches: Boolean(m.trade_matches),
      is_selected: Boolean(m.is_selected),
      selected_by: m.selected_by,
      selected_at: m.selected_at,
    }))

    const agentDecision = latestAudit?.metadata as any
    const normalized = {
      type: lineItem.col_b_type || undefined,
      category: lineItem.col_c_category || undefined,
      description: lineItem.col_g_description || undefined,
      floor: lineItem.col_s_floor || undefined,
      location: lineItem.col_t_location || undefined,
      assetCondition: lineItem.col_u_asset_condition || undefined,
      observations: lineItem.col_y_observations || undefined,
    }

    return NextResponse.json({
      lineItem: {
        id: lineItem.id,
        status: lineItem.status,
        normalized,
        transcript: capture?.transcript || '',
      },
      candidates,
      agentDecision,
      latestAuditAction: latestAudit?.action,
    })
  } catch (error) {
    console.error('Failed to fetch candidates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    )
  }
}

// POST /api/spons/candidates/select - QS selects/overrides a candidate
export async function POST(request: NextRequest) {
  try {
    const { lineItemId, sponsItemId, rationale } = await request.json()

    if (!lineItemId || !sponsItemId) {
      return NextResponse.json({ error: 'lineItemId and sponsItemId required' }, { status: 400 })
    }

    // Clear previous selections
    await prisma.spons_matches.updateMany({
      where: { line_item_id: lineItemId },
      data: { is_selected: false, selected_by: null, selected_at: null },
    })

    // Set new selection
    await prisma.spons_matches.updateMany({
      where: {
        line_item_id: lineItemId,
        spons_item_id: sponsItemId,
      },
      data: {
        is_selected: true,
        selected_by: 'QS',
        selected_at: new Date(),
      },
    })

    // Update line item status
    await prisma.line_items.update({
      where: { id: lineItemId },
      data: { status: 'APPROVED' },
    })

    // Create audit entry
    await prisma.audit_entries.create({
      data: {
        line_item_id: lineItemId,
        action: 'SPONS_SELECTED',
        spoken_sentence: rationale || 'QS manual selection',
        metadata: {
          selectedBy: 'QS',
          sponsItemId,
          rationale,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('QS selection failed:', error)
    return NextResponse.json(
      { error: 'QS selection failed' },
      { status: 500 }
    )
  }
}
