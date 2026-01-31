'use client'

import { useRef, useCallback, useEffect } from 'react'
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

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
      if (websocketRef.current) {
        websocketRef.current.close()
      }
    }
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
  }, [connectionStatus, setRecordingStatus, setLiveTranscript])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return

    setRecordingStatus('processing')

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop())
        
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
  }, [projectId, zoneId, setRecordingStatus, incrementPending, onCaptureComplete])

  const isRecording = recordingStatus === 'recording'
  const isProcessing = recordingStatus === 'processing'

  return (
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
  )
}
