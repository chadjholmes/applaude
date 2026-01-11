import Store from 'electron-store'

export interface SessionFolder {
  id: string
  name: string
  defaultCwd?: string  // Default directory for new sessions in this folder
  color?: string
  isExpanded: boolean
  createdAt: string
}

export interface SessionData {
  id: string
  processId?: string
  cliSessionId?: string  // Claude CLI session ID for conversation continuity
  title: string
  cwd: string
  folderId?: string  // Optional folder assignment
  messages: MessageData[]
  state: 'idle' | 'running' | 'waiting_input' | 'waiting_permission'
  createdAt: string
  updatedAt: string
  metadata: {
    model?: string
    totalCostUsd?: number
    totalInputTokens?: number
    totalOutputTokens?: number
  }
}

export interface MessageData {
  id: string
  timestamp: string
  type: 'system' | 'assistant' | 'user' | 'result'
  raw: unknown
}

interface NotificationSettings {
  enabled: boolean
  onTaskComplete: boolean
  onPermissionRequest: boolean
  onInputRequest: boolean
  onError: boolean
  sound: boolean
}

interface ThemeSettings {
  tint: 'neutral' | 'blue' | 'purple' | 'emerald' | 'rose' | 'amber'
  glow: boolean
  texture: boolean
  blur: 'none' | 'subtle' | 'high'
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
}

interface StoreSchema {
  sessions: Record<string, SessionData>
  folders: Record<string, SessionFolder>
  activeSessionId: string | null
  settings: {
    sidebarWidth: number
    sidebarCollapsed: boolean
    defaultModel: string
    defaultPermissionMode: string
    defaultCwd: string
    windowOpacity: number
    notifications?: NotificationSettings
    theme?: ThemeSettings
  }
}

export class SessionStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'applaude-sessions',
      defaults: {
        sessions: {},
        folders: {},
        activeSessionId: null,
        settings: {
          sidebarWidth: 280,
          sidebarCollapsed: false,
          defaultModel: 'sonnet',
          defaultPermissionMode: 'default',
          defaultCwd: process.env.HOME || process.cwd(),
          windowOpacity: 1,
          theme: {
            tint: 'neutral',
            glow: true,
            texture: true,
            blur: 'subtle',
            fontSize: 'sm',
          },
        },
      },
    })
  }

  // Session CRUD
  getAllSessions(): SessionData[] {
    const sessions = this.store.get('sessions')
    return Object.values(sessions).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  getSession(id: string): SessionData | null {
    return this.store.get(`sessions.${id}`) || null
  }

  saveSession(session: SessionData): void {
    this.store.set(`sessions.${session.id}`, session)
  }

  deleteSession(id: string): void {
    const sessions = this.store.get('sessions')
    delete sessions[id]
    this.store.set('sessions', sessions)
  }

  updateSession(id: string, updates: Partial<SessionData>): void {
    const session = this.getSession(id)
    if (session) {
      this.saveSession({ ...session, ...updates, updatedAt: new Date().toISOString() })
    }
  }

  // Active session
  getActiveSessionId(): string | null {
    return this.store.get('activeSessionId')
  }

  setActiveSessionId(id: string | null): void {
    this.store.set('activeSessionId', id)
  }

  // Settings
  getSettings(): StoreSchema['settings'] {
    return this.store.get('settings')
  }

  updateSettings(updates: Partial<StoreSchema['settings']>): void {
    const current = this.store.get('settings')
    this.store.set('settings', { ...current, ...updates })
  }

  // Message operations
  appendMessage(sessionId: string, message: MessageData): void {
    const session = this.getSession(sessionId)
    if (session) {
      session.messages.push(message)
      session.updatedAt = new Date().toISOString()
      this.saveSession(session)
    }
  }

  clearSessionMessages(sessionId: string): void {
    const session = this.getSession(sessionId)
    if (session) {
      session.messages = []
      session.updatedAt = new Date().toISOString()
      this.saveSession(session)
    }
  }

  // Folder CRUD
  getAllFolders(): SessionFolder[] {
    const folders = this.store.get('folders')
    return Object.values(folders).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }

  getFolder(id: string): SessionFolder | null {
    return this.store.get(`folders.${id}`) || null
  }

  saveFolder(folder: SessionFolder): void {
    this.store.set(`folders.${folder.id}`, folder)
  }

  deleteFolder(id: string): void {
    const folders = this.store.get('folders')
    delete folders[id]
    this.store.set('folders', folders)

    // Remove folderId from all sessions in this folder
    const sessions = this.store.get('sessions')
    Object.values(sessions).forEach(session => {
      if (session.folderId === id) {
        delete session.folderId
        this.saveSession(session)
      }
    })
  }

  updateFolder(id: string, updates: Partial<SessionFolder>): void {
    const folder = this.getFolder(id)
    if (folder) {
      this.saveFolder({ ...folder, ...updates })
    }
  }
}
