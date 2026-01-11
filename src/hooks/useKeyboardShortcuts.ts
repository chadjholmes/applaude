import { useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'

export function useKeyboardShortcuts() {
  const { toggleSidebar } = useUIStore()
  const { createSession, sessions, activeSessionId, setActiveSession, deleteSession } =
    useSessionStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl + B: Toggle sidebar
      if (isMod && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }

      // Cmd/Ctrl + N: New session
      if (isMod && e.key === 'n') {
        e.preventDefault()
        createSession()
      }

      // Cmd/Ctrl + W: Close current session
      if (isMod && e.key === 'w' && activeSessionId) {
        e.preventDefault()
        deleteSession(activeSessionId)
      }

      // Cmd/Ctrl + [1-9]: Switch to session by index
      if (isMod && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        const sortedSessions = Object.values(sessions).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        if (sortedSessions[index]) {
          setActiveSession(sortedSessions[index].id)
        }
      }

      // Cmd/Ctrl + Shift + [ or ]: Navigate sessions
      if (isMod && e.shiftKey && (e.key === '[' || e.key === ']')) {
        e.preventDefault()
        const sortedSessions = Object.values(sessions).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        const currentIndex = sortedSessions.findIndex((s) => s.id === activeSessionId)
        if (currentIndex !== -1) {
          const newIndex =
            e.key === '['
              ? (currentIndex - 1 + sortedSessions.length) % sortedSessions.length
              : (currentIndex + 1) % sortedSessions.length
          setActiveSession(sortedSessions[newIndex].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar, createSession, sessions, activeSessionId, setActiveSession, deleteSession])
}
