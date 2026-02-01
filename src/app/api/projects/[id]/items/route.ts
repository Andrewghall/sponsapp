import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects/[id]/items - Get all line items for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const projectId = id
    
    const items = await prisma.line_items.findMany({
      where: {
        project_id: projectId,
      },
      include: {
        spons_matches: {
          include: {
            spons_items: true,
          },
        },
        captures: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    // Transform the data to match the frontend interface
    const transformedItems = items.map(item => ({
      id: item.id,
      status: item.status,
      transcript: item.raw_transcript,
      description: item.col_f_equipment_configuration || item.col_g_description, // Use observation_text first
      type: item.col_b_type,
      category: item.col_c_category,
      location: item.col_e_object,
      floor: item.col_d_parent,
      sponsCode: item.spons_candidate_code || item.spons_matches?.[0]?.spons_items?.item_code,
      sponsDescription: item.spons_candidate_label || item.spons_matches?.[0]?.spons_items?.description,
      sponsCost: item.spons_matches?.[0]?.spons_items?.rate,
      created_at: item.created_at,
      pass2_status: item.pass2_status,
      pass2_confidence: item.pass2_confidence,
      source_capture_id: item.source_capture_id,
    }))

    return NextResponse.json({
      items: transformedItems,
    })
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}
