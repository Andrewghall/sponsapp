'use client'

import { useRef, useCallback, useState } from 'react'
import { Mic, Square, CheckCircle, AlertCircle } from 'lucide-react'
import { createOfflineCapture, updateCaptureSyncStatus } from '@/lib/offline-db'
import { CaptureContext } from '@/lib/context/ContextManager'
import { getSyncManager } from '@/lib/sync/SyncManager'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

interface RecordButtonProps {
  projectId: string
  context: CaptureContext
  onCaptureComplete?: (captureId: string) => void
  onSyncStatusChange?: (captureId: string, status: string) => void
}

export function RecordButton({ 
  projectId, 
  context, 
  onCaptureComplete, 
  onSyncStatusChange 
}: RecordButtonProps) {
  const { connectionStatus } = useAppStore()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'complete' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [showNextAreaPrompt, setShowNextAreaPrompt] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000

        setIsRecording(false)
        setStatus('processing')
        setStatusMessage('Saving capture...')

        try {
          if (connectionStatus === 'online') {
            // Process online when connection is good
            setStatusMessage('Processing online...')
            // TODO: Implement online processing - for now save locally but don't show "offline"
            const capture = await createOfflineCapture(projectId, context, audioBlob, duration)
            setStatusMessage('Processing...')
            setStatus('complete')
            
            onCaptureComplete?.(capture.id)
            
            // Trigger sync immediately since we're online
            const syncManager = getSyncManager()
            syncManager.processPendingCaptures()
          } else {
            // Only show "Saved offline" when actually offline
            const capture = await createOfflineCapture(projectId, context, audioBlob, duration)
            
            setStatusMessage('Saved offline - will sync automatically')
            setStatus('complete')
            
            onCaptureComplete?.(capture.id)
          }
          
          // Show next area prompt after a short delay
          setTimeout(() => {
            setShowNextAreaPrompt(true)
          }, 2000)

        } catch (error) {
          console.error('Failed to save capture:', error)
          setStatus('error')
          setStatusMessage('Failed to save capture')
        }
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)
      setStatus('recording')
      setStatusMessage('')
      recordingStartTimeRef.current = Date.now()

      // Update recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000))
      }, 1000)

    } catch (error) {
      console.error('Failed to start recording:', error)
      setStatus('error')
      setStatusMessage('Failed to access microphone')
    }
  }, [projectId, context, onCaptureComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Clear recording interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }

      setRecordingTime(0)
    }
  }, [isRecording])

  const handleNextArea = (keepSame: boolean) => {
    setShowNextAreaPrompt(false)
    setStatus('idle')
    setStatusMessage('')
    
    if (!keepSame) {
      // TODO: Open context selector
      console.log('Open context selector to change area')
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* Status Message - Fixed at absolute top */}
      {statusMessage && (
        <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50">
          <div className={cn(
            "flex items-center gap-2 px-4 py-1 rounded-lg text-sm shadow-lg",
            status === 'complete' && "bg-green-100 text-green-800",
            status === 'error' && "bg-red-100 text-red-800",
            status === 'processing' && "bg-blue-100 text-blue-800"
          )}>
            {status === 'complete' && <CheckCircle size={16} />}
            {status === 'error' && <AlertCircle size={16} />}
            {statusMessage}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-6">

      {/* Recording Timer */}
      {isRecording && (
        <div className="text-center">
          <div className="text-3xl font-mono text-gray-900">
            {formatRecordingTime(recordingTime)}
          </div>
          <div className="text-sm text-gray-500 mt-1">Recording...</div>
        </div>
      )}

      {/* Record Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={status === 'processing'}
        className={cn(
          "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-200",
          isRecording 
            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25" 
            : status === 'processing'
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-600/25"
        )}
      >
        {isRecording ? (
          <Square size={40} />
        ) : status === 'processing' ? (
          <div className="animate-spin">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <Mic size={40} />
        )}
      </button>

      {/* Instructions */}
      {!isRecording && status === 'idle' && (
        <div className="text-center text-sm text-gray-600">
          <p>Tap to start recording</p>
          <p className="text-xs text-gray-400 mt-1">Speak naturally about defects in this area</p>
        </div>
      )}

      {/* Next Area Prompt */}
      {showNextAreaPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="font-medium text-gray-900 mb-2">Move to next area?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Would you like to keep recording in the same area or change to a different area?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleNextArea(true)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Keep same area
              </button>
              <button
                onClick={() => handleNextArea(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Change area
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
