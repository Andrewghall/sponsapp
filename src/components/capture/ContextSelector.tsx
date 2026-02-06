'use client'

/**
 * ContextSelector — Modal form for setting the capture area context.
 *
 * Before recording an observation, the engineer selects which zone, level,
 * and room they are in. This component provides:
 *   - Three text inputs (Zone, Level/Floor, Room/Area) with voice-input buttons
 *   - A "Recent Areas" list (up to 5) for quick re-selection
 *   - Clear / Done actions
 *
 * The selected CaptureContext is passed up via `onChange` and persisted by
 * the parent through ContextManager.
 */

import { useState } from 'react'
import { Mic, X, Clock } from 'lucide-react'
import { CaptureContext, formatContext } from '@/lib/context/ContextManager'
import { cn } from '@/lib/utils'

interface ContextSelectorProps {
  /** Current zone/level/room values. */
  context: CaptureContext
  /** Called whenever any context field changes. */
  onChange: (context: CaptureContext) => void
  /** Previously used contexts for quick selection. */
  recentContexts: CaptureContext[]
  /** Close the selector panel. */
  onClose: () => void
}

export function ContextSelector({ context, onChange, recentContexts, onClose }: ContextSelectorProps) {
  const [voiceInputField, setVoiceInputField] = useState<'zone' | 'level' | 'room' | null>(null)

  const updateField = (field: keyof CaptureContext, value: string) => {
    onChange({
      ...context,
      [field]: value
    })
  }

  const useRecentContext = (recent: CaptureContext) => {
    onChange(recent)
    onClose()
  }

  const startVoiceInput = (field: 'zone' | 'level' | 'room') => {
    // TODO: Implement voice input
    setVoiceInputField(field)
    // For now, just log
    console.log(`Voice input for ${field}`)
    setVoiceInputField(null)
  }

  const handleSave = () => {
    onClose()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Set Area Context</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      </div>

      {/* Input Fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zone
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={context.zone}
              onChange={(e) => updateField('zone', e.target.value)}
              placeholder="e.g., Zone A, Electrical, Mechanical"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => startVoiceInput('zone')}
              className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Voice input"
            >
              <Mic size={16} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level / Floor
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={context.level}
              onChange={(e) => updateField('level', e.target.value)}
              placeholder="e.g., Level 2, Ground Floor, Roof"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => startVoiceInput('level')}
              className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Voice input"
            >
              <Mic size={16} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room / Area
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={context.room}
              onChange={(e) => updateField('room', e.target.value)}
              placeholder="e.g., Server Room, Office 101, Corridor"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => startVoiceInput('room')}
              className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Voice input"
            >
              <Mic size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Contexts */}
      {recentContexts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Clock size={14} />
            Recent Areas
          </h4>
          <div className="space-y-2">
            {recentContexts.slice(0, 5).map((recent, index) => (
              <button
                key={index}
                onClick={() => useRecentContext(recent)}
                className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">
                  {formatContext(recent)}
                </div>
                <div className="text-xs text-gray-500">
                  {recent.zone && `Zone: ${recent.zone}`}
                  {recent.zone && recent.level && ' • '}
                  {recent.level && `Level: ${recent.level}`}
                  {recent.level && recent.room && ' • '}
                  {recent.room && `Room: ${recent.room}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onChange({ zone: '', level: '', room: '' })}
          className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
