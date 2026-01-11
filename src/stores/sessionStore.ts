import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Session, Message, ContentBlock, ClaudeStreamMessage, TodoItem, SessionFolder } from '../types'
import {
  isSystemInit,
  isAssistantMessage,
  isUserMessage,
  isResult,
  isTextContent,
  isToolUseContent,
  isStreamEvent,
  isPermissionRequest,
  isInputRequest,
  isCompactionEvent,
  isAskUserQuestionToolUse,
  type AskUserQuestionInput,
} from '../types/claude'

// Image attachment from the renderer
export interface ImageAttachment {
  id: string
  file: File
  previewUrl: string
  name: string
}

interface SessionState {
  sessions: Record<string, Session>
  folders: Record<string, SessionFolder>
  activeSessionId: string | null
  streamBuffers: Record<string, string>
  isLoading: boolean

  // Actions
  loadSessions: () => Promise<void>
  loadFolders: () => Promise<void>
  createSession: (cwd?: string, title?: string, folderId?: string) => Promise<Session>
  sendMessage: (sessionId: string, message: string, images?: ImageAttachment[]) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  setActiveSession: (id: string | null) => void
  updateSessionTitle: (id: string, title: string) => Promise<void>

  // Stream handling
  appendStreamData: (sessionId: string, data: string) => void
  handleProcessExit: (sessionId: string) => void

  // Content expansion
  toggleContentExpansion: (sessionId: string, messageId: string, blockId: string) => void

  // Interactive responses
  respondToPermission: (sessionId: string, allow: boolean) => Promise<void>
  respondToInput: (sessionId: string, value: string) => Promise<void>

  // Queued messages
  queueMessage: (sessionId: string, message: string) => void
  clearQueuedMessage: (sessionId: string) => void

