import { IpcMain, BrowserWindow, dialog, Notification } from 'electron'
import { ClaudeProcessManager } from './claude-process'
import { SessionStore, SessionData } from './session-store'
import * as soundHooks from './sound-hooks'
import { v4 as uuidv4 } from 'uuid'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

export function setupIpcHandlers(
  ipcMain: IpcMain,
  claudeManager: ClaudeProcessManager,
  sessionStore: SessionStore,
  win: BrowserWindow
) {
  // ============ Session Management ============

  ipcMain.handle('session:getAll', () => {
    return sessionStore.getAllSessions()
  })

  ipcMain.handle('session:get', (_, id: string) => {
    return sessionStore.getSession(id)
  })

  ipcMain.handle('session:create', (_, options: { cwd?: string; title?: string; prompt?: string }) => {
    const settings = sessionStore.getSettings()
    const cwd = options.cwd || settings.defaultCwd || os.homedir()
    const sessionId = uuidv4()

    const session: SessionData = {
      id: sessionId,
      title: options.title || `Session ${new Date().toLocaleTimeString()}`,
      cwd,
      messages: [],
      state: 'idle',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    }

    sessionStore.saveSession(session)
    sessionStore.setActiveSessionId(session.id)

    // If there's an initial prompt, start the process
    if (options.prompt) {
      const cliSessionId = uuidv4()
      const processId = claudeManager.startSession({
        cwd,
        sessionId,
        cliSessionId,
        isFirstMessage: true,
        prompt: options.prompt,
      })
      session.processId = processId
      session.cliSessionId = cliSessionId
      session.state = 'running'
      sessionStore.saveSession(session)
    }

    return session
  })

  ipcMain.handle('session:sendMessage', (_, { sessionId, message, images }: { sessionId: string; message: string; images?: { data: string; name: string }[] }) => {
    const session = sessionStore.getSession(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found`)

    // Check if this is the first message (no CLI session ID yet)
    const isFirstMessage = !session.cliSessionId
    const cliSessionId = session.cliSessionId || uuidv4()

    // Build prompt with image references if any
    // For now, save images to temp files and reference them in the prompt
    let finalPrompt = message
    if (images && images.length > 0) {
      const tempDir = os.tmpdir()
      const imagePaths: string[] = []

      for (const img of images) {
        const imgPath = path.join(tempDir, `applaude-img-${Date.now()}-${img.name}`)
        const buffer = Buffer.from(img.data, 'base64')
        fs.writeFileSync(imgPath, buffer)
        imagePaths.push(imgPath)
      }

      // Prepend image paths to the prompt
      const imageRefs = imagePaths.map((p) => `@${p}`).join(' ')
      finalPrompt = `${imageRefs}\n\n${message}`
    }

    // Start a new process for this message (uses same CLI session for continuity)
    const processId = claudeManager.startSession({
      cwd: session.cwd,
      sessionId: session.id,
      cliSessionId,
      isFirstMessage,
      prompt: finalPrompt,
    })

    session.processId = processId
    session.cliSessionId = cliSessionId
    session.state = 'running'
    sessionStore.saveSession(session)

    return { processId }
  })

  ipcMain.handle('session:resume', (_, sessionId: string) => {
    const session = sessionStore.getSession(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found`)

    sessionStore.setActiveSessionId(sessionId)
    return session
  })

  ipcMain.handle('session:delete', (_, id: string) => {
    const session = sessionStore.getSession(id)
    if (session?.processId) {
      claudeManager.kill(session.processId)
    }
    sessionStore.deleteSession(id)
  })

  ipcMain.handle('session:setActive', (_, id: string | null) => {
    sessionStore.setActiveSessionId(id)
  })

  ipcMain.handle('session:updateTitle', (_, { id, title }: { id: string; title: string }) => {
    sessionStore.updateSession(id, { title })
  })

  ipcMain.handle('session:appendMessage', (_, { sessionId, message }) => {
    sessionStore.appendMessage(sessionId, message)
  })

  ipcMain.handle('session:updateState', (_, { sessionId, state }) => {
    sessionStore.updateSession(sessionId, { state })
  })

  ipcMain.handle('session:updateFolder', (_, { sessionId, folderId }: { sessionId: string; folderId: string | null }) => {
    sessionStore.updateSession(sessionId, { folderId: folderId || undefined })
  })

  // ============ Folder Management ============

  ipcMain.handle('folder:getAll', () => {
    return sessionStore.getAllFolders()
  })

  ipcMain.handle('folder:create', (_, { name, defaultCwd }: { name: string; defaultCwd?: string }) => {
    const folder = {
      id: uuidv4(),
      name,
      defaultCwd,
      isExpanded: true,
      createdAt: new Date().toISOString(),
    }
    sessionStore.saveFolder(folder)
    return folder
  })

  ipcMain.handle('folder:update', (_, { id, updates }: { id: string; updates: any }) => {
    sessionStore.updateFolder(id, updates)
  })

  ipcMain.handle('folder:delete', (_, id: string) => {
    sessionStore.deleteFolder(id)
  })

  // ============ Process Lifecycle ============

  ipcMain.handle('process:kill', (_, processId: string) => {
    claudeManager.kill(processId)
  })

  ipcMain.handle('process:sendInput', (_, { processId, input }: { processId: string; input: string }) => {
    claudeManager.sendInput(processId, input)
  })

  ipcMain.handle('process:respondPermission', (_, { processId, allow }: { processId: string; allow: boolean }) => {
    claudeManager.sendPermissionResponse(processId, allow)
  })

  // ============ Settings ============

  ipcMain.handle('settings:get', () => {
    return sessionStore.getSettings()
  })

  ipcMain.handle('settings:update', (_, updates) => {
    sessionStore.updateSettings(updates)
    // Apply window opacity if it was updated
    if (updates.windowOpacity !== undefined) {
      win.setOpacity(updates.windowOpacity)
    }
  })

  // ============ Dialog ============

  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // ============ File Operations ============

  ipcMain.handle('files:search', async (_, cwd: string, query: string) => {
    const results: { name: string; path: string; isDirectory: boolean }[] = []
    const maxResults = 50
    const searchQuery = query.toLowerCase()

    const searchDir = async (dir: string, relativePath: string = '') => {
      if (results.length >= maxResults) return

      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          if (results.length >= maxResults) break

          // Skip hidden files and common non-relevant directories
          if (entry.name.startsWith('.')) continue
          if (['node_modules', 'dist', 'build', '__pycache__', '.git'].includes(entry.name)) continue

          const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
          const entryFullPath = path.join(dir, entry.name)

          // Match if query is empty or name contains query
          if (!searchQuery || entry.name.toLowerCase().includes(searchQuery)) {
            results.push({
              name: entry.name,
              path: entryRelPath,
              isDirectory: entry.isDirectory(),
            })
          }

          // Recurse into directories (limited depth)
          if (entry.isDirectory() && relativePath.split('/').length < 4) {
            await searchDir(entryFullPath, entryRelPath)
          }
        }
      } catch (e) {
        // Ignore permission errors
      }
    }

    await searchDir(cwd)

    // Sort: directories first, then by relevance (starts with query > contains query)
    return results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      const aStarts = a.name.toLowerCase().startsWith(searchQuery)
      const bStarts = b.name.toLowerCase().startsWith(searchQuery)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  })

  // ============ Sound Settings ============

  ipcMain.handle('sounds:getAll', () => {
    return soundHooks.getSounds()
  })

  ipcMain.handle('sounds:getConfig', () => {
    return soundHooks.getConfig()
  })

  ipcMain.handle('sounds:play', async (_, soundPath: string) => {
    return soundHooks.playSound(soundPath)
  })

  ipcMain.handle('sounds:import', (_, filePath: string) => {
    return soundHooks.importSound(filePath)
  })

  ipcMain.handle('sounds:saveConfig', (_, config: soundHooks.SoundSettings) => {
    return soundHooks.saveConfig(config)
  })

  ipcMain.handle('sounds:openFolder', () => {
    soundHooks.openSoundsFolder()
  })

  ipcMain.handle('sounds:delete', (_, soundPath: string) => {
    return soundHooks.deleteSound(soundPath)
  })

  // ============ Notifications ============

  ipcMain.handle('notification:show', (_, { title, body }: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      const notification = new Notification({ title, body })
      notification.show()
      return { success: true }
    }
    return { success: false, error: 'Notifications not supported' }
  })

  // ============ Claude Process Events → Renderer ============

  claudeManager.on('data', ({ processId, sessionId, data }) => {
    win.webContents.send('claude:data', { processId, sessionId, data })
  })

  claudeManager.on('exit', ({ processId, sessionId, exitCode }) => {
    win.webContents.send('claude:exit', { processId, sessionId, exitCode })

    // Update session state
    const session = sessionStore.getSession(sessionId)
    if (session) {
      session.state = 'idle'
      session.processId = undefined
      sessionStore.saveSession(session)
    }
  })
}
