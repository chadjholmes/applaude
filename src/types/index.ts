import type { ApplaudeAPI } from '../../electron/preload/index'

export * from './claude'

// Extend Window interface
declare global {
  interface Window {
    applaude: ApplaudeAPI
  }
}

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm?: string
}

export interface SessionFolder {
  id: string
  name: string
  defaultCwd?: string  // Default directory for new sessions in this folder
  color?: string
  isExpanded: boolean
  createdAt: string
}

export interface PendingQuestion {
  toolUseId: string
  questions: Array<{
    question: string
    header: string
    options: Array<{
      label: string
      description: string
    }>
    multiSelect: boolean
  }>
}

export interface Session {
  id: string
  processId?: string
  title: string
  cwd: string
  folderId?: string  // Optional folder assignment
  messages: Message[]
  todos: TodoItem[]
  state: 'idle' | 'running' | 'waiting_input' | 'waiting_permission'
  pendingQuestion?: PendingQuestion  // For AskUserQuestion tool calls
  createdAt: string
  updatedAt: string
  metadata: {
    model?: string
    totalCostUsd?: number
    totalInputTokens?: number
    totalOutputTokens?: number
    contextTokens?: number      // Current context window usage
    contextLimit?: number       // Max context window size
    compactionCount?: number    // Number of times context was compacted
  }
}

export interface Message {
  id: string
  timestamp: string
  type: 'system' | 'assistant' | 'user' | 'result'
  raw: unknown
  contentBlocks: ContentBlock[]
}

export interface ContentBlock {
  id: string
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'system_init' | 'result' | 'permission_request' | 'input_request'
  content: unknown
  isExpanded: boolean
}

export interface NotificationSettings {
  enabled: boolean
  onTaskComplete: boolean
  onPermissionRequest: boolean
  onInputRequest: boolean
  onError: boolean
  sound: boolean
}

// Sound Settings for Claude Code hooks
export interface SoundFile {
  name: string
  path: string
  isSystem?: boolean
  isCustom?: boolean
}

export interface SoundEventConfig {
  enabled: boolean
  sound: string | null
  notification: boolean
  title: string
  subtitle: string
}

export type SoundEventId = 'permission_prompt' | 'idle_prompt' | 'auth_success' | 'elicitation_dialog' | 'SessionStart' | 'SessionEnd'

export interface SoundSettings {
  events: Record<SoundEventId, SoundEventConfig>
}

export interface ThemeSettings {
  tint: 'neutral' | 'blue' | 'purple' | 'emerald' | 'rose' | 'amber'
  glow: boolean
  texture: boolean
  blur: 'none' | 'subtle' | 'high'
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
}

export interface Settings {
  sidebarWidth: number
  sidebarCollapsed: boolean
  defaultModel: string
  defaultPermissionMode: string
  defaultCwd: string
  windowOpacity: number
  notifications: NotificationSettings
  theme: ThemeSettings
}
