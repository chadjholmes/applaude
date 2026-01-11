import { useState } from 'react'
import { PanelLeftOpen, FolderOpen, Pencil, Check, X, Loader2 } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSessionStore } from '../../stores/sessionStore'
import { TokenIndicator } from './TokenIndicator'
import type { Session } from '../../types'

interface SessionHeaderProps {
  session: Session
}

export function SessionHeader({ session }: SessionHeaderProps) {
  const { sidebarCollapsed, expandSidebar } = useUIStore()
  const updateSessionTitle = useSessionStore((s) => s.updateSessionTitle)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)

  const handleStartEdit = () => {
    setEditTitle(session.title)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (editTitle.trim() && editTitle !== session.title) {
      await updateSessionTitle(session.id, editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(session.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const getCwdName = (cwd: string) => {
    const parts = cwd.split('/')
    return parts[parts.length - 1] || cwd
  }

  return (
    <div className={`h-12 flex items-center justify-between pr-4 border-b border-neutral-800 drag-region flex-shrink-0 ${sidebarCollapsed ? 'pl-20' : 'pl-4'}`}>
      <div className="flex items-center gap-3 min-w-0 no-drag">
        {sidebarCollapsed && (
          <button
            onClick={expandSidebar}
            className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
            title="Show sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-neutral-400" />
          </button>
        )}

        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm
                         focus:outline-none focus:border-neutral-600 w-48"
            />
            <button
              onClick={handleSave}
              className="p-1 hover:bg-neutral-800 rounded transition-colors"
            >
              <Check className="w-4 h-4 text-neutral-400" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-neutral-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <span className="text-sm font-medium text-neutral-100 truncate">
              {session.title}
            </span>
            <button
              onClick={handleStartEdit}
              className="p-1 hover:bg-neutral-800 rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <Pencil className="w-3 h-3 text-neutral-400" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-neutral-500 no-drag">
        {session.state === 'running' && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Running</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <FolderOpen className="w-3 h-3" />
          <span className="truncate max-w-32" title={session.cwd}>
            {getCwdName(session.cwd)}
          </span>
        </div>

        {session.metadata.model && (
          <span className="text-neutral-600">{session.metadata.model}</span>
        )}

        {session.metadata.totalCostUsd !== undefined && session.metadata.totalCostUsd > 0 && (
          <span className="text-neutral-600">
            ${session.metadata.totalCostUsd.toFixed(4)}
          </span>
        )}

        <TokenIndicator session={session} />
      </div>
    </div>
  )
}
