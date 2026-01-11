import { ipcRenderer, contextBridge } from 'electron'

export interface SessionFolder {
  id: string
  name: string
  defaultCwd?: string
  color?: string
  isExpanded: boolean
  createdAt: string
}

export interface SessionData {
  id: string
  processId?: string
  title: string
  cwd: string
  folderId?: string
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

export interface NotificationSettings {
  enabled: boolean
  onTaskComplete: boolean
  onPermissionRequest: boolean
  onInputRequest: boolean
  onError: boolean
  sound: boolean
}

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

export interface SoundSettings {
  events: Record<string, SoundEventConfig>
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
  notifications?: NotificationSettings
  theme?: ThemeSettings
}

// Type-safe API exposed to renderer
const api = {
  // Session management
  session: {
    getAll: (): Promise<SessionData[]> => ipcRenderer.invoke('session:getAll'),
    get: (id: string): Promise<SessionData | null> => ipcRenderer.invoke('session:get', id),
    create: (options: { cwd?: string; title?: string; prompt?: string }): Promise<SessionData> =>
      ipcRenderer.invoke('session:create', options),
    sendMessage: (sessionId: string, message: string, images?: { data: string; name: string }[]): Promise<{ processId: string }> =>
      ipcRenderer.invoke('session:sendMessage', { sessionId, message, images }),
    resume: (id: string): Promise<SessionData> => ipcRenderer.invoke('session:resume', id),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('session:delete', id),
    setActive: (id: string | null): Promise<void> => ipcRenderer.invoke('session:setActive', id),
    updateTitle: (id: string, title: string): Promise<void> =>
      ipcRenderer.invoke('session:updateTitle', { id, title }),
    appendMessage: (sessionId: string, message: MessageData): Promise<void> =>
      ipcRenderer.invoke('session:appendMessage', { sessionId, message }),
    updateState: (sessionId: string, state: SessionData['state']): Promise<void> =>
      ipcRenderer.invoke('session:updateState', { sessionId, state }),
  },

  // Process control
  process: {
    kill: (processId: string): Promise<void> => ipcRenderer.invoke('process:kill', processId),
    sendInput: (processId: string, input: string): Promise<void> =>
      ipcRenderer.invoke('process:sendInput', { processId, input }),
    respondPermission: (processId: string, allow: boolean): Promise<void> =>
      ipcRenderer.invoke('process:respondPermission', { processId, allow }),
  },

  // Folder management
  folder: {
    getAll: (): Promise<SessionFolder[]> => ipcRenderer.invoke('folder:getAll'),
    create: (options: { name: string; defaultCwd?: string }): Promise<SessionFolder> =>
      ipcRenderer.invoke('folder:create', options),
    update: (id: string, updates: Partial<SessionFolder>): Promise<void> =>
      ipcRenderer.invoke('folder:update', { id, updates }),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('folder:delete', id),
  },

  // Settings
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    update: (updates: Partial<Settings>): Promise<void> =>
      ipcRenderer.invoke('settings:update', updates),
  },

  // Dialog
  dialog: {
    selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectDirectory'),
  },

  // Files
  files: {
    search: (cwd: string, query: string): Promise<{ name: string; path: string; isDirectory: boolean }[]> =>
      ipcRenderer.invoke('files:search', cwd, query),
  },

  // Sounds
  sounds: {
    getAll: (): Promise<SoundFile[]> => ipcRenderer.invoke('sounds:getAll'),
    getConfig: (): Promise<SoundSettings> => ipcRenderer.invoke('sounds:getConfig'),
    play: (soundPath: string): Promise<void> => ipcRenderer.invoke('sounds:play', soundPath),
    import: (filePath: string): Promise<SoundFile> => ipcRenderer.invoke('sounds:import', filePath),
    saveConfig: (config: SoundSettings): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('sounds:saveConfig', config),
    openFolder: (): Promise<void> => ipcRenderer.invoke('sounds:openFolder'),
    delete: (soundPath: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sounds:delete', soundPath),
  },

  // Notifications
  notification: {
    show: (title: string, body: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('notification:show', { title, body }),
  },

  // Event subscriptions
  on: {
    claudeData: (callback: (data: { processId: string; sessionId: string; data: string }) => void) => {
      const handler = (_: unknown, data: { processId: string; sessionId: string; data: string }) => callback(data)
      ipcRenderer.on('claude:data', handler)
      return () => ipcRenderer.off('claude:data', handler)
    },
    claudeExit: (callback: (data: { processId: string; sessionId: string; exitCode: number }) => void) => {
      const handler = (_: unknown, data: { processId: string; sessionId: string; exitCode: number }) => callback(data)
      ipcRenderer.on('claude:exit', handler)
      return () => ipcRenderer.off('claude:exit', handler)
    },
  },
}

contextBridge.exposeInMainWorld('applaude', api)

// TypeScript declaration for renderer
export type ApplaudeAPI = typeof api
