import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { splitTranscriptIntoObservations } from '@/lib/processing/observation-splitter'
import { retrieveCandidates } from '@/lib/processing/retrieval'
import { v4 as uuidv4 } from 'uuid'

// Import generateEmbedding from retrieval
async function generateEmbedding(text: string): Promise<number[]> {
  const OpenAI = require('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  
  return response.data[0].embedding
}

interface AssessmentRequest {
  projectId: string
  captureId: string
  transcript: string
}

interface Observation {
  asset_type: string
  issue: string
  location: string | null
  trade: 'Fire' | 'HVAC' | 'Mechanical' | 'Electrical' | 'General'
  attributes: {
    size: string | null
    capacity_kw: number | null
    phase: string | null
    identifier: string | null
  }
}

export async function POST(request: NextRequest) {
  const traceId = uuidv4()
  console.log(`[${traceId}] AgenticAssessment: Starting assessment`)
  
  try {
    const { projectId, captureId, transcript }: AssessmentRequest = await request.json()
    
    if (!projectId || !captureId || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, captureId, transcript' },
        { status: 400 }
      )
    }
    
    // Get the original line item to copy project/zone info
    const originalLineItem = await prisma.line_items.findFirst({
      where: { 
        project_id: projectId,
        captures: {
          some: { id: captureId }
        }
      }
    })
    
    if (!originalLineItem) {
      return NextResponse.json(
        { error: 'Original line item not found for capture' },
        { status: 404 }
      )
    }
    
    // Step 1: Planning - Split transcript into observations
    console.log(`[${traceId}] Step 1: Planning - Splitting transcript into observations`)
    
    const observations = await splitTranscriptIntoObservations(transcript)
    console.log(`[${traceId}] Split into ${observations.length} observations`)
    
    // Create child line items for each observation
    const childLineItems = []
    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i]
      
      // Check if already exists (idempotent)
      const existing = await prisma.line_items.findFirst({
        where: {
          project_id: projectId,
          col_b_type: obs.asset_type,
          col_e_object: obs.location,
          col_g_description: obs.issue,
          raw_transcript: transcript
        }
      })
      
      if (!existing) {
        const childItem = await prisma.line_items.create({
          data: {
            project_id: originalLineItem.project_id,
            zone_id: originalLineItem.zone_id,
            status: 'PASS1_COMPLETE',
            source_capture_id: captureId,
            pass2_status: 'PLANNING',
            col_b_type: obs.asset_type,
            col_e_object: obs.location,
            col_g_description: obs.issue,
            col_c_category: obs.trade,
            raw_transcript: transcript,
            transcript_timestamp: new Date(),
          },
        })
        childLineItems.push(childItem)
      } else {
        childLineItems.push(existing)
      }
    }
    
    // Step 2: Matching - Run SPONS matching for each observation
    console.log(`[${traceId}] Step 2: Matching - Running SPONS matching for ${childLineItems.length} observations`)
    
    // Update all to MATCHING status
    await prisma.line_items.updateMany({
      where: { source_capture_id: captureId },
      data: { pass2_status: 'MATCHING' }
    })
    
    // Process each observation
    for (const lineItem of childLineItems) {
      try {
        console.log(`[${traceId}] Processing observation: ${lineItem.col_b_type} - ${lineItem.col_g_description}`)
        
        // Build observation text for embedding
        const observationText = `${lineItem.col_b_type}. ${lineItem.col_g_description}. Location: ${lineItem.col_e_object || 'Unknown'}.`
        
        // Generate embedding
        const embedding = await generateEmbedding(observationText)
        
        // Retrieve SPONS candidates
        const candidates = await retrieveCandidates(
          lineItem.id,
          {
            type: lineItem.col_b_type || '',
            category: lineItem.col_c_category || '',
            description: lineItem.col_g_description || '',
            floor: '',
            location: lineItem.col_e_object || '',
            assetCondition: undefined,
            observations: observationText,
          },
          traceId
        )
        
        // Calculate confidence (simple heuristic based on similarity score)
        const confidence = candidates.length > 0 ? Math.min(0.99, candidates[0].similarity_score * 100 || 0.5) : 0
        
        // Map candidates to plain JSON for Prisma
        const candidatesJson = candidates.slice(0, 5).map(c => ({
          item_code: String(c.item_code),
          description: String(c.description ?? ""),
          score: Number(c.similarity_score ?? 0)
        }))
        
        // Determine status
        const status = confidence >= 0.75 ? 'MATCHED' : 'QS_REVIEW'
        
        // Update line item with results
        await prisma.line_items.update({
          where: { id: lineItem.id },
          data: {
            pass2_status: status,
            pass2_confidence: confidence,
            spons_candidate_code: candidates.length > 0 ? candidates[0].item_code : null,
            spons_candidate_label: candidates.length > 0 ? candidates[0].description : null,
            spons_candidates: candidatesJson,
          },
        })
        
        console.log(`[${traceId}] Completed observation: ${status} (confidence: ${confidence})`)
        
      } catch (error) {
        console.error(`[${traceId}] Error processing observation ${lineItem.id}:`, error)
        
        // Mark as failed
        await prisma.line_items.update({
          where: { id: lineItem.id },
          data: {
            pass2_status: 'FAILED',
            pass2_error_new: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }
    
    console.log(`[${traceId}] AgenticAssessment: Complete`)
    
    return NextResponse.json({
      success: true,
      started: true,
      captureGroupId: captureId,
      estimatedObservations: observations.length,
      traceId
    })
    
  } catch (error) {
    console.error(`[${traceId}] AgenticAssessment error:`, error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error),
        traceId 
      },
      { status: 500 }
    )
  }
}
