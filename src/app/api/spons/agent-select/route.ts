/**
 * POST /api/spons/agent-select — LLM-powered SPONS candidate selection.
 *
 * After Pass 2 retrieval populates spons_matches, this endpoint asks the LLM
 * agent to review the candidates against the normalised line-item fields and
 * the original transcript.  The agent can:
 *
 *   - **SELECT** a candidate → marks it is_selected, status → APPROVED.
 *   - **FLAG_FOR_REVIEW** → status → PENDING_QS_REVIEW (low confidence).
 *   - **ASK_CLARIFICATION** → status → PENDING_QS_REVIEW with a question
 *     stored in the audit entry metadata.
 *
 * All decisions are persisted as audit_entries for the full audit trail.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
import { runAgentSelection } from '@/lib/processing/agent'

export async function POST(request: NextRequest) {
  try {
    const { lineItemId } = await request.json()

    if (!lineItemId) {
      return NextResponse.json({ error: 'lineItemId required' }, { status: 400 })
    }

    // Fetch line item with normalized fields and retrieved candidates
    const lineItem = await prisma.line_items.findUnique({
      where: { id: lineItemId },
      include: {
        captures: { orderBy: { created_at: 'desc' }, take: 1 },
        spons_matches: {
          include: { spons_items: true },
          where: { is_selected: false },
        },
      },
    })

    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }

    const capture = lineItem.captures[0]
    if (!capture) {
      return NextResponse.json({ error: 'No capture found' }, { status: 404 })
    }

    // Prepare input for agent
    const agentInput = {
      transcript: capture.transcript || '',
      normalized: {
        type: lineItem.col_b_type || undefined,
        category: lineItem.col_c_category || undefined,
        description: lineItem.col_g_description || undefined,
        floor: lineItem.col_s_floor || undefined,
        location: lineItem.col_t_location || undefined,
        assetCondition: lineItem.col_u_asset_condition || undefined,
        observations: lineItem.col_y_observations || undefined,
      },
      candidates: lineItem.spons_matches.map(m => ({
        id: m.spons_items.id,
        item_code: m.spons_items.item_code,
        description: m.spons_items.description,
        unit: m.spons_items.unit,
        trade: m.spons_items.trade || undefined,
        similarity_score: Number(m.similarity_score) || 0,
        unit_matches: Boolean(m.unit_matches),
        trade_matches: Boolean(m.trade_matches),
      })),
    }

    if (agentInput.candidates.length === 0) {
      return NextResponse.json({ error: 'No candidates to select from' }, { status: 400 })
    }

    // Run agentic selection
    const decision = await runAgentSelection(agentInput)

    // Persist decision
    if (decision.action === 'SELECT' && decision.selectedCandidateId) {
      await prisma.spons_matches.updateMany({
        where: {
          line_item_id: lineItemId,
          spons_item_id: decision.selectedCandidateId,
        },
        data: {
          is_selected: true,
          selected_by: 'AGENT',
          selected_at: new Date(),
        },
      })

      await prisma.line_items.update({
        where: { id: lineItemId },
        data: { status: 'APPROVED' },
      })

      await prisma.audit_entries.create({
        data: {
          line_item_id: lineItemId,
          action: 'SPONS_SELECTED',
          spoken_sentence: agentInput.transcript,
          metadata: {
            agentDecision: JSON.parse(JSON.stringify(decision)),
            selectedCandidateId: decision.selectedCandidateId,
          },
        },
      })
    } else if (decision.action === 'FLAG_FOR_REVIEW') {
      await prisma.line_items.update({
        where: { id: lineItemId },
        data: { status: 'PENDING_QS_REVIEW' },
      })

      await prisma.audit_entries.create({
        data: {
          line_item_id: lineItemId,
          action: 'QS_REVIEWED',
          spoken_sentence: agentInput.transcript,
          metadata: { agentDecision: JSON.parse(JSON.stringify(decision)) },
        },
      })
    } else if (decision.action === 'ASK_CLARIFICATION') {
      await prisma.line_items.update({
        where: { id: lineItemId },
        data: { status: 'PENDING_QS_REVIEW' },
      })

      await prisma.audit_entries.create({
        data: {
          line_item_id: lineItemId,
          action: 'QS_REVIEWED',
          spoken_sentence: agentInput.transcript,
          metadata: { agentDecision: JSON.parse(JSON.stringify(decision)) },
        },
      })
    }

    return NextResponse.json({
      success: true,
      decision,
      lineItemId,
    })
  } catch (error) {
    console.error('Agent selection error:', error)
    return NextResponse.json(
      { error: 'Agent selection failed' },
      { status: 500 }
    )
  }
}
