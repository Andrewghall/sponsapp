/**
 * Global Zustand store for SPONSApp.
 *
 * Holds ephemeral UI state (connection status, recording state, live transcript,
 * pending-sync counter) alongside navigational context (active project & zone).
 *
 * Only `currentProjectId` and `currentZoneId` are persisted to localStorage
 * (via the `persist` middleware) so users return to the same project after a
 * page refresh. Everything else resets on load.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Whether the device can currently reach the backend. */
export type ConnectionStatus = 'online' | 'offline' | 'syncing'

/** Microphone / processing lifecycle for the capture screen. */
export type RecordingStatus = 'idle' | 'recording' | 'processing'

interface AppState {
  // --- Network ---
  connectionStatus: ConnectionStatus
  setConnectionStatus: (status: ConnectionStatus) => void

  // --- Navigation context ---
  currentProjectId: string | null
  currentZoneId: string | null
  setCurrentProject: (id: string | null) => void
  setCurrentZone: (id: string | null) => void

  // --- Recording lifecycle ---
  recordingStatus: RecordingStatus
  setRecordingStatus: (status: RecordingStatus) => void

  // --- Live transcript (interim results from Deepgram streaming) ---
  liveTranscript: string
  setLiveTranscript: (transcript: string) => void

  // --- Offline sync queue ---
  pendingCount: number
  setPendingCount: (count: number) => void
  incrementPending: () => void
  decrementPending: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      connectionStatus: 'online',
      setConnectionStatus: (status) => set({ connectionStatus: status }),

      currentProjectId: null,
      currentZoneId: null,
      // Switching projects resets the zone selection.
      setCurrentProject: (id) => set({ currentProjectId: id, currentZoneId: null }),
      setCurrentZone: (id) => set({ currentZoneId: id }),

      recordingStatus: 'idle',
      setRecordingStatus: (status) => set({ recordingStatus: status }),

      liveTranscript: '',
      setLiveTranscript: (transcript) => set({ liveTranscript: transcript }),

      pendingCount: 0,
      setPendingCount: (count) => set({ pendingCount: count }),
      incrementPending: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
      // Floor at zero — defensive against race conditions during rapid syncs.
      decrementPending: () => set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) })),
    }),
    {
      name: 'sponsapp-store',
      // Only persist navigational context; ephemeral state resets on reload.
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
        currentZoneId: state.currentZoneId,
      }),
    }
  )
)
