'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mic, List, MapPin, Plus, FileSpreadsheet } from 'lucide-react'
import { useAppStore } from '@/store'

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [isStoreReady, setIsStoreReady] = useState(false)
  
  // Safely access store with hydration check
  const store = useAppStore()
  const { setCurrentProject, currentZoneId, setCurrentZone } = store

  useEffect(() => {
    // Wait for store to be hydrated before using it
    setIsStoreReady(true)
    if (projectId) {
      setCurrentProject(projectId)
    }
  }, [projectId, setCurrentProject])

  const handleZoneChange = async () => {
    console.log('Zone change button clicked!')
    if (isStoreReady) {
      try {
        console.log('Creating zone for project:', projectId)
        const response = await fetch(`/api/projects/${projectId}/zones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Zone 1',
            description: 'Demo zone created from UI'
          })
        })
        
        console.log('Zone creation response status:', response.status)
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          console.error('Zone creation failed:', error)
          alert(`Failed to create zone: ${error?.error || 'Unknown error'}`)
          return
        }
        
        const data = await response.json()
        console.log('Zone created successfully:', data)
        
        if (!data.zone || !data.zone.id) {
          console.error('Zone created but missing zone ID:', data)
          alert('Zone created but missing ID - please try again')
          return
        }
        
        setCurrentZone(data.zone.id)
        alert('Zone created successfully!')
      } catch (error) {
        console.error('Zone creation error:', error)
        alert(`Error creating zone: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      console.log('Store not ready yet')
      alert('Store not ready yet, please try again')
    }
  }

  if (!isStoreReady) {
    // Show loading state while store hydrates
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="font-semibold text-gray-900">Project</h1>
          <p className="text-xs text-gray-500">ID: {projectId.slice(0, 8)}...</p>
          <p className="text-xs text-gray-400">Build: 8e51601</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Zone Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <MapPin size={18} className="text-gray-500" />
              Current Zone
            </h2>
            <button 
              onClick={handleZoneChange}
              className="text-blue-600 text-sm font-medium"
            >
              Change
            </button>
          </div>
          <p className="text-gray-600">
            {currentZoneId || 'No zone selected'}
          </p>
          <button
            onClick={handleZoneChange}
            className="mt-2 text-sm text-blue-600"
          >
            Set to Zone 1 (demo)
          </button>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/projects/${projectId}/record`}
            className="bg-blue-600 text-white rounded-xl p-6 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Mic size={32} />
            <span className="font-medium">Record Item</span>
          </Link>

          <Link
            href={`/projects/${projectId}/items`}
            className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <List size={32} className="text-gray-600" />
            <span className="font-medium text-gray-700">View Items</span>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-medium text-gray-900 mb-3">Progress</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500">Captured</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">0</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">0</p>
              <p className="text-xs text-gray-500">Approved</p>
            </div>
          </div>
        </div>

        {/* Export */}
        <Link
          href={`/projects/${projectId}/export`}
          className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"
        >
          <FileSpreadsheet size={24} className="text-green-600" />
          <div>
            <p className="font-medium text-gray-900">Export to Excel</p>
            <p className="text-sm text-gray-500">Generate LCY workbook</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