  // Folder management
  createFolder: (name: string, defaultCwd?: string) => Promise<SessionFolder>
  updateFolder: (id: string, updates: Partial<SessionFolder>) => void
  deleteFolder: (id: string) => Promise<void>
  moveSessionToFolder: (sessionId: string, folderId: string | null) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: {},
  folders: {},
  activeSessionId: null,
  streamBuffers: {},
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true })
    try {
      const sessions = await window.applaude.session.getAll()
      const sessionsMap: Record<string, Session> = {}
      sessions.forEach((s) => {
        sessionsMap[s.id] = {
          ...s,
          messages: s.messages.map((m) => ({
            ...m,
            contentBlocks: parseContentBlocks(m.raw as ClaudeStreamMessage),
          })),
          todos: (s as Session).todos || [],
        }
      })
      set({ sessions: sessionsMap })
    } finally {
      set({ isLoading: false })
    }
  },

  loadFolders: async () => {
    const folders = await window.applaude.folder.getAll()
    const foldersMap: Record<string, SessionFolder> = {}
    folders.forEach((f) => {
      foldersMap[f.id] = f
    })
    set({ folders: foldersMap })
  },

  createSession: async (cwd, title, folderId) => {
    // If folderId is provided and no cwd, use folder's default cwd
    let finalCwd = cwd
    if (!finalCwd && folderId) {
      const folder = get().folders[folderId]
      if (folder?.defaultCwd) {
        finalCwd = folder.defaultCwd
      }
    }

    const session = await window.applaude.session.create({ cwd: finalCwd, title })
    const fullSession: Session = {
      ...session,
      folderId,
      messages: [],
      todos: [],
      pendingQuestion: undefined,
    }
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: fullSession },
      activeSessionId: session.id,
    }))

    // Update folderId in backend if provided
    if (folderId) {
      get().moveSessionToFolder(session.id, folderId)
    }

    return fullSession
  },

  sendMessage: async (sessionId, message, images) => {
    const session = get().sessions[sessionId]
    if (!session) return

    // Auto-update session title from each message (like Claude Code)
    // Take first line or first 50 chars, whichever is shorter
    const firstLine = message.split('\n')[0].trim()
    const autoTitle = firstLine.length > 50
      ? firstLine.slice(0, 50).trim() + '...'
      : firstLine

    // Only update if the title would actually change
    if (autoTitle && autoTitle !== session.title) {
      get().updateSessionTitle(sessionId, autoTitle)
    }

    // Convert images to base64 for sending to backend
    let imageData: { data: string; name: string }[] | undefined
    if (images && images.length > 0) {
      imageData = await Promise.all(
        images.map(async (img) => {
          const buffer = await img.file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          return {
            data: base64,
            name: img.name,
          }
        })
      )
    }

    // Build display text for user message (include image count if any)
    const displayText = images && images.length > 0
      ? `${message}${message ? '\n' : ''}[${images.length} image${images.length > 1 ? 's' : ''} attached]`
      : message

    // Add user message to local state immediately
    const userMessage: Message = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'user',
      raw: { type: 'user_input', content: message, imageCount: images?.length || 0 },
      contentBlocks: [
        {
          id: uuidv4(),
          type: 'text',
          content: { type: 'text', text: displayText },
          isExpanded: true,
        },
      ],
    }

    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          messages: [...state.sessions[sessionId].messages, userMessage],
          state: 'running',
          pendingQuestion: undefined, // Clear pending question when user sends message
        },
      },
    }))

    // Persist user message
    window.applaude.session.appendMessage(sessionId, {
      id: userMessage.id,
      timestamp: userMessage.timestamp,
      type: userMessage.type,
      raw: userMessage.raw,
    })

    // Send to backend
    const { processId } = await window.applaude.session.sendMessage(sessionId, message, imageData)

    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          processId,
        },
      },
    }))
  },

  deleteSession: async (id) => {
    await window.applaude.session.delete(id)
    set((state) => {
      const { [id]: _, ...remaining } = state.sessions
      return {
        sessions: remaining,
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
      }
    })
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id })
    window.applaude.session.setActive(id)
  },

  updateSessionTitle: async (id, title) => {
    await window.applaude.session.updateTitle(id, title)
    set((state) => ({
      sessions: {
        ...state.sessions,
        [id]: { ...state.sessions[id], title },
      },
    }))
  },

  appendStreamData: (sessionId, data) => {
    const { streamBuffers } = get()
    const buffer = (streamBuffers[sessionId] || '') + data

    // Split by newlines and process complete JSON lines
    const lines = buffer.split('\n')
    const incomplete = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const parsed = JSON.parse(trimmed) as ClaudeStreamMessage
        processStreamMessage(sessionId, parsed, set, get)
      } catch {
        // Not valid JSON, might be partial or non-JSON output
        // console.debug('Non-JSON output:', trimmed.slice(0, 100))
      }
    }

    set((state) => ({
      streamBuffers: { ...state.streamBuffers, [sessionId]: incomplete },
    }))
  },

  handleProcessExit: (sessionId) => {
    const session = get().sessions[sessionId]
    if (!session) return

    // Keep waiting_input state if there's a pending question
    const newState = session.pendingQuestion ? 'waiting_input' : 'idle'

    // Check for queued message before updating state
    const queuedMessage = session.queuedMessage

    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          state: newState,
          processId: undefined,
          queuedMessage: undefined, // Clear queued message
        },
      },
      streamBuffers: {
        ...state.streamBuffers,
        [sessionId]: '',
      },
    }))

    // Auto-send queued message if there was one and no pending question
    if (queuedMessage && !session.pendingQuestion) {
      // Small delay to ensure state is updated before sending
      setTimeout(() => {
        get().sendMessage(sessionId, queuedMessage)
      }, 100)
    }
  },

  toggleContentExpansion: (sessionId, messageId, blockId) => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      const messages = session.messages.map((msg) => {
        if (msg.id !== messageId) return msg
        return {
          ...msg,
          contentBlocks: msg.contentBlocks.map((block) => {
            if (block.id !== blockId) return block
            return { ...block, isExpanded: !block.isExpanded }
          }),
        }
      })

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, messages },
        },
      }
    })
  },

  respondToPermission: async (sessionId, allow) => {
    const session = get().sessions[sessionId]
    if (!session?.processId) return

    await window.applaude.process.respondPermission(session.processId, allow)

    // Update session state back to running
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          state: 'running',
        },
      },
    }))
  },

  respondToInput: async (sessionId, value) => {
    const session = get().sessions[sessionId]
    if (!session?.processId) return

    await window.applaude.process.sendInput(session.processId, value)

    // Update session state back to running
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          state: 'running',
        },
      },
    }))
  },

  queueMessage: (sessionId, message) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          queuedMessage: message,
        },
      },
    }))
  },

  clearQueuedMessage: (sessionId) => {
    set((state) => ({
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...state.sessions[sessionId],
          queuedMessage: undefined,
        },
      },
    }))
  },

  createFolder: async (name, defaultCwd) => {
    const folder = await window.applaude.folder.create({ name, defaultCwd })
    set((state) => ({
      folders: { ...state.folders, [folder.id]: folder },
    }))
    return folder
  },

  updateFolder: async (id, updates) => {
    await window.applaude.folder.update(id, updates)
    set((state) => ({
      folders: {
        ...state.folders,
        [id]: { ...state.folders[id], ...updates },
      },
    }))
  },

  deleteFolder: async (id) => {
    await window.applaude.folder.delete(id)
    set((state) => {
      const { [id]: _, ...remaining } = state.folders
      return { folders: remaining }
    })
  },

  moveSessionToFolder: (sessionId, folderId) => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            folderId: folderId || undefined,
          },
        },
      }
    })

    // Persist to backend
    window.applaude.session.updateFolder(sessionId, folderId)
  },
}))

