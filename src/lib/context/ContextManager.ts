import { useState, useEffect } from 'react'
import { CaptureContext } from '@/lib/offline-db'

// Export the type for use in components
export type { CaptureContext }

const CONTEXT_STORAGE_KEY = 'spons-capture-contexts'

interface StoredContexts {
  [projectId: string]: {
    recent: CaptureContext[]
    lastUsed: CaptureContext
  }
}

export function useContextPersistence(projectId: string) {
  const [context, setContext] = useState<CaptureContext>({
    zone: '',
    level: '',
    room: ''
  })
  const [recentContexts, setRecentContexts] = useState<CaptureContext[]>([])

  // Load context from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CONTEXT_STORAGE_KEY)
    if (stored) {
      try {
        const parsed: StoredContexts = JSON.parse(stored)
        const projectContexts = parsed[projectId]
        if (projectContexts) {
          setContext(projectContexts.lastUsed)
          setRecentContexts(projectContexts.recent)
        }
      } catch (error) {
        console.error('Failed to load context from storage:', error)
      }
    }
  }, [projectId])

  // Save context to localStorage when it changes
  const updateContext = (newContext: CaptureContext) => {
    setContext(newContext)
    
    // Update recent contexts
    const updatedRecent = [newContext, ...recentContexts.filter(c => 
      !(c.zone === newContext.zone && c.level === newContext.level && c.room === newContext.room)
    )].slice(0, 10) // Keep top 10
    
    setRecentContexts(updatedRecent)
    
    // Save to localStorage
    const stored = localStorage.getItem(CONTEXT_STORAGE_KEY)
    const parsed: StoredContexts = stored ? JSON.parse(stored) : {}
    
    parsed[projectId] = {
      recent: updatedRecent,
      lastUsed: newContext
    }
    
    localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(parsed))
  }

  const clearContext = () => {
    updateContext({ zone: '', level: '', room: '' })
  }

  const useRecentContext = (recentContext: CaptureContext) => {
    updateContext(recentContext)
  }

  return {
    context,
    setContext: updateContext,
    recentContexts,
    clearContext,
    useRecentContext
  }
}

// Helper function to format context for display
export function formatContext(context: CaptureContext): string {
  const parts = [context.zone, context.level, context.room].filter(Boolean)
  return parts.length > 0 ? parts.join(' • ') : 'Unspecified'
}

// Helper function to create context label
export function createContextLabel(context: CaptureContext): string {
  if (!context.zone && !context.level && !context.room) {
    return 'Unspecified'
  }
  
  const zone = context.zone || 'Unknown Zone'
  const level = context.level || 'Unknown Level'
  const room = context.room || 'Unknown Area'
  
  return `${zone} • ${level} • ${room}`
}
