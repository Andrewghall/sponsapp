'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, List } from 'lucide-react'
import Link from 'next/link'
import { RecordButton } from '@/components/record-button'
import { LineCard } from '@/components/line-card'
import { useAppStore } from '@/store'

export default function RecordPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const { liveTranscript, currentZoneId, connectionStatus } = useAppStore()
  const [recentCaptures, setRecentCaptures] = useState<string[]>([])
  const [statusText, setStatusText] = useState<string>('')

  const handleCaptureComplete = useCallback((captureId: string) => {
    setRecentCaptures(prev => [captureId, ...prev].slice(0, 5))
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">Record Item</h1>
            <p className="text-xs text-gray-500">Zone: {currentZoneId || 'Not selected'}</p>
          </div>
        </div>
        <Link 
          href={`/projects/${projectId}/items`}
          className="p-2 text-gray-600"
        >
          <List size={24} />
        </Link>
      </header>

      {/* Main recording area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Live transcript display */}
        <div className="w-full max-w-md mb-8 min-h-[100px] bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Live transcript</p>
          <p className="text-gray-900">
            {liveTranscript || (
              <span className="text-gray-400 italic">Tap the microphone to start recording...</span>
            )}
          </p>
        </div>

        {/* Record button */}
        <RecordButton
          projectId={projectId}
          zoneId={currentZoneId || undefined}
          onCaptureComplete={handleCaptureComplete}
          onStatusChange={setStatusText}
        />

        <div className="mt-4 text-sm text-gray-600 text-center min-h-[20px]">
          {statusText}
        </div>

        <div className="mt-2 text-xs text-gray-400 text-center">
          {connectionStatus === 'online'
            ? 'Online: will transcribe after you stop.'
            : 'Offline: saved locally and will sync later.'}
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-500 mt-6 text-center max-w-xs">
          Speak one observation at a time. Include type, location, and condition.
        </p>
      </div>

      {/* Recent captures */}
      {recentCaptures.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recent captures</h3>
          <div className="space-y-2">
            {recentCaptures.map((captureId) => (
              <LineCard
                key={captureId}
                id={captureId}
                status="PENDING_PASS1"
                transcript="Processing..."
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
