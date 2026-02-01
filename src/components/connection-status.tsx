'use client'

import { useEffect, useState, useRef } from 'react'
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react'
import { useAppStore, ConnectionStatus } from '@/store'

export function ConnectionStatusBar() {
  const { connectionStatus, setConnectionStatus, pendingCount } = useAppStore()
  const [isChecking, setIsChecking] = useState(false)
  const backoffRef = useRef(1000) // Start with 1 second
  const maxBackoff = 30000 // Max 30 seconds
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check network connectivity (no API calls)
  const checkNetworkConnectivity = async () => {
    setIsChecking(true)
    
    try {
      // Use /api/health which has no database dependencies
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout
      
      const response = await fetch('/api/health', { 
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        // Network is reachable
        setConnectionStatus('online')
        backoffRef.current = 1000 // Reset backoff
        console.log('Network connectivity confirmed')
        
        // Now check API health separately
        checkAPIHealth()
      } else {
        // Server responded but with error - network is fine, server has issues
        setConnectionStatus('server_error')
        console.log('Network reachable but server error')
      }
    } catch (error) {
      // Only mark as offline for actual network errors
      if (error instanceof Error && (
        error.name === 'AbortError' || 
        error.name === 'TypeError' || 
        error.message.includes('fetch') ||
        error.message.includes('network')
      )) {
        setConnectionStatus('offline')
        console.log('Network connectivity failed:', error)
        
        // Exponential backoff for retries
        backoffRef.current = Math.min(backoffRef.current * 2, maxBackoff)
      } else {
        // Other errors - treat as server error
        setConnectionStatus('server_error')
        console.log('Server error (not network):', error)
      }
    } finally {
      setIsChecking(false)
    }
  }

  // Check API health (database-dependent)
  const checkAPIHealth = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const response = await fetch('/api/projects', { 
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok || response.status === 401) {
        // API is healthy
        console.log('API health check passed')
      } else if (response.status === 500) {
        // Database/connection issues
        setConnectionStatus('server_error')
        console.log('API health check failed with 500 - database issues')
      } else {
        setConnectionStatus('server_error')
        console.log('API health check failed with status:', response.status)
      }
    } catch (error) {
      // API health check failed - update status
      setConnectionStatus('server_error')
      console.log('API health check failed:', error)
    }
  }

  useEffect(() => {
    const updateStatus = () => {
      // First check browser's online status
      if (!navigator.onLine) {
        setConnectionStatus('offline')
        return
      }

      // Check actual network connectivity
      checkNetworkConnectivity()
    }

    // Initial check
    updateStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    // Periodic connectivity check with backoff
    const scheduleNextCheck = () => {
      checkTimeoutRef.current = setTimeout(() => {
        if (navigator.onLine) {
          checkNetworkConnectivity()
        }
        scheduleNextCheck()
      }, backoffRef.current)
    }

    scheduleNextCheck()

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }
    }
  }, [setConnectionStatus])

  const statusConfig: Record<ConnectionStatus, { icon: typeof Wifi; text: string; bg: string }> = {
    online: {
      icon: Wifi,
      text: '🟢 Live transcription',
      bg: 'bg-green-500',
    },
    offline: {
      icon: WifiOff,
      text: isChecking ? '🟡 Checking connection...' : '🔴 No internet connection',
      bg: 'bg-red-500',
    },
    server_error: {
      icon: AlertTriangle,
      text: '🟠 Server issues - recording offline',
      bg: 'bg-amber-500',
    },
    syncing: {
      icon: RefreshCw,
      text: `🟢 Processing backlog (${pendingCount})`,
      bg: 'bg-green-500',
    },
  }

  const config = statusConfig[connectionStatus]
  const Icon = config.icon

  return (
    <div className={`${config.bg} text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium`}>
      <Icon 
        size={16} 
        className={connectionStatus === 'syncing' || isChecking ? 'animate-spin' : ''} 
      />
      <span>{config.text}</span>
      {(connectionStatus === 'offline' || connectionStatus === 'server_error') && !isChecking && (
        <button
          onClick={checkNetworkConnectivity}
          className="ml-2 text-white/80 hover:text-white transition-colors"
          title="Retry connection"
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  )
}