// Track streaming state per session
const streamingMessages: Record<string, { messageId: string; text: string }> = {}

// Model context window limits (approximate)
function getModelContextLimit(model?: string): number {
  if (!model) return 200000
  const m = model.toLowerCase()
  if (m.includes('opus')) return 200000
  if (m.includes('sonnet')) return 200000
  if (m.includes('haiku')) return 200000
  return 200000 // Default for Claude models
}

function processStreamMessage(
  sessionId: string,
  msg: ClaudeStreamMessage,
  set: (fn: (state: SessionState) => Partial<SessionState>) => void,
  get: () => SessionState
) {
  const session = get().sessions[sessionId]
  if (!session) return

  // Handle stream events (text deltas)
  if (isStreamEvent(msg)) {
    if (msg.event.type === 'content_block_delta' && msg.event.delta?.type === 'text_delta') {
      const deltaText = msg.event.delta.text

      // Initialize or append to streaming message
      if (!streamingMessages[sessionId]) {
        streamingMessages[sessionId] = {
          messageId: uuidv4(),
          text: deltaText,
        }

        // Add new streaming message
        const newMessage: Message = {
          id: streamingMessages[sessionId].messageId,
          timestamp: new Date().toISOString(),
          type: 'assistant',
          raw: null,
          contentBlocks: [
            {
              id: uuidv4(),
              type: 'text',
              content: { type: 'text', text: deltaText },
              isExpanded: true,
            },
          ],
        }

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId],
              messages: [...state.sessions[sessionId].messages, newMessage],
            },
          },
        }))
      } else {
        // Append to existing streaming message
        streamingMessages[sessionId].text += deltaText

        set((state) => {
          const session = state.sessions[sessionId]
          if (!session) return state

          const messages = session.messages.map((m) => {
            if (m.id === streamingMessages[sessionId].messageId) {
              return {
                ...m,
                contentBlocks: [
                  {
                    ...m.contentBlocks[0],
                    content: { type: 'text', text: streamingMessages[sessionId].text },
                  },
                ],
              }
            }
            return m
          })

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: { ...session, messages },
            },
          }
        })
      }
    }
    return
  }

  // Handle full assistant message (replaces streaming message)
  if (isAssistantMessage(msg)) {
    // Clear streaming state
    delete streamingMessages[sessionId]

    // Find and update streaming message or add new
    const existingStreamingIndex = session.messages.findIndex(
      (m) => m.type === 'assistant' && m.raw === null
    )

    if (existingStreamingIndex >= 0) {
      set((state) => {
        const session = state.sessions[sessionId]
        if (!session) return state

        const messages = [...session.messages]
        messages[existingStreamingIndex] = {
          id: msg.message.id,
          timestamp: new Date().toISOString(),
          type: 'assistant',
          raw: msg,
          contentBlocks: parseContentBlocks(msg),
        }

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              messages,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      })
      return
    }
  }

  // Get the message ID
  const msgId = isAssistantMessage(msg) ? msg.message.id :
                isUserMessage(msg) ? (msg as any).uuid :
                (msg as any).uuid || uuidv4()

  // New message
  const message: Message = {
    id: msgId,
    timestamp: new Date().toISOString(),
    type: msg.type === 'assistant' ? 'assistant' : msg.type === 'user' ? 'user' : msg.type === 'result' ? 'result' : 'system',
    raw: msg,
    contentBlocks: parseContentBlocks(msg),
  }

  // Handle compaction events (update metadata and return early)
  if (isCompactionEvent(msg)) {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            metadata: {
              ...session.metadata,
              contextTokens: msg.compact.tokens_after,
              contextLimit: msg.compact.context_limit,
              compactionCount: (session.metadata.compactionCount || 0) + 1,
            },
          },
        },
      }
    })
    return
  }

  // Update metadata from result messages
  let metadata = { ...session.metadata }
  if (isResult(msg)) {
    // Clear streaming state on result
    delete streamingMessages[sessionId]

    // Update token counts and estimate context usage
    const inputTokens = msg.usage.input_tokens
    metadata = {
      ...metadata,
      totalCostUsd: (metadata.totalCostUsd || 0) + msg.total_cost_usd,
      totalInputTokens: (metadata.totalInputTokens || 0) + inputTokens,
      totalOutputTokens: (metadata.totalOutputTokens || 0) + msg.usage.output_tokens,
      // Use input tokens as proxy for context size (includes conversation history)
      contextTokens: inputTokens,
      // Set default context limit based on model if not already set
      contextLimit: metadata.contextLimit || getModelContextLimit(metadata.model),
    }
  }

  if (isSystemInit(msg)) {
    metadata.model = msg.model
    // Set context limit based on model
    metadata.contextLimit = getModelContextLimit(msg.model)
  }

  // Update session state for interactive requests
  let newState: Session['state'] = session.state
  if (isPermissionRequest(msg)) {
    newState = 'waiting_permission'
  } else if (isInputRequest(msg)) {
    newState = 'waiting_input'
  } else if (isUserMessage(msg)) {
    // Check if this is a pending permission request in tool results
    const results = msg.message?.content || []
    for (const result of results) {
      if (result.content && typeof result.content === 'string') {
        if (result.content.includes("haven't granted it yet") ||
            result.content.includes('requested permission')) {
          newState = 'waiting_permission'
          break
        }
      }
    }
  }

  // Extract todos from TodoWrite tool calls and detect AskUserQuestion
  let todos: TodoItem[] = session.todos || []
  let pendingQuestion = session.pendingQuestion
  if (isAssistantMessage(msg)) {
    for (const block of msg.message.content) {
      if (isToolUseContent(block) && block.name === 'TodoWrite') {
        const input = block.input as { todos?: TodoItem[] }
        if (input.todos && Array.isArray(input.todos)) {
          todos = input.todos.map((t) => ({
            content: t.content,
            status: t.status,
            activeForm: t.activeForm,
          }))
        }
      }
      // Detect AskUserQuestion tool calls
      if (isAskUserQuestionToolUse(block)) {
        const input = block.input as unknown as AskUserQuestionInput
        if (input.questions && Array.isArray(input.questions)) {
          pendingQuestion = {
            toolUseId: block.id,
            questions: input.questions,
          }
          newState = 'waiting_input'
        }
      }
    }
  }

  set((state) => ({
    sessions: {
      ...state.sessions,
      [sessionId]: {
        ...state.sessions[sessionId],
        messages: [...state.sessions[sessionId].messages, message],
        updatedAt: new Date().toISOString(),
        metadata,
        state: newState,
        todos,
        pendingQuestion,
      },
    },
  }))

  // Persist final messages (not partial streaming updates)
  if (isResult(msg) || isSystemInit(msg) || isAssistantMessage(msg)) {
    window.applaude.session.appendMessage(sessionId, {
      id: message.id,
      timestamp: message.timestamp,
      type: message.type,
      raw: msg,
    })
  }
}

