'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { useAppStore } from '@/store'
import { saveOfflineCapture } from '@/lib/offline-db'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'

interface RecordButtonProps {
  projectId: string
  zoneId?: string
  onCaptureComplete?: (captureId: string) => void
  onCaptureCompleteWithTranscript?: (captureId: string, transcript: string) => void
  onStatusChange?: (status: string) => void
  onPass2Complete?: (captureId: string, data: any) => void
}

export function RecordButton({ projectId, zoneId, onCaptureComplete, onCaptureCompleteWithTranscript, onStatusChange, onPass2Complete }: RecordButtonProps) {
  const router = useRouter()
  const { 
    recordingStatus, 
    setRecordingStatus, 
    connectionStatus,
    setLiveTranscript,
    incrementPending 
  } = useAppStore()
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const startTimeRef = useRef<number>(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const analyserDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const [level, setLevel] = useState(0)

  // Poll for status updates after transcription
  const pollForStatus = useCallback(async (captureId: string) => {
    console.log('🔥 RECORDING: Starting Pass 2 polling for:', captureId)
    let pollCount = 0
    const maxPolls = 20 // 20 seconds timeout
    
    const pollInterval = setInterval(async () => {
      pollCount++
      
      try {
        const response = await fetch(`/api/captures/${captureId}/status`)
        if (response.ok) {
          const data = await response.json()
          
          // Update status based on state
          if (data.state === 'PLANNING') {
            onStatusChange?.('Planning inspection…')
          } else if (data.state === 'MATCHING') {
            onStatusChange?.('Matching assets…')
          } else if (data.state === 'COMPLETE') {
            clearInterval(pollInterval)
            setRecordingStatus('idle')
            onStatusChange?.('Complete')
            
            // Call Pass 2 complete callback with the data
            if (onPass2Complete && data.items && data.items.length > 0) {
              onPass2Complete(captureId, {
                items: data.items,
                state: data.state
              })
            }
            
            // Refresh items list to show all observations
            router.refresh()
            
            // Optionally navigate to items page
            // router.push(`/projects/${projectId}/items`)
          } else if (data.state === 'FAILED' || pollCount >= maxPolls) {
            clearInterval(pollInterval)
            setRecordingStatus('idle')
            onStatusChange?.('Assessment failed')
            
            // Still refresh items so user sees the results
            router.refresh()
          }
        }
      } catch (error) {
        console.error('Failed to poll status:', error)
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          setRecordingStatus('idle')
          onStatusChange?.('Saved, needs review')
          router.refresh()
        }
      }
    }, 1000) // Poll every 1 second
    
    // Cleanup on unmount
    return () => clearInterval(pollInterval)
  }, [onStatusChange, onPass2Complete, projectId, router])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
      if (websocketRef.current) {
        websocketRef.current.close()
      }

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      analyserRef.current = null
      analyserDataRef.current = null
    }
  }, [])

  const startMetering = useCallback(async (stream: MediaStream) => {
    if (audioContextRef.current) {
      return
    }

    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) {
      return
    }

    const ctx = new AudioContextCtor()
    audioContextRef.current = ctx

    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.85
    source.connect(analyser)
    analyserRef.current = analyser
    analyserDataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))

    const tick = () => {
      const a = analyserRef.current
      const data = analyserDataRef.current
      if (!a || !data) {
        return
      }

      a.getByteTimeDomainData(data)

      let sumSq = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sumSq += v * v
      }
      const rms = Math.sqrt(sumSq / data.length)
      const next = Math.min(1, rms * 3)
      setLevel(next)

      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)
  }, [])

  const stopMetering = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    setLevel(0)
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    analyserDataRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    try {
      onStatusChange?.('Requesting microphone…')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      })
      streamRef.current = stream

      await startMetering(stream)
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      startTimeRef.current = Date.now()

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(250)
      setRecordingStatus('recording')
      setLiveTranscript('')
      onStatusChange?.('Listening…')
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Could not access microphone. Please check permissions.')
      onStatusChange?.('Microphone permission needed')
    }
  }, [connectionStatus, onStatusChange, setRecordingStatus, setLiveTranscript, startMetering])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return

    setRecordingStatus('processing')
    onStatusChange?.('Saving audio…')

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop())

        stopMetering()
        
        if (websocketRef.current) {
          websocketRef.current.close()
          websocketRef.current = null
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const duration = (Date.now() - startTimeRef.current) / 1000

        const captureId = uuidv4()
        const idempotencyKey = uuidv4()

        incrementPending()

        console.log('🔥 RECORDING: Connection status is:', connectionStatus)
        if (connectionStatus === 'online') {
          try {
            console.log('🔥 RECORDING: Starting online processing for capture:', captureId)
            onStatusChange?.('Uploading…')

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

            console.log('🔥 RECORDING: Calling /api/sync...')
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
                      zone: zoneId || '',
                      level: '',
                      room: ''
                    }
                  },
                ],
              }),
            })

            console.log('🔥 RECORDING: /api/sync response status:', syncRes.status)

            if (!syncRes.ok) {
              const data = await syncRes.json().catch(() => ({}))
              const msg = (data?.error as string | undefined) || 'Upload failed'
              throw new Error(`${msg} (HTTP ${syncRes.status})`)
            }

            const syncData = await syncRes.json()
            console.log('Sync response:', syncData)
            
            // Handle both formats: top-level lineItemId OR lineItemIds array
            let lineItemId: string | undefined
            
            // First try top-level lineItemId (for single captures)
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

            onStatusChange?.('Transcribing…')
            const formData = new FormData()
            formData.append('audio', new File([audioBlob], `${captureId}.webm`, { type: 'audio/webm' }))
            formData.append('captureId', captureId)
            formData.append('lineItemId', lineItemId)

            console.log('Sending transcription request for:', { captureId, lineItemId, audioBlobSize: audioBlob.size })
            console.log('🔥 RECORDING: Calling /api/deepgram/transcribe...')
            const res = await fetch('/api/deepgram/transcribe', {
              method: 'POST',
              body: formData,
            })
            console.log('🔥 RECORDING: /api/deepgram/transcribe response status:', res.status)

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
              setLiveTranscript(transcript)
              onStatusChange?.('Captured')
              onCaptureCompleteWithTranscript?.(captureId, transcript)
              
              // Set processing state
              setRecordingStatus('processing')
              
              // Start polling for Pass 2 status updates
              pollForStatus(captureId)
            } else {
              onStatusChange?.('Captured (no transcript)')
              
              // Set processing state
              setRecordingStatus('processing')
              
              // Start polling for Pass 2 status updates
              pollForStatus(captureId)
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            console.error(e)
            onStatusChange?.(`Error: ${message}`)
            setRecordingStatus('idle')
          }
        } else {
          onStatusChange?.('Saved offline (will sync later)')
        }

        onCaptureComplete?.(captureId)
        resolve()
      }

      mediaRecorderRef.current!.stop()
    })
  }, [projectId, zoneId, setRecordingStatus, incrementPending, onCaptureComplete, onCaptureCompleteWithTranscript, onStatusChange, stopMetering, connectionStatus, setLiveTranscript, pollForStatus])

  const isRecording = recordingStatus === 'recording'
  const isProcessing = recordingStatus === 'processing'

  const segments = Array.from({ length: 16 }, (_, i) => {
    const t = (i + 1) / 16
    const active = isRecording ? level >= t : false
    const color = i < 10 ? 'bg-green-500' : i < 14 ? 'bg-amber-500' : 'bg-red-500'
    return (
      <div
        key={i}
        className={`h-2 w-3 rounded-sm transition-opacity duration-75 ${color} ${active ? 'opacity-100' : 'opacity-20'}`}
      />
    )
  })

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`
          w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-200 shadow-lg active:scale-95
          ${isRecording 
            ? 'bg-red-500 animate-pulse scale-110' 
            : 'bg-blue-600 hover:bg-blue-700'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <Square size={36} className="text-white" fill="white" />
        ) : (
          <Mic size={40} className="text-white" />
        )}
      </button>

      <div className={`mt-4 flex items-end gap-2 ${isRecording ? '' : 'opacity-60'}`}>
        <div className="flex items-center gap-1">
          {segments}
        </div>
      </div>
    </div>
  )
}
