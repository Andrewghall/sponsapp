'use client'

/**
 * Export page — generate LCY3-format Excel or CSV workbooks.
 *
 * The engineer selects a format (XLSX or CSV), an item filter (All, Matched
 * Only, or High Confidence >=80%), and reviews a preview table before
 * triggering the export. The generated file includes context columns, asset
 * details, SPONS codes/descriptions, confidence scores, and quantities.
 *
 * The export request is sent to POST /api/export/excel which builds the
 * workbook server-side with ExcelJS and returns a binary blob for download.
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, FileSpreadsheet, CheckSquare, Filter } from 'lucide-react'
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

export default function ExportPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [items, setItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xlsx'>('xlsx')
  const [filter, setFilter] = useState<'all' | 'matched' | 'approved'>('matched')

  useEffect(() => {
    fetchItems()
  }, [projectId])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/items`)
      
      if (!res.ok) {
        console.error('Failed to fetch items:', res.status)
        return
      }
      
      const data = await res.json()
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
      case 'approved':
        return item.pass2_status === 'MATCHED' && item.pass2_confidence && item.pass2_confidence >= 0.8
      default:
        return true
    }
  })

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          sheetType: 'LCY3',
          format: selectedFormat,
          filter,
          includeContext: true,
          includeSPONS: true
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the blob from the response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `spons-export-${projectId}-${new Date().toISOString().split('T')[0]}.${selectedFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const filterCounts = {
    all: items.length,
    matched: items.filter(item => item.pass2_status === 'MATCHED').length,
    approved: items.filter(item => item.pass2_status === 'MATCHED' && item.pass2_confidence && item.pass2_confidence >= 0.8).length,
  }

  const summaryStats = {
    total: filteredItems.length,
    matched: filteredItems.filter(item => item.pass2_status === 'MATCHED').length,
    qsReview: filteredItems.filter(item => item.pass2_status === 'QS_REVIEW').length,
    avgConfidence: filteredItems
      .filter(item => item.pass2_confidence)
      .reduce((sum, item) => sum + (item.pass2_confidence || 0), 0) / 
      filteredItems.filter(item => item.pass2_confidence).length || 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/items`}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={24} />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Export</h1>
            <p className="text-sm text-gray-500">
              {filteredItems.length} items ready for export
            </p>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{summaryStats.total}</div>
            <div className="text-xs text-gray-500">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summaryStats.matched}</div>
            <div className="text-xs text-gray-500">Matched</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{summaryStats.qsReview}</div>
            <div className="text-xs text-gray-500">QS Review</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(summaryStats.avgConfidence * 100)}%
            </div>
            <div className="text-xs text-gray-500">Avg Confidence</div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h2 className="font-medium text-gray-900 mb-4">Export Options</h2>
        
        {/* Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedFormat('xlsx')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                selectedFormat === 'xlsx'
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              <FileSpreadsheet size={16} />
              Excel (.xlsx)
            </button>
            <button
              onClick={() => setSelectedFormat('csv')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                selectedFormat === 'csv'
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              <Download size={16} />
              CSV
            </button>
          </div>
        </div>

        {/* Filter Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Items to Export</label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(filterCounts).map(([key, count]) => (
              <button
                key={key}
                onClick={() => setFilter(key as 'all' | 'matched' | 'approved')}
                className={cn(
                  "px-3 py-1 text-sm rounded-full transition-colors",
                  filter === key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {key === 'all' ? 'All Items' : key === 'matched' ? 'Matched Only' : 'High Confidence'} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || filteredItems.length === 0}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors",
            isExporting || filteredItems.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {isExporting ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download size={20} />
              Export {selectedFormat.toUpperCase()}
            </>
          )}
        </button>
      </div>

      {/* What's Included */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h2 className="font-medium text-gray-900 mb-4">What's Included</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-green-500" />
            <span>Context columns (Zone, Level, Room)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-green-500" />
            <span>Asset and observation details</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-green-500" />
            <span>SPONS codes and descriptions</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-green-500" />
            <span>Confidence scores</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-green-500" />
            <span>Quantities and timestamps</span>
          </div>
        </div>
      </div>

      {/* Preview */}
      {loading ? (
        <div className="px-4 py-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading preview...</p>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4">
          <h2 className="font-medium text-gray-900 mb-4">Preview ({filteredItems.length} items)</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Observation</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Context</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SPONS Code</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.type || 'Unknown'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                        {item.description || item.transcript || 'No description'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {item.context ? `${item.context.zone} • ${item.context.level} • ${item.context.room}` : 'Unspecified'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.sponsCode || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {item.pass2_confidence ? `${Math.round(item.pass2_confidence * 100)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredItems.length > 5 && (
              <div className="px-4 py-2 text-center text-sm text-gray-500 bg-gray-50">
                ... and {filteredItems.length - 5} more items
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-center gap-4">
          <Link
            href={`/projects/${projectId}/items`}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Items
          </Link>
          <Link
            href={`/projects/${projectId}/capture`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Record New
          </Link>
        </div>
      </div>
    </div>
  )
}
