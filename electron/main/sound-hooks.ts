import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { shell } from 'electron'

// Paths
const CLAUDE_DIR = path.join(process.env.HOME || '', '.claude')
const SOUNDS_DIR = path.join(CLAUDE_DIR, 'sounds')
const SAMPLES_DIR = path.join(SOUNDS_DIR, 'samples')
const HOOKS_DIR = path.join(CLAUDE_DIR, 'hooks')
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json')

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

const DEFAULT_CONFIG: SoundSettings = {
  events: {
    permission_prompt: { enabled: true, sound: null, notification: true, title: 'Claude Code', subtitle: 'Action Required' },
    idle_prompt: { enabled: true, sound: null, notification: true, title: 'Claude Code', subtitle: 'Waiting' },
    auth_success: { enabled: false, sound: null, notification: true, title: 'Claude Code', subtitle: 'Authenticated' },
    elicitation_dialog: { enabled: false, sound: null, notification: true, title: 'Claude Code', subtitle: 'Input Needed' },
    SessionStart: { enabled: false, sound: null, notification: true, title: 'Claude Code', subtitle: 'Session Started' },
    SessionEnd: { enabled: false, sound: null, notification: true, title: 'Claude Code', subtitle: 'Session Ended' }
  }
}

/**
 * Get all available sounds (system, samples, custom)
 */
export function getSounds(): SoundFile[] {
  const sounds: SoundFile[] = []

  // Add system sounds option
  sounds.push({
    name: 'System Default (Tink)',
    path: '/System/Library/Sounds/Tink.aiff',
    isSystem: true
  })

  // Get samples
  if (fs.existsSync(SAMPLES_DIR)) {
    const samples = fs.readdirSync(SAMPLES_DIR)
      .filter(f => /\.(mp3|aiff|wav|m4a)$/i.test(f))
      .map(f => ({
        name: path.basename(f, path.extname(f)).replace(/-/g, ' '),
        path: path.join(SAMPLES_DIR, f),
        isCustom: false
      }))
    sounds.push(...samples)
  }

  // Get custom sounds in root sounds dir
  if (fs.existsSync(SOUNDS_DIR)) {
    const rootSounds = fs.readdirSync(SOUNDS_DIR)
      .filter(f => /\.(mp3|aiff|wav|m4a)$/i.test(f))
      .map(f => ({
        name: path.basename(f, path.extname(f)).replace(/-/g, ' '),
        path: path.join(SOUNDS_DIR, f),
        isCustom: true
      }))
    sounds.push(...rootSounds)
  }

  return sounds
}

/**
 * Get current sound configuration from Claude Code settings
 */
export function getConfig(): SoundSettings {
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) // Deep clone

  if (!fs.existsSync(SETTINGS_FILE)) {
    return config
  }

  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
    const hooks = settings.hooks || {}

    // Check Notification hooks and extract script paths
    const notificationHooks = hooks.Notification || []
    for (const hook of notificationHooks) {
      if (hook.matcher && config.events[hook.matcher]) {
        config.events[hook.matcher].enabled = true

        // Extract script path from hook config
        const commandHook = hook.hooks?.find((h: { type: string }) => h.type === 'command')
        if (commandHook?.command) {
          const scriptPath = commandHook.command.replace('~', process.env.HOME || '')
          if (fs.existsSync(scriptPath)) {
            const script = fs.readFileSync(scriptPath, 'utf8')
            const soundMatch = script.match(/CUSTOM_SOUND="([^"]+)"/)
            if (soundMatch) {
              config.events[hook.matcher].sound = soundMatch[1].replace('$HOME', process.env.HOME || '')
            }
            // Extract title and subtitle
            const titleMatch = script.match(/-title "([^"]+)"/)
            const subtitleMatch = script.match(/-subtitle "([^"]+)"/)
            if (titleMatch) config.events[hook.matcher].title = titleMatch[1]
            if (subtitleMatch) config.events[hook.matcher].subtitle = subtitleMatch[1]
            // Check if notification is disabled
            if (script.includes('# Notifications disabled')) {
              config.events[hook.matcher].notification = false
            }
          }
        }
      }
    }

    // Check SessionStart/SessionEnd
    for (const sessionEvent of ['SessionStart', 'SessionEnd']) {
      if (hooks[sessionEvent]?.length) {
        config.events[sessionEvent].enabled = true
        const commandHook = hooks[sessionEvent][0]?.hooks?.find((h: { type: string }) => h.type === 'command')
        if (commandHook?.command) {
          const scriptPath = commandHook.command.replace('~', process.env.HOME || '')
          if (fs.existsSync(scriptPath)) {
            const script = fs.readFileSync(scriptPath, 'utf8')
            const soundMatch = script.match(/CUSTOM_SOUND="([^"]+)"/)
            if (soundMatch) {
              config.events[sessionEvent].sound = soundMatch[1].replace('$HOME', process.env.HOME || '')
            }
            const titleMatch = script.match(/-title "([^"]+)"/)
            const subtitleMatch = script.match(/-subtitle "([^"]+)"/)
            if (titleMatch) config.events[sessionEvent].title = titleMatch[1]
            if (subtitleMatch) config.events[sessionEvent].subtitle = subtitleMatch[1]
            if (script.includes('# Notifications disabled')) {
              config.events[sessionEvent].notification = false
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading sound config:', e)
  }

  return config
}

