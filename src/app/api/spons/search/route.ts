import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/spons/search - Search SPONS items (retrieval only, no generation)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const trade = searchParams.get('trade')
    const unit = searchParams.get('unit')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build where clause - filter first, then similarity
    const where: Record<string, unknown> = {}
    
    if (trade) {
      where.trade = trade
    }
    
    if (unit) {
      where.unit = unit
    }

    // Search by description (text search)
    if (query) {
      where.OR = [
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query.toLowerCase() } },
        { itemCode: { contains: query, mode: 'insensitive' } },
      ]
    }

    const results = await prisma.sponsItem.findMany({
      where,
      take: limit,
      orderBy: {
        description: 'asc',
      },
    })

    return NextResponse.json({
      results,
      count: results.length,
      meta: {
        query,
        trade,
        unit,
        source: 'spons_database',
        generated: false, // NEVER generate - retrieval only
      },
    })
  } catch (error) {
    console.error('SPONS search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

// POST /api/spons/search - Vector similarity search
export async function POST(request: NextRequest) {
  try {
    const { embedding, trade, unit, limit = 10 } = await request.json()

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { error: 'Embedding vector required' },
        { status: 400 }
      )
    }

    // Use raw SQL for pgvector similarity search
    // Filter by trade and unit FIRST, then rank by similarity
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        "itemCode",
        book,
        section,
        description,
        unit,
        trade,
        rate,
        tags,
        1 - (embedding <=> ${embedding}::vector) as similarity
      FROM "SponsItem"
      WHERE 
        embedding IS NOT NULL
        ${trade ? prisma.$queryRaw`AND trade = ${trade}` : prisma.$queryRaw``}
        ${unit ? prisma.$queryRaw`AND unit = ${unit}` : prisma.$queryRaw``}
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT ${limit}
    `

    return NextResponse.json({
      results,
      count: (results as unknown[]).length,
      meta: {
        method: 'vector_similarity',
        trade,
        unit,
        source: 'spons_database',
        generated: false,
      },
    })
  } catch (error) {
    console.error('SPONS vector search error:', error)
    return NextResponse.json(
      { error: 'Vector search failed' },
      { status: 500 }
    )
  }
}
