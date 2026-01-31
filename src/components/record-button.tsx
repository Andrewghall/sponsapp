'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { useAppStore } from '@/store'
import { saveOfflineCapture } from '@/lib/offline-db'
import { v4 as uuidv4 } from 'uuid'

interface RecordButtonProps {
  projectId: string
  zoneId?: string
  onCaptureComplete: (captureId: string) => void
}

export function RecordButton({ projectId, zoneId, onCaptureComplete }: RecordButtonProps) {
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
          
          // If online, send to Deepgram for live transcription
          if (connectionStatus === 'online' && websocketRef.current?.readyState === WebSocket.OPEN) {
            event.data.arrayBuffer().then(buffer => {
              websocketRef.current?.send(buffer)
            })
          }
        }
      }

      // Start live transcription if online
      if (connectionStatus === 'online') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const ws = new WebSocket(`${protocol}//${window.location.host}/api/deepgram/stream`)
        websocketRef.current = ws
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.transcript) {
              setLiveTranscript(data.transcript)
            }
          } catch (e) {
            console.error('Failed to parse transcript:', e)
          }
        }
        
        ws.onerror = () => {
          console.log('WebSocket error - continuing offline')
        }
      }

      mediaRecorder.start(250)
      setRecordingStatus('recording')
      setLiveTranscript('')
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }, [connectionStatus, setRecordingStatus, setLiveTranscript, startMetering])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return

    setRecordingStatus('processing')

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
        setRecordingStatus('idle')
        onCaptureComplete(captureId)
        resolve()
      }

      mediaRecorderRef.current!.stop()
    })
  }, [projectId, zoneId, setRecordingStatus, incrementPending, onCaptureComplete, stopMetering])

  const isRecording = recordingStatus === 'recording'
  const isProcessing = recordingStatus === 'processing'

  const bars = [0.15, 0.35, 0.55, 0.75, 0.95].map((threshold, i) => {
    const active = isRecording && level > threshold
    const height = isRecording ? 10 + Math.round(level * 24) : 8
    return (
      <div
        key={i}
        className={`w-2 rounded-full transition-colors duration-100 ${active ? 'bg-white' : 'bg-white/40'}`}
        style={{ height }}
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
        {bars}
      </div>
    </div>
  )
}
