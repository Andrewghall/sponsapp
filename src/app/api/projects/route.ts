import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = await prisma.projects.findMany({
      orderBy: { updated_at: 'desc' },
      include: {
        _count: {
          select: { line_items: true, zones: true },
        },
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const { name, ownerName, client, siteAddress } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    if (!ownerName) {
      return NextResponse.json(
        { error: 'Owner name is required' },
        { status: 400 }
      )
    }

    const project = await prisma.projects.create({
      data: {
        name,
        owner_name: ownerName,
        client,
        site_address: siteAddress,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project', details: String(error) },
      { status: 500 }
    )
  }
}
