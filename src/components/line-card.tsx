'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface LineCardProps {
  id: string
  status: string
  transcript?: string
  description?: string
  type?: string
  category?: string
  location?: string
  floor?: string
  sponsCode?: string
  sponsDescription?: string
  sponsCost?: number
  onEdit?: () => void
}

export function LineCard({
  status,
  transcript,
  description,
  type,
  category,
  location,
  floor,
  sponsCode,
  sponsDescription,
  sponsCost,
  onEdit,
}: LineCardProps) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
    PENDING_PASS1: { icon: Clock, color: 'text-gray-400', label: 'Processing...' },
    PASS1_COMPLETE: { icon: Clock, color: 'text-blue-500', label: 'Normalising...' },
    PENDING_PASS2: { icon: Clock, color: 'text-blue-500', label: 'Normalising...' },
    PASS2_COMPLETE: { icon: Clock, color: 'text-amber-500', label: 'Matching SPONS...' },
    PENDING_SPONS: { icon: Clock, color: 'text-amber-500', label: 'Matching SPONS...' },
    UNMATCHED: { icon: AlertCircle, color: 'text-red-500', label: 'Unmatched' },
    PENDING_QS_REVIEW: { icon: AlertCircle, color: 'text-amber-500', label: 'QS Review' },
    APPROVED: { icon: CheckCircle, color: 'text-green-500', label: 'Approved' },
    EXPORTED: { icon: CheckCircle, color: 'text-green-600', label: 'Exported' },
  }

  const config = statusConfig[status] || statusConfig.PENDING_PASS1
  const StatusIcon = config.icon

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon size={16} className={config.color} />
            <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
          </div>
          <p className="text-sm text-gray-900 truncate">
            {description || transcript || 'Processing...'}
          </p>
          {(type || category) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {[type, category].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-gray-400 ml-2 flex-shrink-0" />
        ) : (
          <ChevronDown size={20} className="text-gray-400 ml-2 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {transcript && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Spoken</p>
              <p className="text-sm text-gray-700 italic">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}

          {(floor || location) && (
            <div className="flex gap-4">
              {floor && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Floor</p>
                  <p className="text-sm text-gray-900">{floor}</p>
                </div>
              )}
              {location && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Location</p>
                  <p className="text-sm text-gray-900">{location}</p>
                </div>
              )}
            </div>
          )}

          {sponsCode && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700 mb-1">SPONS Match</p>
              <p className="text-sm font-mono text-green-800">{sponsCode}</p>
              {sponsDescription && (
                <p className="text-sm text-green-700 mt-1">{sponsDescription}</p>
              )}
              {sponsCost !== undefined && (
                <p className="text-sm font-semibold text-green-800 mt-1">
                  £{sponsCost.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {status === 'UNMATCHED' && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm text-red-700">
                No SPONS match found. Requires QS review.
              </p>
            </div>
          )}

          {onEdit && (
            <button
              onClick={onEdit}
              className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Edit details
            </button>
          )}
        </div>
      )}
    </div>
  )
}
