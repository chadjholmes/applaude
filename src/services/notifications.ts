import type { NotificationSettings, SoundSettings, Session } from '../types'

// Track last state to detect transitions
let lastSessionStates: Record<string, Session['state']> = {}

/**
 * Play a sound file using the Electron API
 */
export async function playSound(soundPath: string | null): Promise<void> {
  if (!soundPath) return
  try {
    await window.applaude.sounds.play(soundPath)
  } catch (e) {
    console.error('Failed to play sound:', e)
  }
}

/**
 * Show a system notification using Electron's native API
 */
export async function showNotification(title: string, body: string): Promise<void> {
  try {
    await window.applaude.notification.show(title, body)
  } catch (e) {
    console.error('Failed to show notification:', e)
  }
}

/**
 * Check session state changes and trigger notifications/sounds
 */
export function checkSessionNotifications(
  session: Session,
  notificationSettings: NotificationSettings,
  soundSettings: SoundSettings | null
): void {
  const prevState = lastSessionStates[session.id]
  const currentState = session.state

  // Update tracked state
  lastSessionStates[session.id] = currentState

  // Skip if no state change or notifications disabled
  if (prevState === currentState || !notificationSettings.enabled) {
    return
  }

  const events = soundSettings?.events as Record<string, { sound: string | null; enabled: boolean }> | undefined

  // Task complete: running -> idle (without pending question)
  if (prevState === 'running' && currentState === 'idle' && !session.pendingQuestion) {
    if (notificationSettings.onTaskComplete) {
      showNotification('Claude Code', 'Task completed')
      if (events?.idle_prompt?.enabled && events.idle_prompt.sound) {
        playSound(events.idle_prompt.sound)
      }
    }
  }

  // Permission request: any -> waiting_permission
  if (currentState === 'waiting_permission') {
    if (notificationSettings.onPermissionRequest) {
      showNotification('Claude Code', 'Permission required')
      if (events?.permission_prompt?.enabled && events.permission_prompt.sound) {
        playSound(events.permission_prompt.sound)
      }
    }
  }

  // Input request: any -> waiting_input
  if (currentState === 'waiting_input') {
    if (notificationSettings.onInputRequest) {
      showNotification('Claude Code', 'Input requested')
      if (events?.elicitation_dialog?.enabled && events.elicitation_dialog.sound) {
        playSound(events.elicitation_dialog.sound)
      }
    }
  }
}

/**
 * Clear tracked states (call when session is deleted)
 */
export function clearSessionState(sessionId: string): void {
  delete lastSessionStates[sessionId]
}
