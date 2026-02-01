import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

// POST /api/projects/[id]/zones - Create a new zone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔥 Zone API route called')
  
  try {
    const { id: projectId } = await params
    
    if (!projectId) {
      console.log('🔥 Zone API: Missing project ID')
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('🔥 Zone API: Request body:', body)
    
    const { name, description } = body

    if (!name) {
      console.log('🔥 Zone API: Missing zone name')
      return NextResponse.json(
        { error: 'Zone name is required' },
        { status: 400 }
      )
    }

    console.log('🔥 Zone API: Creating zone in database...')
    
    const zone = await prisma.zones.create({
      data: {
        id: uuidv4(),
        project_id: projectId,
        name,
        floor: description || null, // Use description as floor since that's the only text field available
        created_at: new Date(),
      },
    })

    console.log('🔥 Zone API: Zone created successfully:', zone)

    return NextResponse.json({
      zone,
      message: 'Zone created successfully'
    })

  } catch (error) {
    console.error('🔥 Zone API: Error creating zone:', error)
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
  console.log('🔥 Zone API: Listing zones')
  
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

    console.log('🔥 Zone API: Found zones:', zones.length)

    return NextResponse.json({ zones })

  } catch (error) {
    console.error('🔥 Zone API: Error fetching zones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch zones' },
      { status: 500 }
    )
  }
}