function parseContentBlocks(msg: ClaudeStreamMessage): ContentBlock[] {
  if (isSystemInit(msg)) {
    return [
      {
        id: uuidv4(),
        type: 'system_init',
        content: msg,
        isExpanded: false,
      },
    ]
  }

  if (isAssistantMessage(msg)) {
    return msg.message.content.map((block) => {
      const blockType = isTextContent(block) ? 'text' : isToolUseContent(block) ? 'tool_use' : 'thinking'
      // Expand text by default, and Edit/Write tool calls to show code changes
      const isEditTool = isToolUseContent(block) && (block.name === 'Edit' || block.name === 'Write')
      const shouldExpand = isTextContent(block) || isEditTool
      return {
        id: 'id' in block ? block.id : uuidv4(),
        type: blockType,
        content: block,
        isExpanded: shouldExpand,
      }
    })
  }

  if (isUserMessage(msg)) {
    return [
      {
        id: uuidv4(),
        type: 'tool_result',
        content: msg,
        isExpanded: false,
      },
    ]
  }

  if (isResult(msg)) {
    return [
      {
        id: uuidv4(),
        type: 'result',
        content: msg,
        isExpanded: false,
      },
    ]
  }

  // Handle our custom user_input type
  if (msg && typeof msg === 'object' && 'type' in msg && (msg as { type: string }).type === 'user_input') {
    const userInput = msg as unknown as { type: string; content: string }
    return [
      {
        id: uuidv4(),
        type: 'text',
        content: { type: 'text', text: userInput.content },
        isExpanded: true,
      },
    ]
  }

  // Handle permission requests
  if (isPermissionRequest(msg)) {
    return [
      {
        id: uuidv4(),
        type: 'permission_request',
        content: msg,
        isExpanded: true,
      },
    ]
  }

  // Handle input requests (questionnaires)
  if (isInputRequest(msg)) {
    return [
      {
        id: uuidv4(),
        type: 'input_request',
        content: msg,
        isExpanded: true,
      },
    ]
  }

  return []
}
