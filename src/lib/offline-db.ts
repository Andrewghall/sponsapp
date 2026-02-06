/**
 * Offline Database — IndexedDB abstraction for offline-first capture storage.
 *
 * All voice captures are first saved locally in IndexedDB so the app works
 * without network connectivity. Two object stores are used:
 *
 *   - **captures** — Audio blobs + metadata, indexed by project, sync status,
 *     and timestamp. Each capture progresses through the sync lifecycle:
 *     PENDING → UPLOADING → TRANSCRIBING → SPLITTING → MATCHING → COMPLETE.
 *
 *   - **pendingSync** — Generic sync queue for any data that needs to be
 *     pushed to the server when connectivity resumes.
 *
 * Completed captures older than 7 days are automatically cleaned up by
 * `cleanupOldCaptures()` to prevent IndexedDB from growing unbounded.
 */

import { openDB, IDBPDatabase } from 'idb'

interface CaptureContext {
  zone: string
  level: string
  room: string
}

interface OfflineCapture {
  id: string
  idempotencyKey: string
  projectId: string
  context: CaptureContext
  audioBlob: Blob
  audioLocalUri: string
  audioMimeType: string
  audioSize: number
  audioDuration: number
  timestamp: Date
  syncStatus: 'PENDING' | 'UPLOADING' | 'TRANSCRIBING' | 'SPLITTING' | 'MATCHING' | 'COMPLETE' | 'FAILED'
  retryCount: number
  lastError?: string
  transcript?: string  // Full transcript (parent)
  lineItemIds?: string[]  // Child line items
}

interface PendingSyncItem {
  id: string
  type: 'capture' | 'lineItem'
  data: unknown
  createdAt: Date
  retryCount: number
}

const DB_NAME = 'sponsapp-offline'
const DB_VERSION = 1

let dbInstance: IDBPDatabase | null = null

export async function getOfflineDb() {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Captures store for offline audio
      if (!db.objectStoreNames.contains('captures')) {
        const captureStore = db.createObjectStore('captures', { keyPath: 'id' })
        captureStore.createIndex('by-project', 'projectId')
        captureStore.createIndex('by-syncStatus', 'syncStatus')
        captureStore.createIndex('by-timestamp', 'timestamp')
      }

      // Pending sync queue
      if (!db.objectStoreNames.contains('pendingSync')) {
        db.createObjectStore('pendingSync', { keyPath: 'id' })
      }
    },
  })

  return dbInstance
}

// Save audio capture offline
export async function saveOfflineCapture(capture: OfflineCapture) {
  const db = await getOfflineDb()
  await db.put('captures', capture)
}

// Get all unsynced captures
export async function getUnsyncedCaptures(): Promise<OfflineCapture[]> {
  const db = await getOfflineDb()
  const tx = db.transaction('captures', 'readonly')
  const store = tx.store
  const allCaptures = await store.getAll() as OfflineCapture[]
  return allCaptures.filter(capture => capture.syncStatus === 'PENDING' || capture.syncStatus === 'FAILED')
}

// Update capture sync status
export async function updateCaptureSyncStatus(
  captureId: string, 
  status: OfflineCapture['syncStatus'], 
  error?: string
): Promise<void> {
  const db = await getOfflineDb()
  const capture = await db.get('captures', captureId) as OfflineCapture | undefined
  if (capture) {
    capture.syncStatus = status
    if (error) {
      capture.lastError = error
      capture.retryCount += 1
    }
    await db.put('captures', capture)
  }
}

// Get capture by ID
export async function getOfflineCapture(id: string): Promise<OfflineCapture | undefined> {
  const db = await getOfflineDb()
  return db.get('captures', id) as Promise<OfflineCapture | undefined>
}

// Delete synced captures older than 7 days
export async function cleanupOldCaptures() {
  const db = await getOfflineDb()
  const allCaptures = await db.getAll('captures') as OfflineCapture[]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  for (const capture of allCaptures) {
    if (capture.syncStatus === 'COMPLETE' && new Date(capture.timestamp) < sevenDaysAgo) {
      await db.delete('captures', capture.id)
    }
  }
}

// Add to sync queue
export async function addToSyncQueue(type: 'capture' | 'lineItem', data: unknown) {
  const db = await getOfflineDb()
  const item: PendingSyncItem = {
    id: crypto.randomUUID(),
    type,
    data,
    createdAt: new Date(),
    retryCount: 0,
  }
  await db.put('pendingSync', item)
}

// Get pending sync items
export async function getPendingSyncItems(): Promise<PendingSyncItem[]> {
  const db = await getOfflineDb()
  return db.getAll('pendingSync') as Promise<PendingSyncItem[]>
}

// Remove from sync queue
export async function removeFromSyncQueue(id: string) {
  const db = await getOfflineDb()
  await db.delete('pendingSync', id)
}

// Export types for use in components
export type { OfflineCapture, CaptureContext }
export type SyncStatus = OfflineCapture['syncStatus']

// Helper function to create a new capture
export async function createOfflineCapture(
  projectId: string,
  context: CaptureContext,
  audioBlob: Blob,
  audioDuration: number
): Promise<OfflineCapture> {
  const capture: OfflineCapture = {
    id: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    projectId,
    context,
    audioBlob,
    audioLocalUri: `capture_${Date.now()}.webm`,
    audioMimeType: audioBlob.type,
    audioSize: audioBlob.size,
    audioDuration,
    timestamp: new Date(),
    syncStatus: 'PENDING',
    retryCount: 0,
  }
  
  await saveOfflineCapture(capture)
  return capture
}

// Get captures by project
export async function getCapturesByProject(projectId: string): Promise<OfflineCapture[]> {
  const db = await getOfflineDb()
  const tx = db.transaction('captures', 'readonly')
  const index = tx.store.index('by-project')
  return index.getAll(projectId) as Promise<OfflineCapture[]>
}

// Get captures by sync status
export async function getCapturesByStatus(status: OfflineCapture['syncStatus']): Promise<OfflineCapture[]> {
  const db = await getOfflineDb()
  const tx = db.transaction('captures', 'readonly')
  const index = tx.store.index('by-syncStatus')
  return index.getAll(status) as Promise<OfflineCapture[]>
}
