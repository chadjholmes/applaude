import { useState, useEffect } from 'react'
import { X, Bell, BellOff, Folder, Play, AlertCircle } from 'lucide-react'
import { useUIStore } from '../stores/uiStore'
import type { Settings, NotificationSettings, ThemeSettings, SoundFile, SoundSettings, SoundEventConfig } from '../types'

interface SettingsViewProps {
  onClose: () => void
}

const defaultNotifications: NotificationSettings = {
  enabled: true,
  onTaskComplete: true,
  onPermissionRequest: true,
  onInputRequest: true,
  onError: true,
  sound: false,
}

const defaultTheme: ThemeSettings = {
  tint: 'neutral',
  glow: true,
  texture: true,
  blur: 'subtle',
  fontSize: 'sm',
}


export function SettingsView({ onClose }: SettingsViewProps) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const setGlobalTheme = useUIStore((s) => s.setTheme)

  // Sound settings state
  const [sounds, setSounds] = useState<SoundFile[]>([])
  const [soundConfig, setSoundConfig] = useState<SoundSettings | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    window.applaude.settings.get().then((s) => {
      setSettings({
        ...s,
        notifications: s.notifications || defaultNotifications,
        theme: s.theme || defaultTheme,
      })
      if (s.theme) setGlobalTheme(s.theme)
    })

    Promise.all([
      window.applaude.sounds.getAll(),
      window.applaude.sounds.getConfig()
    ]).then(([soundList, config]) => {
      setSounds(soundList)
      setSoundConfig(config)
    })

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [setGlobalTheme])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') {
        showToast('Notifications enabled')
      } else if (permission === 'denied') {
        showToast('Notifications denied')
      }
    }
  }

  const updateSettings = async (updates: Partial<Settings>) => {
    if (!settings) return
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    setIsSaving(true)
    await window.applaude.settings.update(updates)
    setIsSaving(false)
  }

  const updateNotifications = async (updates: Partial<NotificationSettings>) => {
    if (!settings) return
    const newNotifications = { ...settings.notifications, ...updates }
    await updateSettings({ notifications: newNotifications })
  }

  const updateTheme = async (updates: Partial<ThemeSettings>) => {
    if (!settings) return
    const newTheme = { ...(settings.theme || defaultTheme), ...updates }
    setGlobalTheme(newTheme)
    await updateSettings({ theme: newTheme })
  }

  const handleSelectDirectory = async () => {
    const dir = await window.applaude.dialog.selectDirectory()
    if (dir) {
      updateSettings({ defaultCwd: dir })
    }
  }

  const updateSoundEvent = async (eventId: string, updates: Partial<SoundEventConfig>) => {
    if (!soundConfig) return
    const events = soundConfig.events as Record<string, SoundEventConfig>
    const newConfig = {
      ...soundConfig,
      events: {
        ...events,
        [eventId]: { ...events[eventId], ...updates }
      } as SoundSettings['events']
    }
    setSoundConfig(newConfig)
    // Auto-save to Claude Code hooks
    try {
      await window.applaude.sounds.saveConfig(newConfig)
    } catch (e) {
      console.error('Failed to save sound config:', e)
    }
  }

  const handlePlaySound = async (soundPath: string) => {
    try {
      await window.applaude.sounds.play(soundPath)
    } catch (e) {
      console.error('Failed to play sound:', e)
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  // Group sounds
  const systemSounds = sounds.filter(s => s.isSystem)
  const sampleSounds = sounds.filter(s => !s.isSystem && !s.isCustom)
  const customSounds = sounds.filter(s => s.isCustom)

  const renderSoundSelect = (value: string | null, onChange: (v: string | null) => void, showPlay = true) => (
    <div className="flex items-center gap-1.5">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex-1 px-2 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-neutral-300"
      >
        <option value="">None</option>
        {systemSounds.length > 0 && (
          <optgroup label="System">
            {systemSounds.map(s => <option key={s.path} value={s.path}>{s.name}</option>)}
          </optgroup>
        )}
        {sampleSounds.length > 0 && (
          <optgroup label="Samples">
            {sampleSounds.map(s => <option key={s.path} value={s.path}>{s.name}</option>)}
          </optgroup>
        )}
        {customSounds.length > 0 && (
          <optgroup label="Custom">
            {customSounds.map(s => <option key={s.path} value={s.path}>{s.name}</option>)}
          </optgroup>
        )}
      </select>
      {showPlay && value && (
        <button
          onClick={() => handlePlaySound(value)}
          className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
          title="Preview"
        >
          <Play className="w-3 h-3" />
        </button>
      )}
    </div>
  )

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <h2 className="text-sm font-medium text-neutral-200">Settings</h2>
        <button
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
        {/* General */}
        <section>
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">General</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-neutral-500 block mb-1.5">Default Working Directory</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.defaultCwd || ''}
                  readOnly
                  className="flex-1 px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded text-neutral-300 font-mono"
                />
                <button
                  onClick={handleSelectDirectory}
                  className="px-2 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors"
                >
                  <Folder className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1.5">Default Model</label>
              <select
                value={settings.defaultModel || 'sonnet'}
                onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded text-neutral-300"
              >
                <option value="sonnet">Claude Sonnet 4.5</option>
                <option value="opus">Claude Opus 4.5</option>
                <option value="haiku">Claude Haiku 3.5</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1.5">Default Permission Mode</label>
              <select
                value={settings.defaultPermissionMode || 'default'}
                onChange={(e) => updateSettings({ defaultPermissionMode: e.target.value })}
                className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded text-neutral-300"
              >
                <option value="default">Default (Ask for permissions)</option>
                <option value="accept-edits">Accept Edits</option>
                <option value="full-auto">Full Auto</option>
              </select>
            </div>
          </div>
        </section>

        {/* Theme */}
        <section>
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">Appearance</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-neutral-500 block mb-1.5">Window Transparency</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.8"
                  max="1"
                  step="0.01"
                  value={settings.windowOpacity ?? 1}
                  onChange={(e) => updateSettings({ windowOpacity: parseFloat(e.target.value) })}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                <span className="text-xs text-neutral-400 w-10 text-right">
                  {Math.round((settings.windowOpacity ?? 1) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-2">Accent</label>
              <div className="flex gap-2">
                {['neutral', 'blue', 'purple', 'emerald', 'rose', 'amber'].map((t) => (
                  <button
                    key={t}
                    onClick={() => updateTheme({ tint: t as ThemeSettings['tint'] })}
                    className={`w-6 h-6 rounded-full border transition-all ${
                      (settings.theme?.tint || 'neutral') === t
                        ? 'border-white scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                  >
                    <div className={`w-full h-full rounded-full ${
                      t === 'neutral' ? 'bg-neutral-500' :
                      t === 'blue' ? 'bg-blue-500' :
                      t === 'purple' ? 'bg-purple-500' :
                      t === 'emerald' ? 'bg-emerald-500' :
                      t === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-neutral-500">Font Size</label>
              <div className="flex gap-1">
                {['xs', 'sm', 'base', 'lg'].map((size) => (
                  <button
                    key={size}
                    onClick={() => updateTheme({ fontSize: size as ThemeSettings['fontSize'] })}
                    className={`w-7 h-7 text-xs rounded transition-colors ${
                      (settings.theme?.fontSize || 'sm') === size
                        ? 'bg-[var(--accent-color)] text-white'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    {size === 'xs' ? 'XS' : size === 'sm' ? 'S' : size === 'base' ? 'M' : 'L'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">Notifications</h3>
          <div className="space-y-3">
            {notificationPermission !== 'granted' && (
              <button
                onClick={requestNotificationPermission}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-amber-900/30 border border-amber-800/50 rounded text-amber-400 hover:bg-amber-900/50 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {notificationPermission === 'denied'
                  ? 'Notifications blocked - check System Preferences'
                  : 'Click to enable notifications'}
              </button>
            )}
            <ToggleRow
              icon={settings.notifications.enabled ? Bell : BellOff}
              label="Enable Notifications"
              checked={settings.notifications.enabled}
              onChange={(checked) => updateNotifications({ enabled: checked })}
            />

            {settings.notifications.enabled && (
              <div className="space-y-3 pl-4 border-l border-neutral-800">
                <NotificationRow
                  label="Task Complete"
                  enabled={settings.notifications.onTaskComplete}
                  onToggle={(v) => updateNotifications({ onTaskComplete: v })}
                  soundSelect={renderSoundSelect(
                    soundConfig?.events?.idle_prompt?.sound || null,
                    (v) => updateSoundEvent('idle_prompt', { sound: v, enabled: !!v })
                  )}
                />
                <NotificationRow
                  label="Permission Request"
                  enabled={settings.notifications.onPermissionRequest}
                  onToggle={(v) => updateNotifications({ onPermissionRequest: v })}
                  soundSelect={renderSoundSelect(
                    soundConfig?.events?.permission_prompt?.sound || null,
                    (v) => updateSoundEvent('permission_prompt', { sound: v, enabled: !!v })
                  )}
                />
                <NotificationRow
                  label="Input Request"
                  enabled={settings.notifications.onInputRequest}
                  onToggle={(v) => updateNotifications({ onInputRequest: v })}
                  soundSelect={renderSoundSelect(
                    soundConfig?.events?.elicitation_dialog?.sound || null,
                    (v) => updateSoundEvent('elicitation_dialog', { sound: v, enabled: !!v })
                  )}
                />
                <NotificationRow
                  label="Error"
                  enabled={settings.notifications.onError}
                  onToggle={(v) => updateNotifications({ onError: v })}
                  soundSelect={renderSoundSelect(
                    soundConfig?.events?.SessionEnd?.sound || null,
                    (v) => updateSoundEvent('SessionEnd', { sound: v, enabled: !!v })
                  )}
                />
              </div>
            )}
          </div>
        </section>

      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-neutral-800 text-center">
        <span className="text-[10px] text-neutral-600">
          {isSaving ? 'Saving...' : 'Auto-saved'}
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg">
          <span className="text-xs text-neutral-200">{toast}</span>
        </div>
      )}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-7 h-4 rounded-full transition-colors relative flex-shrink-0 ${
        checked ? 'bg-[var(--accent-color)]' : 'bg-neutral-700'
      }`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${
          checked ? 'translate-x-3' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

interface ToggleRowProps {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ icon: Icon, label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-neutral-500" />}
        <span className="text-xs text-neutral-300">{label}</span>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

interface NotificationRowProps {
  label: string
  enabled: boolean
  onToggle: (v: boolean) => void
  soundSelect: React.ReactNode
}

function NotificationRow({ label, enabled, onToggle, soundSelect }: NotificationRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">{label}</span>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      {enabled && (
        <div className="pl-0">
          {soundSelect}
        </div>
      )}
    </div>
  )
}
