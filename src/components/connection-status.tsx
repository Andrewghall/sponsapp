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
    console.log('Starting connectivity check...')
    
    try {
      // First try the projects API
      const response = await fetch('/api/projects', { 
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
        headers: {
          'Accept': 'application/json',
        }
      })
      
      console.log('API response status:', response.status)
      
      if (response.ok || response.status === 401) {
        // 401 is ok - it means the server is reachable
        console.log('Connection test successful')
        setConnectionStatus('online')
      } else {
        console.log('API returned error status:', response.status)
        setConnectionStatus('offline')
      }
    } catch (error) {
      console.log('Primary connectivity check failed:', error)
      
      // Fallback: try a simple health check
      try {
        const healthResponse = await fetch('/', { 
          method: 'HEAD',
          signal: AbortSignal.timeout(2000)
        })
        
        if (healthResponse.ok) {
          console.log('Fallback connection test successful')
          setConnectionStatus('online')
        } else {
          setConnectionStatus('offline')
        }
      } catch (fallbackError) {
        console.log('Fallback connectivity check also failed:', fallbackError)
        setConnectionStatus('offline')
      }
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
