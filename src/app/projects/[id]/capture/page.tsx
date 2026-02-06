'use client'

/**
 * Capture page — the primary recording interface for field engineers.
 *
 * Layout:
 *   - Sticky header with project name, area context, and online/offline status
 *   - Collapsible ContextSelector for setting zone/level/room
 *   - Central RecordButton (large tap target) for starting voice capture
 *   - Footer with links to Sync Status and Items views
 *
 * Monitors network connectivity in real-time and displays the count of
 * locally-queued captures waiting to sync.
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wifi, WifiOff, MoreHorizontal, Edit3 } from 'lucide-react'
import { RecordButton } from '@/components/capture/RecordButton'
import { ContextSelector } from '@/components/capture/ContextSelector'
import { useContextPersistence, formatContext } from '@/lib/context/ContextManager'
import { getCapturesByStatus } from '@/lib/offline-db'
import { cn } from '@/lib/utils'

export default function CapturePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const { context, setContext, recentContexts } = useContextPersistence(projectId)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [showContextSelector, setShowContextSelector] = useState(false)

  useEffect(() => {
    // Monitor connection status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    updateOnlineStatus()

    // Load pending count
    loadPendingCount()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const loadPendingCount = async () => {
    try {
      // For now, use a placeholder until we implement the getCapturesByStatus function
      // const pendingCaptures = await getCapturesByStatus(['PENDING', 'FAILED'])
      // setPendingCount(pendingCaptures.length)
      setPendingCount(0)
    } catch (error) {
      console.error('Failed to load pending count:', error)
    }
  }

  const handleCaptureComplete = (captureId: string) => {
    console.log('Capture completed:', captureId)
    loadPendingCount()
  }

  const handleSyncStatusChange = (captureId: string, status: string) => {
    console.log('Sync status changed:', captureId, status)
    loadPendingCount()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky Context Bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link
              href="/"
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={24} />
            </Link>
            
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">
                {/* Project name would be loaded from API */}
                Amazon MAN3
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <button
                  onClick={() => setShowContextSelector(!showContextSelector)}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <span>{formatContext(context)}</span>
                  <Edit3 size={12} />
                </button>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <>
                      <Wifi size={14} />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff size={14} />
                      <span>Offline</span>
                    </>
                  )}
                </div>
                {pendingCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600 font-medium">{pendingCount} pending</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContextSelector(!showContextSelector)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Context Selector (Collapsible) */}
      {showContextSelector && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <ContextSelector
            context={context}
            onChange={setContext}
            recentContexts={recentContexts}
            onClose={() => setShowContextSelector(false)}
          />
        </div>
      )}

      {/* Main Recording Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Instructions */}
        <div className="text-center mb-8 max-w-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Record Inspection
          </h2>
          <p className="text-sm text-gray-600">
            Tap the button below to start recording. Speak naturally about the defects you observe in this area.
          </p>
        </div>

        {/* Record Button */}
        <RecordButton
          projectId={projectId}
          context={context}
          onCaptureComplete={handleCaptureComplete}
          onSyncStatusChange={handleSyncStatusChange}
        />

        {/* Context Display */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Current area: <span className="font-medium text-gray-700">{formatContext(context)}</span>
          </p>
          <button
            onClick={() => setShowContextSelector(true)}
            className="text-blue-600 hover:text-blue-700 text-sm mt-1"
          >
            Change area
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-center gap-4">
          <Link
            href={`/projects/${projectId}/sync`}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span>View Sync Status</span>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                {pendingCount}
              </span>
            )}
          </Link>
          <Link
            href={`/projects/${projectId}/items`}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span>View Items</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
