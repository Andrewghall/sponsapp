/**
 * SyncManager — Orchestrates offline-to-online synchronisation.
 *
 * Monitors network connectivity and, when online, processes pending captures
 * through the full pipeline:
 *   1. Upload audio blob to the server.
 *   2. Transcribe via Deepgram.
 *   3. Split transcript into observations and create line items.
 *   4. Run agentic SPONS matching.
 *
 * Uses a simple mutex (`isProcessing`) to prevent concurrent sync runs.
 * Connection is polled every 30 seconds and also reacts to the browser's
 * `online` event for immediate sync when connectivity returns.
 *
 * A global singleton is exposed via `getSyncManager()`.
 */

import { OfflineCapture, SyncStatus, updateCaptureSyncStatus, getOfflineCapture } from '@/lib/offline-db'

export class SyncManager {
  /** Simple mutex — prevents overlapping sync runs. */
  private isProcessing = false
  private connectionMonitorInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startConnectionMonitoring()
  }

  // Monitor connection status and process pending captures when online
  private startConnectionMonitoring() {
    const checkConnection = () => {
      if (navigator.onLine && !this.isProcessing) {
        this.processPendingCaptures()
      }
    }

    // Check connection every 30 seconds
    this.connectionMonitorInterval = setInterval(checkConnection, 30000)
    
    // Also check when browser comes online
    window.addEventListener('online', checkConnection)
  }

  // Process all pending captures
  async processPendingCaptures(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    try {
      // Get all pending and failed captures
      const pendingCaptures = await this.getCapturesByStatus(['PENDING', 'FAILED'])
      
      for (const capture of pendingCaptures) {
        await this.processCapture(capture)
      }
    } catch (error) {
      console.error('Error processing pending captures:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // Process a single capture through the full pipeline
  private async processCapture(capture: OfflineCapture): Promise<void> {
    try {
      console.log(`Processing capture: ${capture.id}`)
      
      // Step 1: Upload audio
      await this.updateStatus(capture.id, 'UPLOADING')
      const audioUrl = await this.uploadAudio(capture)
      
      // Step 2: Transcribe
      await this.updateStatus(capture.id, 'TRANSCRIBING')
      const transcript = await this.transcribeAudio(capture.id, audioUrl)
      
      // Step 3: Split observations and create line items
      await this.updateStatus(capture.id, 'SPLITTING')
      const lineItems = await this.splitAndCreateLineItems(capture, transcript)
      
      // Step 4: Run agentic assessment
      await this.updateStatus(capture.id, 'MATCHING')
      await this.runAgenticAssessment(lineItems)
      
      // Step 5: Complete
      await this.updateStatus(capture.id, 'COMPLETE')
      
      console.log(`Capture ${capture.id} processed successfully`)
      
    } catch (error) {
      console.error(`Failed to process capture ${capture.id}:`, error)
      await this.updateStatus(capture.id, 'FAILED', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  // Update capture sync status
  private async updateStatus(captureId: string, status: SyncStatus, error?: string): Promise<void> {
    await updateCaptureSyncStatus(captureId, status, error)
  }

  // Upload audio file to server
  private async uploadAudio(capture: OfflineCapture): Promise<string> {
    const formData = new FormData()
    formData.append('audio', capture.audioBlob, capture.audioLocalUri)
    formData.append('captureId', capture.id)

    const response = await fetch('/api/upload-audio', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Audio upload failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.audioUrl
  }

  // Transcribe audio using existing API
  private async transcribeAudio(captureId: string, audioUrl: string): Promise<string> {
    const response = await fetch('/api/deepgram/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        captureId,
        audioUrl
      })
    })

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.transcript
  }

  // Split transcript and create line items using existing API
  private async splitAndCreateLineItems(capture: OfflineCapture, transcript: string): Promise<string[]> {
    const response = await fetch('/api/agentic-assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId: capture.projectId,
        captureId: capture.id,
        transcript,
        context: capture.context
      })
    })

    if (!response.ok) {
      throw new Error(`Observation splitting failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.lineItemIds || []
  }

  // Run agentic assessment for line items
  private async runAgenticAssessment(lineItemIds: string[]): Promise<void> {
    // The agentic assessment is already triggered by the splitAndCreateLineItems step
    // This is just a placeholder for any additional processing needed
    console.log(`Running agentic assessment for ${lineItemIds.length} line items`)
  }

  // Get captures by status (helper function)
  private async getCapturesByStatus(statuses: SyncStatus[]): Promise<OfflineCapture[]> {
    // This would need to be implemented in offline-db.ts
    // For now, return empty array
    return []
  }

  // Cleanup
  destroy() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval)
    }
  }
}

// Global sync manager instance
let globalSyncManager: SyncManager | null = null

export function getSyncManager(): SyncManager {
  if (!globalSyncManager) {
    globalSyncManager = new SyncManager()
  }
  return globalSyncManager
}
