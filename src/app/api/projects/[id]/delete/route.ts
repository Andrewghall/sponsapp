import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // First, delete all related data in the correct order
    await prisma.audit_entries.deleteMany({
      where: {
        line_items: {
          project_id: projectId
        }
      }
    })

    await prisma.spons_matches.deleteMany({
      where: {
        line_items: {
          project_id: projectId
        }
      }
    })

    await prisma.line_items.deleteMany({
      where: { project_id: projectId }
    })

    await prisma.zones.deleteMany({
      where: { project_id: projectId }
    })

    // Delete any Supabase storage files for this project
    // This would need to be implemented based on your Supabase setup
    // For now, just delete the project record
    await prisma.projects.delete({
      where: { id: projectId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
