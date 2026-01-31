import { openDB, IDBPDatabase } from 'idb'

interface OfflineCapture {
  id: string
  idempotencyKey: string
  audioBlob: Blob
  audioDuration: number
  timestamp: Date
  projectId: string
  zoneId?: string
  synced: boolean
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
        captureStore.createIndex('by-synced', 'synced')
        captureStore.createIndex('by-project', 'projectId')
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
  const index = tx.store.index('by-synced')
  return index.getAll(IDBKeyRange.only(false)) as Promise<OfflineCapture[]>
}

// Mark capture as synced
export async function markCaptureSynced(id: string) {
  const db = await getOfflineDb()
  const capture = await db.get('captures', id) as OfflineCapture | undefined
  if (capture) {
    capture.synced = true
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
    if (capture.synced && new Date(capture.timestamp) < sevenDaysAgo) {
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
