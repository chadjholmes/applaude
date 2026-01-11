import { useState } from 'react'
import { MessageSquare, Trash2, Loader2, FolderOpen } from 'lucide-react'
import type { Session } from '../../types'

interface SessionItemProps {
  session: Session
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

export function SessionItem({ session, isActive, onSelect, onDelete }: SessionItemProps) {
  const [showDelete, setShowDelete] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  const getCwdName = (cwd: string) => {
    const parts = cwd.split('/')
    return parts[parts.length - 1] || cwd
  }

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors relative ${
        isActive
          ? 'bg-neutral-800 text-neutral-100'
          : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-300'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[var(--accent-color)] rounded-full" />
      )}
      <div className="flex-shrink-0 ml-1">
        {session.state === 'running' ? (
          <Loader2 className="w-3 h-3 animate-spin text-neutral-500" />
        ) : (
          <MessageSquare className={`w-3 h-3 ${isActive ? 'text-[var(--accent-color)]' : 'text-neutral-600'}`} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs truncate block">{session.title}</span>
      </div>

      {showDelete && (
        <button
          onClick={handleDelete}
          className="p-0.5 hover:bg-neutral-700 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="Delete session"
        >
          <Trash2 className="w-3 h-3 text-neutral-500 hover:text-neutral-300" />
        </button>
      )}
    </div>
  )
}
