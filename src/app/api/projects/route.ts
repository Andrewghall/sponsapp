import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

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

    // Debug logging for project counts
    projects.forEach(project => {
      console.log(`[DEBUG] Project ${project.id}: zones=${project._count?.zones || 0}, items=${project._count?.line_items || 0}`)
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
  const startTime = Date.now()
  
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

    console.log(`[${new Date().toISOString()}] Creating project: ${name}`)
    
    const project = await prisma.projects.create({
      data: {
        name,
        owner_name: ownerName,
        client,
        site_address: siteAddress,
      },
    })

    const duration = Date.now() - startTime
    console.log(`[${new Date().toISOString()}] Project created successfully in ${duration}ms: ${project.id}`)

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[${new Date().toISOString()}] Failed to create project after ${duration}ms:`, error)
    
    // Check for connection pooling errors
    const errorMessage = String(error)
    if (errorMessage.includes('MaxClientsInSessionMode')) {
      return NextResponse.json(
        { 
          error: 'Database connection limit reached. Please try again in a few seconds.',
          details: 'The server is experiencing high traffic. This is a temporary issue.',
          retryAfter: 5
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to create project', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
