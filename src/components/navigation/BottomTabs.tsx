'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic, List, RefreshCw, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomTabsProps {
  projectId: string
  className?: string
}

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

export function BottomTabs({ projectId, className }: BottomTabsProps) {
  const pathname = usePathname()

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50",
      className
    )}>
      <div className="flex justify-around items-center h-16">
        {navigationItems.map((item) => {
          const href = item.href(projectId)
          const isActive = pathname === href
          const Icon = item.icon
          
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0",
                isActive
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
