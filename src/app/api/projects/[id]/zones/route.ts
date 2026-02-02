import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

// POST /api/projects/[id]/zones - Create new zone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[DEBUG] Zones POST API called')
  
  try {
    const { id: projectId } = await params
    const body = await request.json()
    console.log('[DEBUG] Zone creation request:', { projectId, body })
    
    if (!projectId) {
      console.log('[DEBUG] Missing project ID')
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const { name, description } = body
    
    if (!name) {
      console.log('[DEBUG] Missing zone name')
      return NextResponse.json(
        { error: 'Zone name is required' },
        { status: 400 }
      )
    }
    
    console.log('[DEBUG] Creating zone with data:', { projectId, name, description })
    
    const zone = await prisma.zones.create({
      data: {
        id: uuidv4(),
        project_id: projectId,
        name,
        floor: description || null,
        created_at: new Date(),
      },
    })

    console.log(`[DEBUG] Zone created: ${zone.id} for project ${projectId}, name="${name}"`)

    return NextResponse.json({
      zone,
      message: 'Zone created successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create zone' },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/zones - List all zones for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const zones = await prisma.zones.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ zones })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch zones' },
      { status: 500 }
    )
  }
}
