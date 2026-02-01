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
  onCaptureComplete: (captureId: string) => void
  onCaptureCompleteWithTranscript?: (captureId: string, transcript: string) => void
  onStatusChange?: (statusText: string) => void
}

export function RecordButton({ projectId, zoneId, onCaptureComplete, onCaptureCompleteWithTranscript, onStatusChange }: RecordButtonProps) {
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
    try {
      const response = await fetch(`/api/captures/${captureId}/status`)
      if (response.ok) {
        const data = await response.json()
        // Update UI based on status
        if (data.status === 'PASS2_COMPLETE' || data.status === 'PENDING_QS_REVIEW' || data.status === 'APPROVED') {
          onStatusChange?.('Ready')
        }
      }
    } catch (error) {
      console.error('Failed to poll status:', error)
    }
  }, [onStatusChange])

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

        await saveOfflineCapture({
          id: captureId,
          idempotencyKey,
          audioBlob,
          audioDuration: duration,
          timestamp: new Date(),
          projectId,
          zoneId,
          synced: false,
        })

        incrementPending()

        if (connectionStatus === 'online') {
          try {
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
                    zoneId,
                    transcript: '',
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
            
            // The sync endpoint returns lineItemIds as an array
            const lineItemIds = syncData?.lineItemIds as Array<{ captureId: string; lineItemId: string }> | undefined
            const lineItem = lineItemIds?.find(m => m.captureId === captureId)
            const lineItemId = lineItem?.lineItemId

            console.log('Found lineItemId:', { lineItemId, captureId, lineItemIds })

            if (!lineItemId) {
              throw new Error('Sync did not return lineItemId for this capture')
            }

            onStatusChange?.('Transcribing…')
            const formData = new FormData()
            formData.append('audio', new File([audioBlob], `${captureId}.webm`, { type: 'audio/webm' }))
            formData.append('captureId', captureId)
            formData.append('lineItemId', lineItemId)

            console.log('Sending transcription request for:', { captureId, lineItemId, audioBlobSize: audioBlob.size })
            const res = await fetch('/api/deepgram/transcribe', {
              method: 'POST',
              body: formData,
            })
            console.log('Transcription response status:', res.status)

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
              onStatusChange?.('Capture saved successfully')
              onCaptureCompleteWithTranscript?.(captureId, transcript)
              
              // Clear processing state
              setRecordingStatus('idle')
              
              // Navigate to items page
              router.push(`/projects/${projectId}/items`)
              
              // Force refresh
              router.refresh()
              
              // Start polling for Pass 2 status updates (async, non-blocking)
              setTimeout(() => {
                pollForStatus(captureId)
              }, 2000)
            } else {
              onStatusChange?.('Capture saved (no transcript)')
              
              // Clear processing state
              setRecordingStatus('idle')
              
              // Navigate to items page
              router.push(`/projects/${projectId}/items`)
              
              // Force refresh
              router.refresh()
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            console.error(e)
            onStatusChange?.(`Error: ${message}`)
          }
        } else {
          onStatusChange?.('Saved offline (will sync later)')
        }

        onCaptureComplete(captureId)
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
