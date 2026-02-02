'use client'

import { useRef, useCallback, useState } from 'react'
import { Mic, Square, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/index'
import { v4 as uuidv4 } from 'uuid'
import { createOfflineCapture } from '@/lib/offline-db'
import { SyncManager } from '@/lib/sync/SyncManager'

interface RecordButtonProps {
  projectId: string
  context: any
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
  const router = useRouter()
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

  // Comprehensive state reset function
  const resetRecordingState = useCallback(() => {
    // Reset component state
    setIsRecording(false)
    setRecordingTime(0)
    setStatus('idle')
    setStatusMessage('')
    setShowNextAreaPrompt(false)
    
    // Reset refs
    audioChunksRef.current = []
    streamRef.current = null
    mediaRecorderRef.current = null
    recordingStartTimeRef.current = 0
    
    // Clear recording interval
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    
    console.log('🔄 Capture recording state reset complete')
  }, [])

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
            // Process online with full pipeline like the main record-button
            setStatusMessage('Uploading…')
            
            const audioBase64 = await new Promise<string>((resolveBase64, rejectBase64) => {
              const reader = new FileReader()
              reader.onloadend = () => {
                const result = reader.result
                if (typeof result !== 'string') return rejectBase64(new Error('Failed to encode audio'))
                const commaIndex = result.indexOf(',')
                resolveBase64(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
              }
              reader.onerror = () => rejectBase64(new Error('Failed to read audio blob'))
              reader.readAsDataURL(audioBlob)
            })

            const captureId = uuidv4()
            const idempotencyKey = uuidv4()

            const syncRes = await fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                captures: [
                  {
                    id: captureId,
                    idempotencyKey,
                    audioBase64,
                    audioDuration: duration,
                    timestamp: new Date().toISOString(),
                    projectId,
                    transcript: '',
                    context: {
                      zone: context.zone || '',
                      level: context.level || '',
                      room: context.room || ''
                    }
                  },
                ],
              }),
            })

            if (!syncRes.ok) {
              const data = await syncRes.json().catch(() => ({}))
              const msg = (data?.error as string | undefined) || 'Upload failed'
              throw new Error(`${msg} (HTTP ${syncRes.status})`)
            }

            const syncData = await syncRes.json()
            console.log('Sync response:', syncData)
            
            // Handle both formats: top-level lineItemId OR lineItemIds array
            let lineItemId: string | undefined
            if (syncData?.lineItemId) {
              lineItemId = syncData.lineItemId
              console.log('Using top-level lineItemId:', lineItemId)
            }
            // Fall back to lineItemIds array
            else if (syncData?.lineItemIds && Array.isArray(syncData.lineItemIds)) {
              const lineItem = syncData.lineItemIds.find((m: any) => m.captureId === captureId)
              lineItemId = lineItem?.lineItemId
              console.log('Found lineItemId in lineItemIds array:', lineItemId)
            }

            console.log('Final lineItemId:', { lineItemId, captureId })

            if (!lineItemId) {
              throw new Error('Sync did not return lineItemId for this capture')
            }

            setStatusMessage('Transcribing…')
            const formData = new FormData()
            formData.append('audio', new File([audioBlob], `${captureId}.webm`, { type: 'audio/webm' }))
            formData.append('captureId', captureId)
            formData.append('lineItemId', lineItemId)

            console.log('Sending transcription request for:', { captureId, lineItemId, audioBlobSize: audioBlob.size })
            const res = await fetch('/api/deepgram/transcribe', {
              method: 'POST',
              body: formData,
            })

            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              const msg =
                typeof data?.details === 'string'
                  ? `${data?.error || 'Transcription failed'}: ${data.details}`
                  : (data?.error as string | undefined) || 'Transcription failed'
              throw new Error(`${msg} (HTTP ${res.status})`)
            }

            const data = await res.json()
            const transcript = typeof data?.transcript === 'string' ? data.transcript : ''
            console.log('Transcription response:', data)
            
            if (transcript) {
              onSyncStatusChange?.(captureId, transcript)
              setStatusMessage('Captured')
              onCaptureComplete?.(captureId)
              
              // Set processing state and trigger Pass 2
              setStatus('processing')
              
              // Trigger Pass 2 processing
              try {
                const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://sponsapp-prelive.vercel.app'
                fetch(`${base}/api/pass2`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ lineItemId }),
                }).catch(err => console.error('Failed to trigger Pass 2:', err))
              } catch (error) {
                console.error('Error triggering Pass 2:', error)
              }
              
              console.log('Transcription complete, Pass 2 triggered')
            } else {
              setStatusMessage('Captured (no transcript)')
              onCaptureComplete?.(captureId)
              setStatus('processing')
            }
          } else {
            // Only show "Saved offline" when actually offline
            const capture = await createOfflineCapture(projectId, context, audioBlob, duration)
            
            setStatusMessage('Saved offline - will sync automatically')
            setStatus('complete')
            
            onCaptureComplete?.(capture.id)
            
            // Refresh to update summary with new capture
            router.refresh()
          }
          
          // Show next area prompt after a short delay
          setTimeout(() => {
            setShowNextAreaPrompt(true)
          }, 2000)

        } catch (error) {
          console.error('Failed to save capture:', error)
          setStatus('error')
          setStatusMessage('Failed to save capture')
          
          // Reset state for next capture even on error
          resetRecordingState()
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
    
    // Reset all recording state for next capture
    resetRecordingState()
    
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
      {/* Status Message - DISABLED to prevent black box issue */}
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
