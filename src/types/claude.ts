// Types based on Claude CLI stream-json output

export interface ClaudeSystemInit {
  type: 'system'
  subtype: 'init'
  cwd: string
  session_id: string
  tools: string[]
  mcp_servers: Array<{ name: string; status: string }>
  model: string
  permissionMode: string
  apiKeySource: string
  claude_code_version: string
}

export interface ClaudeTextContent {
  type: 'text'
  text: string
}

export interface ClaudeToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ClaudeThinkingContent {
  type: 'thinking'
  thinking: string
}

export interface ClaudeToolResultContent {
  type: 'tool_result'
  tool_use_id: string
  content: string
}

export type ClaudeContentBlock =
  | ClaudeTextContent
  | ClaudeToolUseContent
  | ClaudeThinkingContent
  | ClaudeToolResultContent

export interface ClaudeAssistantMessage {
  type: 'assistant'
  message: {
    model: string
    id: string
    type: 'message'
    role: 'assistant'
    content: ClaudeContentBlock[]
    stop_reason: string | null
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  parent_tool_use_id: string | null
  session_id: string
}

export interface ClaudeUserMessage {
  type: 'user'
  message: {
    role: 'user'
    content: ClaudeToolResultContent[]
  }
  parent_tool_use_id: string | null
  session_id: string
}

export interface ClaudeResult {
  type: 'result'
  subtype: 'success' | 'error'
  is_error: boolean
  duration_ms: number
  duration_api_ms: number
  num_turns: number
  result: string
  session_id: string
  total_cost_usd: number
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

export interface ClaudeStreamEvent {
  type: 'stream_event'
  event: {
    type: 'content_block_delta' | 'message_delta' | 'message_stop'
    index?: number
    delta?: {
      type: 'text_delta'
      text: string
    }
  }
  session_id: string
  parent_tool_use_id: string | null
}

// Permission request from Claude CLI
export interface ClaudePermissionRequest {
  type: 'permission_request'
  permission_request: {
    type: string  // e.g., 'tool_use', 'file_write', 'bash'
    tool_name?: string
    description: string
    input?: Record<string, unknown>
  }
  session_id: string
}

// Input request (questionnaire/multiple choice)
export interface ClaudeInputRequest {
  type: 'input_request'
  input_request: {
    type: 'select' | 'text' | 'confirm'
    message: string
    options?: Array<{ label: string; value: string }>
    default?: string
  }
  session_id: string
}

// Progress events for long-running tasks
export interface ClaudeProgressEvent {
  type: 'progress'
  progress: {
    type: 'task' | 'tool'
    message: string
    percentage?: number
  }
  session_id: string
}

// Context compaction event (when context window approaches limit)
export interface ClaudeCompactionEvent {
  type: 'system'
  subtype: 'compact'
  compact: {
    tokens_before: number
    tokens_after: number
    context_limit: number
  }
  session_id: string
}

// Todo item from Claude's TodoWrite tool
export interface ClaudeTodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm?: string
}

export type ClaudeStreamMessage =
  | ClaudeSystemInit
  | ClaudeAssistantMessage
  | ClaudeUserMessage
  | ClaudeResult
  | ClaudeStreamEvent
  | ClaudePermissionRequest
  | ClaudeInputRequest
  | ClaudeProgressEvent
  | ClaudeCompactionEvent

// AskUserQuestion tool input structure
export interface AskUserQuestionInput {
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

// Helper to check if a tool_use is an AskUserQuestion
export function isAskUserQuestionToolUse(block: ClaudeContentBlock): block is ClaudeToolUseContent {
  return block.type === 'tool_use' && (block as ClaudeToolUseContent).name === 'AskUserQuestion'
}

// Helper type guards
export function isSystemInit(msg: ClaudeStreamMessage): msg is ClaudeSystemInit {
  return msg.type === 'system' && 'subtype' in msg && msg.subtype === 'init'
}

export function isAssistantMessage(msg: ClaudeStreamMessage): msg is ClaudeAssistantMessage {
  return msg.type === 'assistant'
}

export function isUserMessage(msg: ClaudeStreamMessage): msg is ClaudeUserMessage {
  return msg.type === 'user'
}

export function isResult(msg: ClaudeStreamMessage): msg is ClaudeResult {
  return msg.type === 'result'
}

export function isTextContent(block: ClaudeContentBlock): block is ClaudeTextContent {
  return block.type === 'text'
}

export function isToolUseContent(block: ClaudeContentBlock): block is ClaudeToolUseContent {
  return block.type === 'tool_use'
}

export function isThinkingContent(block: ClaudeContentBlock): block is ClaudeThinkingContent {
  return block.type === 'thinking'
}

export function isStreamEvent(msg: ClaudeStreamMessage): msg is ClaudeStreamEvent {
  return msg.type === 'stream_event'
}

export function isPermissionRequest(msg: ClaudeStreamMessage): msg is ClaudePermissionRequest {
  return msg.type === 'permission_request'
}

export function isInputRequest(msg: ClaudeStreamMessage): msg is ClaudeInputRequest {
  return msg.type === 'input_request'
}

export function isProgressEvent(msg: ClaudeStreamMessage): msg is ClaudeProgressEvent {
  return msg.type === 'progress'
}

export function isCompactionEvent(msg: ClaudeStreamMessage): msg is ClaudeCompactionEvent {
  return msg.type === 'system' && 'subtype' in msg && msg.subtype === 'compact'
}
