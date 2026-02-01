import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// GET /api/health - Simple health check (no database)
export async function GET(request: NextRequest) {
  try {
    // Simple health check - no database calls
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Health check failed'
      },
      { status: 500 }
    )
  }
}