/**
 * Play a sound file for preview
 */
export function playSound(soundPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`afplay "${soundPath}"`, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

/**
 * Import a custom sound file
 */
export function importSound(filePath: string): SoundFile {
  const fileName = path.basename(filePath)
  const destPath = path.join(SAMPLES_DIR, fileName)

  // Ensure samples dir exists
  if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR, { recursive: true })
  }

  fs.copyFileSync(filePath, destPath)
  return {
    name: path.basename(fileName, path.extname(fileName)).replace(/-/g, ' '),
    path: destPath,
    isCustom: true
  }
}

/**
 * Generate a bash script for an event
 */
function generateScript(eventName: string, eventConfig: SoundEventConfig): string {
  const defaultSound = '/System/Library/Sounds/Tink.aiff'
  const customSound = eventConfig.sound || defaultSound
  const title = eventConfig.title || 'Claude Code'
  const subtitle = eventConfig.subtitle || eventName
  const showNotification = eventConfig.notification !== false

  const soundSection = `
# Play sound
CUSTOM_SOUND="${customSound.replace(process.env.HOME || '', '$HOME')}"
DEFAULT_SOUND="${defaultSound}"

if [ -f "$CUSTOM_SOUND" ]; then
  afplay "$CUSTOM_SOUND"
else
  afplay "$DEFAULT_SOUND"
fi`

  const notificationSection = showNotification ? `
# Send notification
terminal-notifier \\
  -title "${title}" \\
  -subtitle "${subtitle}" \\
  -message "$MESSAGE" \\
  -sender "com.claude.notify" \\
  2>/dev/null` : `
# Notifications disabled for this event`

  return `#!/bin/bash
# Auto-generated by Applaude Sound Settings
# Event: ${eventName}

# Read JSON input from Claude Code
INPUT=$(cat)

# Extract the message from JSON
MESSAGE=$(echo "$INPUT" | jq -r '.message // empty' 2>/dev/null)

if [ -z "$MESSAGE" ] || [ "$MESSAGE" = "null" ]; then
  MESSAGE="${subtitle}"
fi
${soundSection}
${notificationSection}

exit 0
`
}

/**
 * Save sound configuration and generate hook scripts
 */
export function saveConfig(config: SoundSettings): { success: boolean } {
  // Ensure directories exist
  if (!fs.existsSync(HOOKS_DIR)) fs.mkdirSync(HOOKS_DIR, { recursive: true })
  if (!fs.existsSync(SOUNDS_DIR)) fs.mkdirSync(SOUNDS_DIR, { recursive: true })

  // Read current settings
  let settings: Record<string, unknown> = {}
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
    } catch (e) {
      console.error('Error reading settings file:', e)
    }
  }

  // Initialize hooks structure
  const hooks: Record<string, unknown[]> = (settings.hooks as Record<string, unknown[]>) || {}
  hooks.Notification = []
  delete hooks.SessionStart
  delete hooks.SessionEnd

  const notificationMatchers = ['permission_prompt', 'idle_prompt', 'auth_success', 'elicitation_dialog']
  const sessionEvents = ['SessionStart', 'SessionEnd']

  // Generate hooks and scripts for each event
  for (const [eventName, eventConfig] of Object.entries(config.events)) {
    if (!eventConfig.enabled) continue

    const scriptName = `${eventName.replace('_', '-')}-sound.sh`
    const scriptPath = path.join(HOOKS_DIR, scriptName)

    // Generate the shell script
    const script = generateScript(eventName, eventConfig)
    fs.writeFileSync(scriptPath, script, { mode: 0o755 })

    // Add to settings
    const hookEntry = {
      hooks: [{ type: 'command', command: `~/.claude/hooks/${scriptName}` }]
    } as Record<string, unknown>

    if (notificationMatchers.includes(eventName)) {
      hookEntry.matcher = eventName
      hooks.Notification.push(hookEntry)
    } else if (sessionEvents.includes(eventName)) {
      hooks[eventName] = [hookEntry]
    }
  }

  settings.hooks = hooks

  // Write settings
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))

  return { success: true }
}

/**
 * Open sounds folder in Finder
 */
export function openSoundsFolder(): void {
  if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true })
  }
  shell.openPath(SOUNDS_DIR)
}

/**
 * Delete a custom sound file
 */
export function deleteSound(soundPath: string): { success: boolean; error?: string } {
  if (fs.existsSync(soundPath) && soundPath.includes('.claude/sounds')) {
    fs.unlinkSync(soundPath)
    return { success: true }
  }
  return { success: false, error: 'Cannot delete this sound' }
}
