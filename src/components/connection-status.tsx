'use client'

import { useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useAppStore, ConnectionStatus } from '@/store'

export function ConnectionStatusBar() {
  const { connectionStatus, setConnectionStatus, pendingCount } = useAppStore()

  useEffect(() => {
    const updateStatus = () => {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline')
    }

    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    updateStatus()

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
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
      text: '🟠 Offline – recording safely',
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
        className={connectionStatus === 'syncing' ? 'animate-spin' : ''} 
      />
      <span>{config.text}</span>
    </div>
  )
}
