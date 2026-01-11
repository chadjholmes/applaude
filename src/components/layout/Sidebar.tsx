import { useState } from 'react'
import { Plus, FolderOpen, ChevronLeft, Settings } from 'lucide-react'
import { useSessionStore } from '../../stores/sessionStore'
import { useUIStore } from '../../stores/uiStore'
import { SessionList } from '../session/SessionList'

export function Sidebar() {
  const { createSession } = useSessionStore()
  const { collapseSidebar, openSettings } = useUIStore()
  const [isCreating, setIsCreating] = useState(false)

  const handleNewSession = async () => {
    setIsCreating(true)
    try {
      await createSession()
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectDirectory = async () => {
    const dir = await window.applaude.dialog.selectDirectory()
    if (dir) {
      setIsCreating(true)
      try {
        await createSession(dir)
      } finally {
        setIsCreating(false)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with action buttons */}
      <div className="h-12 flex items-center justify-between pl-20 pr-2 border-b border-neutral-800 drag-region">
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={handleNewSession}
            disabled={isCreating}
            className="p-1.5 hover:bg-neutral-800 rounded transition-colors disabled:opacity-50"
            title="New Session"
          >
            <Plus className="w-4 h-4 text-neutral-400" />
          </button>
          <button
            onClick={handleSelectDirectory}
            disabled={isCreating}
            className="p-1.5 hover:bg-neutral-800 rounded transition-colors disabled:opacity-50"
            title="Open Directory..."
          >
            <FolderOpen className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
        <button
          onClick={collapseSidebar}
          className="p-1 hover:bg-neutral-800 rounded transition-colors no-drag"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      {/* Session List */}
      <SessionList />

      {/* Settings Button */}
      <div className="mt-auto p-3 border-t border-neutral-800">
        <button
          onClick={openSettings}
          className="w-full flex items-center gap-2 px-3 py-2 text-neutral-500 hover:bg-neutral-800
                   hover:text-neutral-300 rounded-lg text-xs transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>
    </div>
  )
}
