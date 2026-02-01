'use client'

import { useEffect, useState, useRef } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
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
      // Only check /api/health which has no database dependencies
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
      
      if (response.status === 200 && navigator.onLine === true) {
        // Online = navigator.onLine === true AND /api/health returns 200
        setConnectionStatus('online')
        backoffRef.current = 1000 // Reset backoff
        console.log('Network connectivity confirmed - online')
      } else {
        // Any other status = offline (only if network request fails or navigator.onLine is false)
        setConnectionStatus('offline')
        console.log('Network check failed - offline')
      }
    } catch (error) {
      // Only mark as offline for actual network errors (timeout/fetch failures)
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
        // Other errors (shouldn't happen with /api/health but just in case)
        // If /api/health request succeeded but had other issues, stay online
        console.log('Unexpected error in health check:', error)
        // Don't change connection status for non-network errors
      }
    } finally {
      setIsChecking(false)
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
      {(connectionStatus === 'offline') && !isChecking && (
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
