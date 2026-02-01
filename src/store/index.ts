import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ConnectionStatus = 'online' | 'offline' | 'server_error' | 'syncing'
export type RecordingStatus = 'idle' | 'recording' | 'processing'

interface AppState {
  // Connection
  connectionStatus: ConnectionStatus
  setConnectionStatus: (status: ConnectionStatus) => void

  // Current context
  currentProjectId: string | null
  currentZoneId: string | null
  setCurrentProject: (id: string | null) => void
  setCurrentZone: (id: string | null) => void

  // Recording
  recordingStatus: RecordingStatus
  setRecordingStatus: (status: RecordingStatus) => void
  
  // Live transcript (interim results)
  liveTranscript: string
  setLiveTranscript: (transcript: string) => void
  
  // Pending items count
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
      setCurrentProject: (id) => set({ currentProjectId: id, currentZoneId: null }),
      setCurrentZone: (id) => set({ currentZoneId: id }),

      recordingStatus: 'idle',
      setRecordingStatus: (status) => set({ recordingStatus: status }),
      
      liveTranscript: '',
      setLiveTranscript: (transcript) => set({ liveTranscript: transcript }),
      
      pendingCount: 0,
      setPendingCount: (count) => set({ pendingCount: count }),
      incrementPending: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
      decrementPending: () => set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) })),
    }),
    {
      name: 'sponsapp-store',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
        currentZoneId: state.currentZoneId,
      }),
    }
  )
)
