import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setupIpcHandlers } from './ipc-handlers'
import { ClaudeProcessManager } from './claude-process'
import { SessionStore } from './session-store'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let win: BrowserWindow | null = null
let claudeManager: ClaudeProcessManager
let sessionStore: SessionStore

function createWindow() {
  sessionStore = new SessionStore()
  claudeManager = new ClaudeProcessManager()

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Show window when ready and apply saved settings
  win.once('ready-to-show', () => {
    const settings = sessionStore.getSettings()
    if (settings.windowOpacity !== undefined && settings.windowOpacity < 1) {
      win?.setOpacity(settings.windowOpacity)
    }
    win?.show()
  })

  // Setup IPC handlers
  setupIpcHandlers(ipcMain, claudeManager, sessionStore, win)

  // Load app
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // Uncomment to debug: win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  claudeManager?.killAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  claudeManager?.killAll()
})
