import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowUp, Square, Zap, FileText, Wand2, Clock, Image, X, Paperclip } from 'lucide-react'
import { useSessionStore, type ImageAttachment } from '../../stores/sessionStore'
import { MentionAutocomplete } from './MentionAutocomplete'
import { SlashCommandAutocomplete } from './SlashCommandAutocomplete'

type ClaudeMode = 'default' | 'plan' | 'auto'

const MODES: { id: ClaudeMode; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'default', label: 'Default', icon: Zap, description: 'Ask for permissions' },
  { id: 'plan', label: 'Plan', icon: FileText, description: 'Plan before executing' },
  { id: 'auto', label: 'Auto', icon: Wand2, description: 'Fully autonomous' },
]

export function MessageInput() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ClaudeMode>('default')
  const [mentionState, setMentionState] = useState<{
    isOpen: boolean
    query: string
    position: { top: number; left: number }
    startIndex: number
  } | null>(null)
  const [slashState, setSlashState] = useState<{
    isOpen: boolean
    query: string
  } | null>(null)
  const [images, setImages] = useState<ImageAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const session = useSessionStore((s) =>
    activeSessionId ? s.sessions[activeSessionId] : null
  )
  const sendMessage = useSessionStore((s) => s.sendMessage)
  const queueMessage = useSessionStore((s) => s.queueMessage)
  const clearQueuedMessage = useSessionStore((s) => s.clearQueuedMessage)

  const isRunning = session?.state === 'running'
  const hasQueuedMessage = !!session?.queuedMessage
  const canSend = input.trim() || images.length > 0

  // Clean up image preview URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
  }, [])

  const addImages = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    )

    const newImages: ImageAttachment[] = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }))

    setImages((prev) => [...prev, ...newImages])
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (img) URL.revokeObjectURL(img.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageItems = Array.from(items).filter((item) =>
      item.type.startsWith('image/')
    )

    if (imageItems.length > 0) {
      e.preventDefault()
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null)
      addImages(files)
    }
  }, [addImages])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      addImages(files)
    }
  }, [addImages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  // Focus textarea when session changes
  useEffect(() => {
    if (session && !isRunning) {
      textareaRef.current?.focus()
    }
  }, [session?.id, isRunning])

  // Detect @ mentions and /commands
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart

    setInput(value)

    // Check for @ trigger
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/)

    if (atMatch) {
      const query = atMatch[1]
      const startIndex = cursorPos - query.length - 1 // -1 for the @

      // Calculate position for autocomplete
      if (containerRef.current && textareaRef.current) {
        setMentionState({
          isOpen: true,
          query,
          position: { top: 50, left: 16 },
          startIndex,
        })
      }
      setSlashState(null)
    } else {
      setMentionState(null)

      // Check for / trigger at start of input
      const slashMatch = value.match(/^\/(\S*)$/)
      if (slashMatch) {
        setSlashState({
          isOpen: true,
          query: slashMatch[1],
        })
      } else {
        setSlashState(null)
      }
    }
  }, [])

  const handleMentionSelect = useCallback((path: string) => {
    if (!mentionState) return

    // Replace the @query with the selected file path
    const before = input.slice(0, mentionState.startIndex)
    const after = input.slice(mentionState.startIndex + mentionState.query.length + 1)
    const newInput = `${before}@${path} ${after}`

    setInput(newInput)
    setMentionState(null)

    // Focus back on textarea
    textareaRef.current?.focus()
  }, [input, mentionState])

  const handleSlashSelect = useCallback((command: string) => {
    // Replace input with the command
    setInput(`/${command} `)
    setSlashState(null)
    textareaRef.current?.focus()
  }, [])

  const cycleMode = useCallback(() => {
    setMode((current) => {
      const currentIndex = MODES.findIndex((m) => m.id === current)
      const nextIndex = (currentIndex + 1) % MODES.length
      return MODES[nextIndex].id
    })
  }, [])

  const handleSubmit = async () => {
    if (!canSend || !session) return

    const message = input.trim()
    const imagesToSend = [...images]

    // Clear input and images immediately
    setInput('')
    setImages([])
    setMentionState(null)

    // If running, queue the message instead
    if (isRunning) {
      queueMessage(session.id, message)
      return
    }

    await sendMessage(session.id, message, imagesToSend.length > 0 ? imagesToSend : undefined)
  }

  const handleStop = async () => {
    if (session?.processId) {
      await window.applaude.process.kill(session.processId)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Shift+Tab cycles through modes
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      cycleMode()
      return
    }

    // Don't submit if mention autocomplete is open
    if (mentionState?.isOpen && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      return // Let MentionAutocomplete handle these
    }

    // Don't submit if slash command autocomplete is open
    if (slashState?.isOpen && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      return // Let SlashCommandAutocomplete handle these
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }

    if (e.key === 'Escape') {
      if (mentionState) setMentionState(null)
      if (slashState) setSlashState(null)
    }
  }

  if (!session) return null

  return (
    <div className="border-t border-neutral-800/50 p-4 flex-shrink-0 bg-neutral-950/50">
      <div className="max-w-3xl mx-auto">
        {/* Queued message indicator */}
        {hasQueuedMessage && (
          <div className="mb-2 px-3 py-2 bg-amber-900/20 border border-amber-700/30 rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-amber-400">Message queued - will send when agent finishes</span>
            <button
              onClick={() => clearQueuedMessage(session.id)}
              className="ml-auto text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          className={`relative bg-neutral-900 rounded-2xl border transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-neutral-800/50 focus-within:border-neutral-700'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 rounded-2xl z-10 pointer-events-none">
              <div className="flex items-center gap-2 text-blue-400">
                <Image className="w-5 h-5" />
                <span>Drop images here</span>
              </div>
            </div>
          )}

          {/* Mention autocomplete */}
          {mentionState?.isOpen && session && (
            <MentionAutocomplete
              query={mentionState.query}
              cwd={session.cwd}
              position={mentionState.position}
              onSelect={handleMentionSelect}
              onClose={() => setMentionState(null)}
            />
          )}

          {/* Slash command autocomplete */}
          {slashState?.isOpen && (
            <SlashCommandAutocomplete
              query={slashState.query}
              onSelect={handleSlashSelect}
              onClose={() => setSlashState(null)}
            />
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex gap-2 p-2 pt-3 pl-3 flex-wrap">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative group w-16 h-16 rounded-lg overflow-hidden bg-neutral-800"
                >
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-neutral-900/80 rounded-full
                               opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-neutral-300" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mode indicator */}
          <div className={`absolute left-3 ${images.length > 0 ? 'top-[76px]' : 'top-3'}`}>
            <button
              onClick={cycleMode}
              className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-800/80 hover:bg-neutral-700/80
                         rounded text-[10px] text-neutral-400 transition-colors"
              title="Shift+Tab to change mode"
            >
              {(() => {
                const currentMode = MODES.find((m) => m.id === mode)
                const Icon = currentMode?.icon || Zap
                return (
                  <>
                    <Icon className="w-3 h-3" />
                    <span>{currentMode?.label}</span>
                  </>
                )
              })()}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                addImages(e.target.files)
                e.target.value = ''
              }
            }}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isRunning ? 'Type to queue message...' : 'Message Claude... (@ for files, / for commands)'}
            className={`input-scrollbar w-full bg-transparent pl-4 pb-3 pr-14
                       text-neutral-100 placeholder-neutral-500 resize-none
                       focus:outline-none
                       min-h-[56px] max-h-[200px]
                       ${images.length > 0 ? 'pt-3' : 'pt-9'}`}
            rows={1}
          />

          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-neutral-500 hover:text-neutral-300 transition-colors"
              title="Attach images"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {isRunning ? (
              <button
                onClick={handleStop}
                className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
                title="Stop"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                className="p-1.5 bg-neutral-100 hover:bg-white disabled:bg-neutral-700 disabled:opacity-50
                           disabled:cursor-not-allowed rounded-full transition-colors"
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 text-neutral-900 disabled:text-neutral-500" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        {session.metadata.totalCostUsd !== undefined && session.metadata.totalCostUsd > 0 && (
          <div className="mt-2 text-right text-xs text-neutral-600 px-1">
            ${session.metadata.totalCostUsd.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  )
}
