'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Search, Filter } from 'lucide-react'
import { LineCard } from '@/components/line-card'

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
}

export default function ItemsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [items, setItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchItems()
  }, [projectId])

  // Re-fetch when page becomes visible (after navigation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchItems()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [projectId])

  const fetchItems = async () => {
    try {
      setLoading(true)
      console.log('Fetching items for project:', projectId)
      const res = await fetch(`/api/projects/${projectId}/items`)
      console.log('Items API response status:', res.status)
      
      if (!res.ok) {
        console.error('Failed to fetch items:', res.status)
        return
      }
      
      const data = await res.json()
      console.log('Items API response data:', data)
      
      setItems(data.items || [])
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item =>
    item.transcript?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Show all items regardless of status (PENDING_PASS1, PENDING_PASS2, etc.)
  const sortedItems = [...items].sort((a, b) => {
    // Sort by created_at descending (newest first) - assuming API returns created_at
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href={`/projects/${projectId}`} className="p-2 -ml-2 text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900">Items</h1>
          <p className="text-xs text-gray-500">Project: {projectId.slice(0, 8)}...</p>
        </div>
        <Link
          href={`/projects/${projectId}/record`}
          className="bg-blue-600 text-white p-2 rounded-lg active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </Link>
      </header>

      <div className="p-4">
        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-3">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-gray-900 placeholder-gray-400"
            />
            <button className="p-2 text-gray-600">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading items...</p>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm ? 'No items found' : 'No items captured yet'}
            </p>
            {!searchTerm && (
              <Link
                href={`/projects/${projectId}/record`}
                className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} />
                Capture first item
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map((item) => (
              <LineCard 
                key={item.id}
                id={item.id}
                status={item.status}
                transcript={item.transcript}
                description={item.description}
                type={item.type}
                category={item.category}
                location={item.location}
                floor={item.floor}
                sponsCode={item.sponsCode}
                sponsDescription={item.sponsDescription}
                sponsCost={item.sponsCost}
                onEdit={() => router.push(`/projects/${projectId}/items/${item.id}/edit`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
