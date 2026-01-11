import { useEffect, useState, useRef } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { MainView } from './components/layout/MainView'
import { ResizeHandle } from './components/layout/ResizeHandle'
import { useSessionStore } from './stores/sessionStore'
import { useUIStore } from './stores/uiStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { checkSessionNotifications } from './services/notifications'
import type { NotificationSettings, SoundSettings } from './types'

export function App() {
  const { loadSessions, loadFolders, appendStreamData, handleProcessExit, activeSessionId, sessions } = useSessionStore()
  const { sidebarWidth, sidebarCollapsed, isResizing, theme, setTheme } = useUIStore()

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)
  const [soundSettings, setSoundSettings] = useState<SoundSettings | null>(null)

  const activeSession = activeSessionId ? sessions[activeSessionId] : null

  useKeyboardShortcuts()

  // Load sessions, folders, and settings on mount
  useEffect(() => {
    if (window.applaude) {
      loadSessions()
      loadFolders()
      window.applaude.settings.get().then((s) => {
        if (s.theme) setTheme(s.theme)
        if (s.notifications) setNotificationSettings(s.notifications)
      })
      window.applaude.sounds.getConfig().then(setSoundSettings)
    }
  }, [loadSessions, loadFolders, setTheme])

  // Subscribe to Claude stream data
  useEffect(() => {
    if (!window.applaude?.on) return

    const unsubData = window.applaude.on.claudeData(({ sessionId, data }) => {
      appendStreamData(sessionId, data)
    })

    const unsubExit = window.applaude.on.claudeExit(({ sessionId }) => {
      handleProcessExit(sessionId)
    })

    return () => {
      unsubData()
      unsubExit()
    }
  }, [appendStreamData, handleProcessExit])

  // Check for notifications when session states change
  useEffect(() => {
    if (!notificationSettings) return

    // Check all sessions for state changes
    Object.values(sessions).forEach((session) => {
      checkSessionNotifications(session, notificationSettings, soundSettings)
    })
  }, [sessions, notificationSettings, soundSettings])

  // Show loading if preload not ready
  if (!window.applaude) {
    return (
      <div className="flex h-screen bg-neutral-950 text-neutral-100 items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    )
  }

  // Determine ambient glow color based on session state
  const getGlowColor = () => {
    if (!theme.glow) return 'transparent'
    
    // Use tint for idle/ready state if active session is idle or null
    const tintColor = {
      neutral: '#737373', // neutral-500
      blue: '#3b82f6', // blue-500
      purple: '#a855f7', // purple-500
      emerald: '#10b981', // emerald-500
      rose: '#f43f5e', // rose-500
      amber: '#f59e0b', // amber-500
    }[theme.tint]

    if (!activeSession) return tintColor

    switch (activeSession.state) {
      case 'running': return '#f59e0b' // Amber (Thinking)
      case 'waiting_permission': return '#f43f5e' // Rose (Permission)
      case 'waiting_input': return '#3b82f6' // Blue (Input)
      default: return tintColor // Use user tint for Idle
    }
  }

  // Get accent color for CSS variable
  const getAccentColor = () => {
     return {
      neutral: '#737373',
      blue: '#3b82f6',
      purple: '#a855f7',
      emerald: '#10b981',
      rose: '#f43f5e',
      amber: '#f59e0b',
    }[theme.tint]
  }

  return (
    <div 
      className="relative h-screen bg-neutral-950 text-neutral-100 overflow-hidden selection:bg-neutral-700 selection:text-white"
      style={{ '--accent-color': getAccentColor() } as React.CSSProperties}
    >
      {/* Main Layout */}
      <div className="relative z-10 flex h-full">
        {/* Sidebar */}
        <div
          className={`flex-shrink-0 bg-neutral-900/80 backdrop-blur-md border-r border-neutral-800 ${
            isResizing ? '' : 'transition-sidebar'
          } ${sidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : ''}`}
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        >
          <Sidebar />
        </div>

        {/* Resize Handle */}
        {!sidebarCollapsed && <ResizeHandle />}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-950/50 backdrop-blur-sm">
          <MainView />
        </div>
      </div>
    </div>
  )
}
