import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { splitTranscriptIntoObservations } from '@/lib/processing/observation-splitter'
import { processObservationsAgentic } from '@/lib/processing/agentic-matcher'
import { normalizeTranscript, detectMultipleAssets } from '@/lib/processing/agentic-matcher'
import { v4 as uuidv4 } from 'uuid'

interface AssessmentRequest {
  projectId: string
  captureId?: string
  lineItemId?: string
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
  try {
    const body = await request.json() as AssessmentRequest
    const { projectId, captureId, lineItemId, transcript } = body
    
    if (!projectId || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, transcript' },
        { status: 400 }
      )
    }
    
    const traceId = uuidv4()
    console.log(`[${traceId}] Starting agentic assessment for project ${projectId}`)
    
    // Find capture - prioritize captureId, fallback to lineItemId lookup
    let capture = null
    if (captureId) {
      capture = await prisma.captures.findUnique({
        where: { id: captureId },
        include: { line_items: true }
      })
    }
    
    // Fallback: find most recent capture for this line item
    if (!capture && lineItemId) {
      capture = await prisma.captures.findFirst({
        where: { line_item_id: lineItemId },
        orderBy: { created_at: 'desc' },
        include: { line_items: true }
      })
    }
    
    // If still no capture, create a dummy one for tracking
    if (!capture) {
      console.log(`[${traceId}] No capture found, creating dummy for line item ${lineItemId}`)
      // Get the line item to use as reference
      const lineItem = lineItemId ? await prisma.line_items.findUnique({
        where: { id: lineItemId }
      }) : null
      
      if (!lineItem) {
        return NextResponse.json(
          { error: 'Cannot find line item to create dummy capture' },
          { status: 404 }
        )
      }
      
      capture = {
        id: `dummy-${traceId}`,
        line_item_id: lineItemId,
        line_items: [lineItem]
      }
    }
    
    const originalLineItem = Array.isArray(capture.line_items) ? capture.line_items[0] : capture.line_items
    
    if (!originalLineItem) {
      return NextResponse.json(
        { error: 'No line item found for capture' },
        { status: 404 }
      )
    }
    
    // Step 1: Planning - Normalize and split transcript
    console.log(`[${traceId}] Step 1: Planning - Normalizing transcript`)
    
    const normalizedTranscript = await normalizeTranscript(transcript)
    console.log(`[${traceId}] Normalized transcript:`, normalizedTranscript)
    
    // Check if multiple assets present
    const hasMultipleAssets = await detectMultipleAssets(normalizedTranscript)
    console.log(`[${traceId}] Multiple assets detected:`, hasMultipleAssets)
    
    // Split into observations
    const observations = await splitTranscriptIntoObservations(normalizedTranscript)
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
    
    // Step 2: Agentic Matching - Run intelligent matching with retries
    console.log(`[${traceId}] Step 2: Agentic Matching - Processing ${childLineItems.length} observations`)
    
    // Update all to MATCHING status
    await prisma.line_items.updateMany({
      where: { source_capture_id: captureId },
      data: { pass2_status: 'MATCHING' }
    })
    
    // Process each observation with agentic matcher
    for (const lineItem of childLineItems) {
      try {
        console.log(`[${traceId}] Processing observation: ${lineItem.col_b_type} - ${lineItem.col_g_description}`)
        
        // Find the corresponding observation
        const observation = observations.find(
          obs => obs.asset_type === lineItem.col_b_type && 
                 obs.issue === lineItem.col_g_description
        )
        
        if (!observation) {
          console.error(`[${traceId}] No matching observation found for line item ${lineItem.id}`)
          continue
        }
        
        // Run agentic matching with retries
        const results = await processObservationsAgentic([observation], lineItem.id, traceId)
        
        console.log(`[${traceId}] Completed observation: ${results[0]?.spons_code || 'NO MATCH'} (confidence: ${results[0]?.confidence})`)
        
      } catch (error) {
        console.error(`[${traceId}] Error processing observation ${lineItem.id}:`, error)
        
        // Mark as failed
        await prisma.line_items.update({
          where: { id: lineItem.id },
          data: {
            pass2_status: 'FAILED',
            pass2_error_new: error instanceof Error ? error.message : 'Unknown error',
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
