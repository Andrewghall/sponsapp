'use client'

/**
 * Project Overview page — hub for a single project.
 *
 * Displays:
 *   - Current zone selector with full zone CRUD management
 *   - Quick-action buttons (Record Item, View Items)
 *   - Progress stats (captured / pending / approved)
 *   - Recent items feed with status indicators
 *   - Export link for LCY3 Excel generation
 *
 * Refreshes data automatically when the browser tab regains focus
 * (useful after completing a recording on a mobile device).
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mic, List, MapPin, Plus, FileSpreadsheet } from 'lucide-react'
import { useAppStore } from '@/store'

interface Zone {
  id: string
  name: string
  floor?: string
  created_at: string
}

interface LineItem {
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
  created_at?: string
  pass2_status?: string
  pass2_confidence?: number
  context?: {
    zone: string
    level: string
    room: string
  }
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [isStoreReady, setIsStoreReady] = useState(false)
  
  // Project data state
  const [zones, setZones] = useState<Zone[]>([])
  const [items, setItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showZoneManager, setShowZoneManager] = useState(false)
  
  // Safely access store with hydration check
  const store = useAppStore()
  const { setCurrentProject, currentZoneId, setCurrentZone } = store

  useEffect(() => {
    // Wait for store to be hydrated before using it
    setIsStoreReady(true)
    if (projectId) {
      setCurrentProject(projectId)
      fetchProjectData()
    }
  }, [projectId, setCurrentProject])

  // Refresh data when page becomes visible (after recording)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && projectId) {
        fetchProjectData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [projectId])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      
      // Fetch zones and items in parallel
      const [zonesResponse, itemsResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}/zones`),
        fetch(`/api/projects/${projectId}/items`)
      ])

      // Handle zones data
      if (zonesResponse.ok) {
        const zonesData = await zonesResponse.json()
        console.log('Zones fetched:', zonesData)
        setZones(zonesData.zones || [])
      } else {
        console.error('Failed to fetch zones:', zonesResponse.status)
      }

      // Handle items data
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json()
        console.log('Items fetched:', itemsData)
        setItems(itemsData.items || [])
      } else {
        console.error('Failed to fetch items:', itemsResponse.status)
      }
    } catch (error) {
      console.error('Error fetching project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleZoneChange = async () => {
    console.log('[DEBUG] Zone change button clicked! isStoreReady:', isStoreReady, 'projectId:', projectId)
    if (isStoreReady) {
      try {
        console.log('[DEBUG] Creating zone for project:', projectId)
        const response = await fetch(`/api/projects/${projectId}/zones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Zone 1',
            description: 'Demo zone created from UI'
          })
        })
        
        console.log('[DEBUG] Zone creation response status:', response.status)
        console.log('[DEBUG] Zone creation response headers:', response.headers)
        
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
        
        // Re-fetch project data to ensure UI is up to date
        fetchProjectData()
        
        // Refresh home page to update project counts
        router.refresh()
      } catch (error) {
        console.error('Zone creation error:', error)
        alert(`Error creating zone: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      console.log('Store not ready yet')
      alert('Store not ready yet, please try again')
    }
  }

  // Zone management functions
  const updateZoneName = async (zoneId: string, newName: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/zones/${zoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })
      
      if (response.ok) {
        fetchProjectData() // Refresh zones list
      }
    } catch (error) {
      console.error('Failed to update zone name:', error)
    }
  }

  const updateZoneFloor = async (zoneId: string, newFloor: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/zones/${zoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floor: newFloor })
      })
      
      if (response.ok) {
        fetchProjectData() // Refresh zones list
      }
    } catch (error) {
      console.error('Failed to update zone floor:', error)
    }
  }

  const deleteZone = async (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return
    
    try {
      const response = await fetch(`/api/projects/${projectId}/zones/${zoneId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchProjectData() // Refresh zones list
        if (currentZoneId === zoneId) {
          setCurrentZone(null) // Clear current zone if it was deleted
        }
      }
    } catch (error) {
      console.error('Failed to delete zone:', error)
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
          
          {/* Show all zones with management */}
          {zones.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">All Zones ({zones.length})</h3>
                <button
                  onClick={() => setShowZoneManager(!showZoneManager)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {showZoneManager ? 'Hide' : 'Manage'}
                </button>
              </div>
              
              {/* Simple zone list */}
              <div className="space-y-1">
                {zones.map((zone) => (
                  <div key={zone.id} className="text-sm text-gray-600 flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{zone.name}</span>
                      {zone.floor && <span className="text-gray-400">- {zone.floor}</span>}
                    </div>
                    <button
                      onClick={() => setCurrentZone(zone.id)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Zone manager when expanded */}
              {showZoneManager && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Zone Management</h4>
                  <div className="space-y-2">
                    {zones.map((zone) => (
                      <div key={zone.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="text"
                          value={zone.name}
                          onChange={(e) => updateZoneName(zone.id, e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                        <input
                          type="text"
                          value={zone.floor || ''}
                          onChange={(e) => updateZoneFloor(zone.id, e.target.value)}
                          placeholder="Floor"
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                        <button
                          onClick={() => deleteZone(zone.id)}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleZoneChange}
                    className="mt-2 w-full px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Add New Zone
                  </button>
                </div>
              )}
            </div>
          )}
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
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              <p className="text-xs text-gray-500">Captured</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">
                {items.filter(item => item.status === 'pending' || item.pass2_status === 'PENDING').length}
              </p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">
                {items.filter(item => item.status === 'approved' || item.pass2_status === 'COMPLETE').length}
              </p>
              <p className="text-xs text-gray-500">Approved</p>
            </div>
          </div>
          
          {/* Show recent items */}
          {items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Items</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {items.slice(-3).reverse().map((item) => (
                  <div key={item.id} className="text-sm text-gray-600 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      item.pass2_status === 'COMPLETE' ? 'bg-green-500' :
                      item.pass2_status === 'PENDING' ? 'bg-amber-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="truncate">
                      {item.transcript ? item.transcript.substring(0, 40) + '...' : 'Processing...'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
