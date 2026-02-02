import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// PATCH /api/projects/[id]/zones/[zoneId] - Update zone
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> }
) {
  try {
    const { id: projectId, zoneId } = await params
    
    if (!projectId || !zoneId) {
      return NextResponse.json(
        { error: 'Project ID and Zone ID are required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, floor } = body
    
    const zone = await prisma.zones.update({
      where: { 
        id: zoneId,
        project_id: projectId 
      },
      data: {
        ...(name && { name }),
        ...(floor !== undefined && { floor }),
      },
    })

    console.log(`[DEBUG] Zone updated: ${zone.id}`)

    return NextResponse.json({
      zone,
      message: 'Zone updated successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update zone' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/zones/[zoneId] - Delete zone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> }
) {
  try {
    const { id: projectId, zoneId } = await params
    
    if (!projectId || !zoneId) {
      return NextResponse.json(
        { error: 'Project ID and Zone ID are required' },
        { status: 400 }
      )
    }

    // First check if zone exists and belongs to project
    const existingZone = await prisma.zones.findFirst({
      where: { 
        id: zoneId,
        project_id: projectId 
      }
    })

    if (!existingZone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      )
    }

    // Delete the zone
    await prisma.zones.delete({
      where: { id: zoneId }
    })

    console.log(`[DEBUG] Zone deleted: ${zoneId}`)

    return NextResponse.json({
      message: 'Zone deleted successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete zone' },
      { status: 500 }
    )
  }
}
