'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useAppStore, ConnectionStatus } from '@/store'

export function ConnectionStatusBar() {
  const { connectionStatus, setConnectionStatus, pendingCount } = useAppStore()
  const [isChecking, setIsChecking] = useState(false)

  // Check actual connectivity by pinging the API
  const checkConnectivity = async () => {
    setIsChecking(true)
    try {
      // Try to fetch a lightweight endpoint
      const response = await fetch('/api/projects', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      if (response.ok) {
        setConnectionStatus('online')
      } else {
        setConnectionStatus('offline')
      }
    } catch (error) {
      console.log('Connectivity check failed:', error)
      setConnectionStatus('offline')
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    const updateStatus = () => {
      // First check navigator.onLine for quick response
      const isOnline = navigator.onLine
      
      if (isOnline) {
        // If navigator says online, verify with actual connectivity test
        checkConnectivity()
      } else {
        setConnectionStatus('offline')
      }
    }

    // Initial check
    updateStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    // Periodic connectivity check (every 30 seconds)
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkConnectivity()
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
      clearInterval(interval)
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
      text: isChecking ? '� Checking connection...' : '� Offline – recording safely',
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
      {connectionStatus === 'offline' && !isChecking && (
        <button
          onClick={checkConnectivity}
          className="ml-2 text-white/80 hover:text-white transition-colors"
          title="Check connection"
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  )
}
