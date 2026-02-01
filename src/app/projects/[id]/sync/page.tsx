'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, AlertCircle, Clock, Upload, Brain, CheckCircle, X } from 'lucide-react'
import { OfflineCapture, SyncStatus, getCapturesByProject } from '@/lib/offline-db'
import { formatContext } from '@/lib/context/ContextManager'
import { cn } from '@/lib/utils'

interface SyncItem extends OfflineCapture {
  formattedDate: string
  formattedTime: string
}

const statusConfig: Record<SyncStatus, { icon: any; color: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-gray-500', label: 'Pending' },
  UPLOADING: { icon: Upload, color: 'text-blue-500', label: 'Uploading' },
  TRANSCRIBING: { icon: Clock, color: 'text-blue-500', label: 'Transcribing' },
  SPLITTING: { icon: Brain, color: 'text-amber-500', label: 'Splitting' },
  MATCHING: { icon: Brain, color: 'text-amber-500', label: 'Matching' },
  COMPLETE: { icon: CheckCircle, color: 'text-green-500', label: 'Complete' },
  FAILED: { icon: AlertCircle, color: 'text-red-500', label: 'Failed' },
}

export default function SyncPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [captures, setCaptures] = useState<SyncItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCapture, setSelectedCapture] = useState<SyncItem | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadCaptures()
  }, [projectId])

  const loadCaptures = async () => {
    try {
      setLoading(true)
      const allCaptures = await getCapturesByProject(projectId)
      
      const processedCaptures: SyncItem[] = allCaptures.map(capture => ({
        ...capture,
        formattedDate: new Date(capture.timestamp).toLocaleDateString(),
        formattedTime: new Date(capture.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }))
      
      // Sort by timestamp descending
      setCaptures(processedCaptures.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()))
    } catch (error) {
      console.error('Failed to load captures:', error)
    } finally {
      setLoading(false)
    }
  }

  const retryCapture = async (captureId: string) => {
    try {
      // TODO: Implement retry logic
      console.log('Retry capture:', captureId)
      // For now, just reload the list
      loadCaptures()
    } catch (error) {
      console.error('Failed to retry capture:', error)
    }
  }

  const groupCapturesByDate = (captures: SyncItem[]) => {
    const groups: { [date: string]: SyncItem[] } = {}
    
    captures.forEach(capture => {
      const date = capture.formattedDate
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(capture)
    })
    
    return groups
  }

  const getStatusIcon = (status: SyncStatus) => {
    const config = statusConfig[status]
    const Icon = config.icon
    return <Icon size={16} className={config.color} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading sync status...</p>
        </div>
      </div>
    )
  }

  const groupedCaptures = groupCapturesByDate(captures)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/capture`}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Sync Status</h1>
            <p className="text-sm text-gray-500">
              {captures.length} capture{captures.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={loadCaptures}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      {/* Capture List */}
      <div className="px-4 py-4">
        {Object.keys(groupedCaptures).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No captures found</p>
            <Link
              href={`/projects/${projectId}/capture`}
              className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
            >
              Start Recording
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCaptures).map(([date, dayCaptures]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{date}</h3>
                <div className="space-y-2">
                  {dayCaptures.map((capture) => (
                    <div
                      key={capture.id}
                      className="bg-white rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Context and Time */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-900 font-medium">
                              {formatContext(capture.context)}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              {capture.formattedTime}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-2">
                            {getStatusIcon(capture.syncStatus)}
                            <span className={cn(
                              "text-sm font-medium",
                              statusConfig[capture.syncStatus].color
                            )}>
                              {statusConfig[capture.syncStatus].label}
                            </span>
                            
                            {/* Duration */}
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              {Math.round(capture.audioDuration)}s
                            </span>
                          </div>

                          {/* Error message */}
                          {capture.lastError && (
                            <div className="mt-2 text-sm text-red-600">
                              {capture.lastError}
                            </div>
                          )}

                          {/* Transcript (if available) */}
                          {capture.transcript && (
                            <div className="mt-2 text-sm text-gray-600 italic">
                              "{capture.transcript.slice(0, 100)}{capture.transcript.length > 100 ? '...' : ''}"
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {capture.syncStatus === 'FAILED' && (
                            <button
                              onClick={() => retryCapture(capture.id)}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                              title="Retry"
                            >
                              <RefreshCw size={16} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setSelectedCapture(capture)
                              setShowDetails(true)
                            }}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                            title="View details"
                          >
                            <Clock size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedCapture && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Capture Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Context */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Context</h4>
                <p className="text-sm text-gray-900">{formatContext(selectedCapture.context)}</p>
              </div>

              {/* Status */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedCapture.syncStatus)}
                  <span className={cn(
                    "text-sm font-medium",
                    statusConfig[selectedCapture.syncStatus].color
                  )}>
                    {statusConfig[selectedCapture.syncStatus].label}
                  </span>
                </div>
              </div>

              {/* Audio Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Audio</h4>
                <p className="text-sm text-gray-600">
                  Duration: {Math.round(selectedCapture.audioDuration)}s
                </p>
                <p className="text-sm text-gray-600">
                  Size: {(selectedCapture.audioSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              {/* Timestamp */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Recorded</h4>
                <p className="text-sm text-gray-600">
                  {selectedCapture.timestamp.toLocaleString()}
                </p>
              </div>

              {/* Transcript */}
              {selectedCapture.transcript && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Transcript</h4>
                  <p className="text-sm text-gray-600 italic">
                    "{selectedCapture.transcript}"
                  </p>
                </div>
              )}

              {/* Error */}
              {selectedCapture.lastError && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Error</h4>
                  <p className="text-sm text-red-600">{selectedCapture.lastError}</p>
                </div>
              )}

              {/* Retry Count */}
              {selectedCapture.retryCount > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Retry Count</h4>
                  <p className="text-sm text-gray-600">{selectedCapture.retryCount}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              {selectedCapture.syncStatus === 'FAILED' && (
                <button
                  onClick={() => {
                    retryCapture(selectedCapture.id)
                    setShowDetails(false)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
