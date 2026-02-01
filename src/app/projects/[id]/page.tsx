'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mic, List, MapPin, Plus, FileSpreadsheet } from 'lucide-react'
import { useAppStore } from '@/store'

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { setCurrentProject, currentZoneId, setCurrentZone } = useAppStore()

  useEffect(() => {
    setCurrentProject(projectId)
  }, [projectId, setCurrentProject])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="font-semibold text-gray-900">Project</h1>
          <p className="text-xs text-gray-500">ID: {projectId.slice(0, 8)}...</p>
          <p className="text-xs text-gray-400">Build: 9db916e</p>
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
            <button className="text-blue-600 text-sm font-medium">
              Change
            </button>
          </div>
          <p className="text-gray-600">
            {currentZoneId || 'No zone selected'}
          </p>
          <button
            onClick={() => setCurrentZone('zone-1')}
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
