'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Filter, ChevronDown, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { LineCard } from '@/components/line-card'
import { cn } from '@/lib/utils'

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

type FilterType = 'all' | 'matched' | 'qs_review' | 'pending' | 'failed'

export default function ItemsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [items, setItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [projectId])

  const fetchItems = async () => {
    try {
      setLoading(true)
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

  const filteredItems = items.filter(item => {
    switch (filter) {
      case 'matched':
        return item.pass2_status === 'MATCHED'
      case 'qs_review':
        return item.pass2_status === 'QS_REVIEW'
      case 'pending':
        return item.pass2_status === 'PENDING' || item.pass2_status === 'MATCHING'
      case 'failed':
        return item.pass2_status === 'FAILED'
      default:
        return true
    }
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    // Sort by created_at descending (newest first)
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'MATCHED':
        return <CheckCircle size={16} className="text-green-500" />
      case 'QS_REVIEW':
        return <AlertCircle size={16} className="text-amber-500" />
      case 'FAILED':
        return <AlertCircle size={16} className="text-red-500" />
      case 'PENDING':
      case 'MATCHING':
        return <Clock size={16} className="text-blue-500" />
      default:
        return <Clock size={16} className="text-gray-500" />
    }
  }

  const filterCounts = {
    all: items.length,
    matched: items.filter(item => item.pass2_status === 'MATCHED').length,
    qs_review: items.filter(item => item.pass2_status === 'QS_REVIEW').length,
    pending: items.filter(item => item.pass2_status === 'PENDING' || item.pass2_status === 'MATCHING').length,
    failed: items.filter(item => item.pass2_status === 'FAILED').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}/capture`}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={24} />
            </Link>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">Items</h1>
              <p className="text-sm text-gray-500">
                {filteredItems.length} of {items.length} items
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Filter size={20} />
          </button>
        </div>
      </header>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(filterCounts).map(([key, count]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as FilterType)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-full transition-colors",
                    filter === key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {key === 'all' ? 'All' : key.replace('_', ' ')} ({count})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading items...</p>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {filter === 'all' ? 'No items found' : `No ${filter.replace('_', ' ')} items`}
            </p>
            <Link
              href={`/projects/${projectId}/capture`}
              className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
            >
              Record First Item
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Asset and Status */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {item.type || 'Unknown Asset'}
                      </h3>
                      {getStatusIcon(item.pass2_status)}
                      {item.pass2_confidence && (
                        <span className="text-xs text-gray-400">
                          ({Math.round(item.pass2_confidence * 100)}%)
                        </span>
                      )}
                    </div>

                    {/* Observation */}
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {item.description || item.transcript || 'No description'}
                    </p>

                    {/* Context */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      {item.context && (
                        <>
                          <span>{item.context.zone}</span>
                          {item.context.zone && item.context.level && <span>•</span>}
                          <span>{item.context.level}</span>
                          {item.context.level && item.context.room && <span>•</span>}
                          <span>{item.context.room}</span>
                        </>
                      )}
                      {item.created_at && (
                        <>
                          {item.context && <span>•</span>}
                          <span>{new Date(item.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}</span>
                        </>
                      )}
                    </div>

                    {/* SPONS Match */}
                    {item.sponsCode && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                        <CheckCircle size={12} className="text-green-600" />
                        <span className="text-green-700 font-medium">{item.sponsCode}</span>
                        {item.sponsDescription && (
                          <span className="text-green-600">{item.sponsDescription}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => {
                      // TODO: Open item detail sheet
                      console.log('Open item details:', item.id)
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg ml-4"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-center gap-4">
          <Link
            href={`/projects/${projectId}/capture`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Record New
          </Link>
          <Link
            href={`/projects/${projectId}/sync`}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Sync
          </Link>
        </div>
      </div>
    </div>
  )
}
