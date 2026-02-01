'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, FileSpreadsheet, Loader2 } from 'lucide-react'

export default function ExportPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [isExporting, setIsExporting] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // TODO: Implement actual export API call
      // For now, simulate export delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate generating an export URL
      const mockUrl = `https://example.com/exports/${projectId}-lcy-${Date.now()}.xlsx`
      setExportUrl(mockUrl)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownload = () => {
    if (exportUrl) {
      // In a real implementation, this would download the file
      // For now, just show an alert
      alert('Download would start here')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href={`/projects/${projectId}`} className="p-2 -ml-2 text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900">Export</h1>
          <p className="text-xs text-gray-500">Project: {projectId.slice(0, 8)}...</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Export Options */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-medium text-gray-900 mb-4">Export Options</h2>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Include captured items</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Include SPONS codes</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Include cost estimates</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Include audit trail</span>
            </label>
          </div>
        </div>

        {/* Export Action */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileSpreadsheet size={24} className="text-green-600" />
            <div>
              <p className="font-medium text-gray-900">LCY Workbook</p>
              <p className="text-sm text-gray-500">Excel format with all project data</p>
            </div>
          </div>

          {!exportUrl ? (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-green-600 text-white rounded-lg py-3 px-4 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              {isExporting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Generate Export
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">Export ready!</p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full bg-green-600 text-white rounded-lg py-3 px-4 font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Download size={20} />
                Download Excel File
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The export will include all approved items with their SPONS codes and cost estimates. Items pending QS review will be marked accordingly.
          </p>
        </div>
      </div>
    </div>
  )
}
