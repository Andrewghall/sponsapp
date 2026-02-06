'use client'

/**
 * LineCard — Expandable card component for displaying a single line item.
 *
 * Shows the item's processing status (pending → matched → approved → exported),
 * transcript, location info, and — when expanded — the SPONS candidate list
 * with agent decision rationale. A QS (Quantity Surveyor) can manually select
 * a candidate from the expanded view when the item is in review status.
 *
 * Data flow:
 *   1. Collapsed view renders from props (status, description, pass2 info).
 *   2. On expand, fetches SPONS candidates + agent decision from
 *      /api/spons/candidates for items in PENDING_QS_REVIEW or APPROVED states.
 *   3. QS selection POSTs to /api/spons/candidates/select, then reloads.
 */

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Clock, User, Bot } from 'lucide-react'

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
  pass2_status?: string
  pass2_confidence?: number
}

interface Candidate {
  id: string
  item_code: string
  description: string
  unit: string
  trade?: string
  rate?: number
  similarity_score: number
  unit_matches: boolean
  trade_matches: boolean
  is_selected: boolean
  selected_by?: string
  selected_at?: string
}

interface AgentDecision {
  action: string
  rationale: string
  confidence: number
  clarificationQuestion?: string
}

export function LineCard({
  id,
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
  pass2_status,
  pass2_confidence,
}: LineCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [agentDecision, setAgentDecision] = useState<AgentDecision | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  // Fetch SPONS candidates on expand for items awaiting or past QS review.
  useEffect(() => {
    if (expanded && (status === 'PENDING_QS_REVIEW' || status === 'APPROVED')) {
      setLoading(true)
      fetch(`/api/spons/candidates?lineItemId=${id}`)
        .then((res) => res.json())
        .then((data) => {
          setCandidates(data.candidates || [])
          setAgentDecision(data.agentDecision || null)
          setSelectedCandidateId(data.candidates.find((c: Candidate) => c.is_selected)?.id || null)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [expanded, id, status])

  /** Confirm a QS's manual candidate selection and reload to reflect the change. */
  const handleQSSelect = async (sponsItemId: string) => {
    const res = await fetch('/api/spons/candidates/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineItemId: id, sponsItemId }),
    })
    if (res.ok) {
      window.location.reload() // Refresh to show updated status
    }
  }

  /** Re-trigger the Pass 2 pipeline for items stuck in a pending state. */
  const handleManualMatch = async (lineItemId: string) => {
    try {
      console.log('Triggering manual SPONS match for line item:', lineItemId)
      const res = await fetch('/api/pass2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItemId }),
      })
      
      if (res.ok) {
        console.log('Manual SPONS match triggered successfully')
        // Refresh the page to show updated status
        window.location.reload()
      } else {
        console.error('Failed to trigger manual SPONS match')
      }
    } catch (error) {
      console.error('Error triggering manual SPONS match:', error)
    }
  }

  /** Map each processing status to its display icon, colour, and label. */
  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    PENDING_PASS1: { icon: Clock, color: 'text-gray-500', label: 'Pending' },
    PASS1_COMPLETE: { icon: Clock, color: 'text-blue-500', label: 'Transcribed' },
    PENDING_PASS2: { icon: Clock, color: 'text-blue-500', label: 'Matching' },
    PASS2_COMPLETE: { icon: CheckCircle, color: 'text-green-500', label: 'Matched' },
    PASS2_ERROR: { icon: AlertCircle, color: 'text-red-500', label: 'Error' },
    PENDING_SPONS: { icon: Clock, color: 'text-amber-500', label: 'SPONS Pending' },
    UNMATCHED: { icon: AlertCircle, color: 'text-red-500', label: 'Unmatched' },
    PENDING_QS_REVIEW: { icon: AlertCircle, color: 'text-amber-500', label: 'QS Review' },
    APPROVED: { icon: CheckCircle, color: 'text-green-500', label: 'Approved' },
    EXPORTED: { icon: CheckCircle, color: 'text-green-600', label: 'Exported' },
  }

  /** Pass 2 sub-status indicators (SPONS matching progress). */
  const pass2StatusConfig: Record<string, { color: string; label: string }> = {
    PENDING: { color: 'text-gray-500', label: 'Pending' },
    PLANNING: { color: 'text-blue-500', label: 'Planning' },
    MATCHING: { color: 'text-amber-500', label: 'Matching' },
    MATCHED: { color: 'text-green-500', label: 'Matched' },
    QS_REVIEW: { color: 'text-amber-600', label: 'QS Review' },
    FAILED: { color: 'text-red-500', label: 'Failed' },
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
            {pass2_status && pass2_status !== 'PENDING' && (
              <>
                <span className="text-gray-300">•</span>
                <span className={`text-xs font-medium ${pass2StatusConfig[pass2_status]?.color || 'text-gray-500'}`}>
                  {pass2StatusConfig[pass2_status]?.label || pass2_status}
                </span>
                {pass2_confidence && (
                  <span className="text-xs text-gray-400">
                    ({Math.round(pass2_confidence * 100)}%)
                  </span>
                )}
              </>
            )}
          </div>
          <p className="text-sm text-gray-900 truncate">
            {description || transcript || 'Processing...'}
          </p>
          {(type || category) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {[type, category].filter(Boolean).join(' • ')}
            </p>
          )}
          
          {/* Show SPONS match when available */}
          {pass2_status === 'MATCHED' && (sponsCode || sponsDescription) && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <div className="flex items-center gap-1 text-green-700 font-medium">
                <CheckCircle size={12} />
                SPONS Match
              </div>
              {sponsCode && (
                <p className="text-green-600 mt-1">Code: {sponsCode}</p>
              )}
              {sponsDescription && (
                <p className="text-green-600">{sponsDescription}</p>
              )}
              {pass2_confidence && (
                <p className="text-green-500 text-xs mt-1">
                  Confidence: {Math.round(pass2_confidence * 100)}%
                </p>
              )}
            </div>
          )}
          
          {/* Show pending status with manual trigger */}
          {(status === 'PENDING_PASS1' || status === 'PENDING_PASS2') && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center gap-1 text-blue-700 font-medium">
                <Clock size={12} />
                Pending SPONS Match
              </div>
              <p className="text-blue-600 mt-1">Waiting for automatic matching</p>
              <button
                onClick={() => handleManualMatch(id)}
                className="w-full mt-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded"
              >
                Trigger Manual Match
              </button>
            </div>
          )}

          {/* Show QS Review status */}
          {pass2_status === 'QS_REVIEW' && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <div className="flex items-center gap-1 text-amber-700 font-medium">
                <AlertCircle size={12} />
                Requires QS Review
              </div>
              {pass2_confidence && (
                <p className="text-amber-600 text-xs mt-1">
                  Confidence: {Math.round(pass2_confidence * 100)}%
                </p>
              )}
            </div>
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

          {agentDecision && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={16} className="text-blue-600" />
                <p className="text-xs font-medium text-blue-700">Agent Decision</p>
              </div>
              <p className="text-sm text-blue-800 mb-1">{agentDecision.rationale}</p>
              <p className="text-xs text-blue-600">Confidence: {(agentDecision.confidence * 100).toFixed(0)}%</p>
              {agentDecision.clarificationQuestion && (
                <p className="text-xs text-blue-600 mt-2 italic">Clarification needed: {agentDecision.clarificationQuestion}</p>
              )}
            </div>
          )}

          {candidates.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">SPONS Candidates</p>
              <div className="space-y-2">
                {candidates.map((c) => (
                  <div
                    key={c.id}
                    className={`border rounded-lg p-2 cursor-pointer transition-colors ${
                      c.is_selected
                        ? 'border-green-500 bg-green-50'
                        : selectedCandidateId === c.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedCandidateId(c.id)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-700 truncate">{c.item_code}</p>
                        <p className="text-sm text-gray-900 truncate">{c.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{c.unit}</span>
                          {c.trade && <span className="text-xs text-gray-500">• {c.trade}</span>}
                          {c.rate && <span className="text-xs text-gray-500">• £{c.rate}</span>}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs text-gray-500">Score</p>
                        <p className="text-sm font-medium">{(c.similarity_score * 100).toFixed(0)}%</p>
                        {c.is_selected && (
                          <div className="flex items-center gap-1 mt-1">
                            {c.selected_by === 'AGENT' ? <Bot size={12} className="text-green-600" /> : <User size={12} className="text-green-600" />}
                            <p className="text-xs text-green-600">{c.selected_by}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {c.unit_matches && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Unit</span>}
                      {c.trade_matches && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Trade</span>}
                    </div>
                  </div>
                ))}
              </div>
              {(status === 'PENDING_QS_REVIEW' || status === 'APPROVED') && (
                <button
                  onClick={() => selectedCandidateId && handleQSSelect(selectedCandidateId)}
                  disabled={!selectedCandidateId}
                  className="w-full mt-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded"
                >
                  {selectedCandidateId ? 'Confirm QS Selection' : 'Select a candidate above'}
                </button>
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
