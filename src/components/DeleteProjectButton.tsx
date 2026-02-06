'use client'

/**
 * DeleteProjectButton — Inline delete button with confirmation prompt.
 *
 * Renders a small trash icon button. On click, shows a browser `confirm()`
 * dialog warning that all project data (captures, line items, audit entries)
 * will be cascade-deleted. Calls DELETE /api/projects/[id]/delete and
 * reloads the page on success.
 */

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

interface DeleteProjectButtonProps {
  projectId: string
  projectName: string
}

export function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!confirm(`Are you sure you want to delete "${projectName}" and all its data? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Refresh the page to show updated project list
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`Failed to delete project: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={isDeleting}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        title="Delete project"
      >
        <Trash2 size={16} />
      </button>
    </form>
  )
}
