'use client'

/**
 * NavigationRail — Desktop sidebar navigation for project-level pages.
 *
 * Renders a fixed-width side panel (264 px) with the same four project
 * sections as BottomTabs: Capture, Items, Sync, and Export.
 * Includes a header showing the truncated project ID and a footer.
 *
 * Used on wider screens; the mobile equivalent is BottomTabs.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic, List, RefreshCw, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationRailProps {
  projectId: string
  className?: string
}

/** Tab definitions — shared structure with BottomTabs for consistency. */
const navigationItems = [
  {
    href: (projectId: string) => `/projects/${projectId}/capture`,
    label: 'Capture',
    icon: Mic
  },
  {
    href: (projectId: string) => `/projects/${projectId}/items`,
    label: 'Items',
    icon: List
  },
  {
    href: (projectId: string) => `/projects/${projectId}/sync`,
    label: 'Sync',
    icon: RefreshCw
  },
  {
    href: (projectId: string) => `/projects/${projectId}/export`,
    label: 'Export',
    icon: CheckSquare
  }
]

export function NavigationRail({ projectId, className }: NavigationRailProps) {
  const pathname = usePathname()

  return (
    <nav className={cn(
      "w-64 bg-white border-r border-gray-200 h-full flex flex-col",
      className
    )}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">SPONS Mobile</h2>
        <p className="text-sm text-gray-500 mt-1">Project: {projectId.slice(0, 8)}...</p>
      </div>
      
      <div className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const href = item.href(projectId)
            const isActive = pathname === href
            const Icon = item.icon
            
            return (
              <li key={item.label}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>Mobile Inspection Platform</p>
          <p className="mt-1">© 2026 SPONS</p>
        </div>
      </div>
    </nav>
  )
}
