import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, Folder, FolderPlus, MoreHorizontal, Pencil, Trash2, Plus, FolderOpen, Link } from 'lucide-react'
import { useSessionStore } from '../../stores/sessionStore'
import { SessionItem } from './SessionItem'
import type { Session, SessionFolder } from '../../types'

export function SessionList() {
  const sessions = useSessionStore((s) => Object.values(s.sessions))
  const folders = useSessionStore((s) => Object.values(s.folders))
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const setActiveSession = useSessionStore((s) => s.setActiveSession)
  const deleteSession = useSessionStore((s) => s.deleteSession)
  const createSession = useSessionStore((s) => s.createSession)
  const createFolder = useSessionStore((s) => s.createFolder)
  const updateFolder = useSessionStore((s) => s.updateFolder)
  const deleteFolder = useSessionStore((s) => s.deleteFolder)
  const moveSessionToFolder = useSessionStore((s) => s.moveSessionToFolder)

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null)
  const [draggedSession, setDraggedSession] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const linkRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Sort by updatedAt descending
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  // Group sessions by folder
  const sessionsByFolder = sortedSessions.reduce<Record<string, Session[]>>((acc, session) => {
    const folderId = session.folderId || 'uncategorized'
    if (!acc[folderId]) acc[folderId] = []
    acc[folderId].push(session)
    return acc
  }, {})

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handleCreateFolder = async () => {
    const folder = await createFolder('New Folder')
    setExpandedFolders((prev) => new Set([...prev, folder.id]))
    setEditingFolder(folder.id)
    setNewFolderName('New Folder')
  }

  const handleRenameFolder = (folderId: string, name: string) => {
    updateFolder(folderId, { name })
    setEditingFolder(null)
  }

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId)
    setShowFolderMenu(null)
  }

  const handleConfigureFolderDirectory = async (folderId: string) => {
    const dir = await window.applaude.dialog.selectDirectory()
    if (dir) {
      updateFolder(folderId, { defaultCwd: dir })
    }
    setShowFolderMenu(null)
  }

  const handleNewSessionInFolder = async (folderId: string) => {
    await createSession(undefined, undefined, folderId)
  }

  const handleDragStart = (sessionId: string) => {
    setDraggedSession(sessionId)
  }

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    setDragOverFolder(folderId)
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
  }

  const handleDrop = (folderId: string) => {
    if (draggedSession) {
      // Move to uncategorized folder means remove folderId
      const targetFolderId = folderId === 'uncategorized' ? null : folderId
      moveSessionToFolder(draggedSession, targetFolderId)
      setDraggedSession(null)
      setDragOverFolder(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedSession(null)
    setDragOverFolder(null)
  }

  const renderFolder = (folder: SessionFolder | { id: string; name: string }, folderSessions: Session[]) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isEditing = editingFolder === folder.id
    const isUncategorized = folder.id === 'uncategorized'
    const isDragOver = dragOverFolder === folder.id && draggedSession !== null
    const hasDefaultCwd = 'defaultCwd' in folder && folder.defaultCwd

    return (
      <div
        key={folder.id}
        onDragOver={(e) => handleDragOver(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop(folder.id)}
        className={`mb-1 rounded transition-colors ${isDragOver ? 'bg-neutral-800/50' : ''}`}
      >
        <div className="flex items-center justify-between group">
          <button
            onClick={() => toggleFolder(folder.id)}
            className="flex items-center gap-1.5 px-2 py-1 text-neutral-400 hover:text-neutral-200
                       hover:bg-neutral-800/50 rounded transition-colors text-xs min-w-0 flex-1"
          >
            <ChevronRight
              className={`w-3 h-3 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            <Folder className="w-3.5 h-3.5 flex-shrink-0" />
            {isEditing ? (
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => handleRenameFolder(folder.id, newFolderName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFolder(folder.id, newFolderName)
                  if (e.key === 'Escape') setEditingFolder(null)
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-neutral-600 outline-none text-neutral-200 w-20"
              />
            ) : (
              <span className="truncate">{folder.name}</span>
            )}
          </button>

          {hasDefaultCwd && !isUncategorized && (
            <div
              ref={(el) => (linkRefs.current[folder.id] = el)}
              className="relative px-1 cursor-help"
              onMouseEnter={() => {
                const rect = linkRefs.current[folder.id]?.getBoundingClientRect()
                if (rect) {
                  setTooltipPosition({ x: rect.left, y: rect.bottom + 6 })
                }
                setHoveredFolderId(folder.id)
              }}
              onMouseLeave={() => {
                setHoveredFolderId(null)
                setTooltipPosition(null)
              }}
            >
              <Link className={`w-3 h-3 flex-shrink-0 transition-colors ${hoveredFolderId === folder.id ? 'text-blue-400' : 'text-blue-500/60'}`} />
            </div>
          )}

          <span className="text-[10px] text-neutral-600 px-2">{folderSessions.length}</span>

          {!isUncategorized && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowFolderMenu(showFolderMenu === folder.id ? null : folder.id)
                }}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-700 rounded transition-all"
              >
                <MoreHorizontal className="w-3 h-3 text-neutral-500" />
              </button>

              {showFolderMenu === folder.id && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => {
                      handleNewSessionInFolder(folder.id)
                      setShowFolderMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  >
                    <Plus className="w-3 h-3" />
                    New Session
                  </button>
                  <button
                    onClick={() => handleConfigureFolderDirectory(folder.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  >
                    <FolderOpen className="w-3 h-3" />
                    Set Directory...
                  </button>
                  <button
                    onClick={() => {
                      setEditingFolder(folder.id)
                      setNewFolderName(folder.name)
                      setShowFolderMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  >
                    <Pencil className="w-3 h-3" />
                    Rename
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-neutral-800"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="ml-3 pl-2 border-l border-neutral-800/50 mt-0.5 space-y-0.5">
            {folderSessions.length === 0 ? (
              <p className="text-[10px] text-neutral-600 py-1 px-2 italic">
                {isUncategorized ? 'No sessions' : 'Empty folder'}
              </p>
            ) : (
              folderSessions.map((session) => (
                <div
                  key={session.id}
                  draggable
                  onDragStart={() => handleDragStart(session.id)}
                  onDragEnd={handleDragEnd}
                  className={`${draggedSession === session.id ? 'opacity-50' : ''}`}
                >
                  <SessionItem
                    session={session}
                    isActive={session.id === activeSessionId}
                    onSelect={() => setActiveSession(session.id)}
                    onDelete={() => deleteSession(session.id)}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2">
        {/* New Folder button */}
        <button
          onClick={handleCreateFolder}
          className="w-full flex items-center gap-1.5 px-2 py-1 mb-2 text-neutral-500 hover:text-neutral-300
                     hover:bg-neutral-800/50 rounded transition-colors text-[10px]"
        >
          <FolderPlus className="w-3 h-3" />
          <span>New Folder</span>
        </button>

        {/* Custom folders */}
        {folders.map((folder) =>
          renderFolder(folder, sessionsByFolder[folder.id] || [])
        )}

        {/* Separator between folders and uncategorized sessions */}
        {folders.length > 0 && (sessionsByFolder['uncategorized'] || []).length > 0 && (
          <div className="my-3 border-t border-neutral-800/50" />
        )}

        {/* Uncategorized sessions - flat list without folder wrapper */}
        {(sessionsByFolder['uncategorized'] || []).length > 0 && (
          <div className="space-y-0.5">
            {sessionsByFolder['uncategorized'].map((session) => (
              <div
                key={session.id}
                draggable
                onDragStart={() => handleDragStart(session.id)}
                onDragEnd={handleDragEnd}
                className={`${draggedSession === session.id ? 'opacity-50' : ''}`}
              >
                <SessionItem
                  session={session}
                  isActive={session.id === activeSessionId}
                  onSelect={() => setActiveSession(session.id)}
                  onDelete={() => deleteSession(session.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tooltip Portal - renders outside overflow container */}
      {hoveredFolderId && tooltipPosition && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
        >
          <div className="bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/50 rounded-lg px-3 py-2 shadow-2xl max-w-xs animate-[fadeIn_0.15s_ease-out]">
            <div className="text-[10px] text-neutral-500 mb-0.5 uppercase tracking-wider font-medium">Linked to</div>
            <div className="text-xs text-neutral-200 font-mono whitespace-nowrap">
              {(folders.find(f => f.id === hoveredFolderId) as SessionFolder)?.defaultCwd}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
