import { PanelLeftOpen } from 'lucide-react'
import { useSessionStore } from '../../stores/sessionStore'
import { useUIStore } from '../../stores/uiStore'
import { MessageList } from '../messages/MessageList'
import { MessageInput } from '../input/MessageInput'
import { SessionHeader } from '../session/SessionHeader'
import { SettingsView } from '../SettingsView'
import { TasksPanel } from '../TasksPanel'
import { Logo } from '../common/Logo'

export function MainView() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const session = useSessionStore((s) =>
    activeSessionId ? s.sessions[activeSessionId] : null
  )
  const { sidebarCollapsed, expandSidebar, showSettings, closeSettings } = useUIStore()

  // Show settings if open
  if (showSettings) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="h-12 flex items-center pl-20 pr-4 border-b border-neutral-800 drag-region">
          {sidebarCollapsed && (
            <button
              onClick={expandSidebar}
              className="p-1.5 hover:bg-neutral-800 rounded transition-colors mr-3 no-drag"
              title="Show sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 max-w-2xl mx-auto w-full">
          <SettingsView onClose={closeSettings} />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Empty state header */}
        <div className="h-12 flex items-center pl-20 pr-4 border-b border-neutral-800 drag-region">
          {sidebarCollapsed && (
            <button
              onClick={expandSidebar}
              className="p-1.5 hover:bg-neutral-800 rounded transition-colors mr-3 no-drag"
              title="Show sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-6">
              <Logo size={64} className="mx-auto rounded-xl" />
            </div>
            <h2 className="text-base font-semibold text-neutral-100 mb-2">
              Welcome to Applaude
            </h2>
            <p className="text-sm text-neutral-400 mb-6">
              Create a new session to start chatting with Claude Code CLI.
              Your sessions are saved and can be resumed at any time.
            </p>
            <p className="text-xs text-neutral-500">
              <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-300 mr-1.5">⌘N</kbd>
              <span>to create a new session</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <SessionHeader session={session} />
      {/* Message area with floating tasks panel above the input */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <MessageList />
        {/* Floating tasks panel - positioned at bottom of message area, above input */}
        <TasksPanel />
      </div>
      <MessageInput />
    </div>
  )
}
