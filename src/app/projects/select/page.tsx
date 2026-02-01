'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  client?: string
  site_address?: string
  created_at: string
}

export default function ProjectSelectPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastProjectId, setLastProjectId] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
    loadLastProject()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLastProject = () => {
    const stored = localStorage.getItem('spons-last-project')
    if (stored) {
      setLastProjectId(stored)
    }
  }

  const selectProject = (projectId: string) => {
    localStorage.setItem('spons-last-project', projectId)
    router.push(`/projects/${projectId}/capture`)
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.site_address?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort: last used at top, then by name
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (a.id === lastProjectId) return -1
    if (b.id === lastProjectId) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">Select Project</h1>
          <p className="text-sm text-gray-500 mt-1">Choose the site you're inspecting today</p>
        </div>
      </header>

      {/* Search */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading projects...</p>
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? 'No projects found' : 'No projects available'}
              </p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700"
              >
                <span className="text-lg">+</span>
                Create new project
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className={cn(
                    "w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors",
                    project.id === lastProjectId && "border-blue-500 bg-blue-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {project.name}
                        </h3>
                        {project.id === lastProjectId && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                            <Clock size={12} />
                            Last used
                          </span>
                        )}
                      </div>
                      
                      {project.client && (
                        <p className="text-sm text-gray-600 mt-1">{project.client}</p>
                      )}
                      
                      {project.site_address && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                          <MapPin size={14} />
                          <span className="truncate">{project.site_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {projects.length} project{projects.length !== 1 ? 's' : ''} available
          </p>
          <Link
            href="/projects/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Project
          </Link>
        </div>
      </div>
    </div>
  )
}
