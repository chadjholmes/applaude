import { ChevronDown, ChevronRight, CheckCircle, XCircle, Shield, FileText, Check, X } from 'lucide-react'
import type { ClaudeUserMessage } from '../../types/claude'
import { useSessionStore } from '../../stores/sessionStore'

interface ToolResultCardProps {
  content: unknown
  isExpanded: boolean
  onToggle: () => void
  sessionId?: string
}

/**
 * Truncates text at word boundaries with ellipsis
 */
function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  // Find the last space before maxLength
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  // If there's a space, cut there; otherwise just cut at maxLength
  const cutPoint = lastSpace > maxLength * 0.5 ? lastSpace : maxLength
  return text.slice(0, cutPoint).trim() + '...'
}

function parseResultType(content: string): { type: 'success' | 'error' | 'permission_pending' | 'permission_granted' | 'file'; label: string; summary: string } {
  // Check for file content FIRST (Read results) - this prevents false positives
  // when file content contains permission-related strings
  if (content.includes('→') || content.match(/^\s*\d+[→|]/m)) {
    const lineCount = (content.match(/\n/g) || []).length + 1
    return { type: 'file', label: 'Read', summary: `${lineCount} lines` }
  }

  // Check for errors
  if (content.includes('<tool_use_error>') || content.includes('Error:')) {
    const errorMatch = content.match(/Error:\s*([^\n]+)/)
    const errorText = errorMatch ? errorMatch[1] : 'Tool execution failed'
    return {
      type: 'error',
      label: 'Error',
      summary: truncateAtWord(errorText, 40)
    }
  }

  // Check for PENDING permission requests - use more specific patterns
  // Claude's permission prompts have specific formats
  const isPermissionPrompt = (
    content.includes('Claude is requesting permission') ||
    content.includes('Allow this action?') ||
    content.includes('Do you want to allow') ||
    (content.includes('permission') && content.includes('allow') && content.length < 500)
  )
  if (isPermissionPrompt) {
    return { type: 'permission_pending', label: 'Permission Required', summary: 'Awaiting response' }
  }

  // Check for GRANTED permissions
  if (content.includes('Permission granted') || content.includes('Action allowed')) {
    return { type: 'permission_granted', label: 'Allowed', summary: 'Action permitted' }
  }

  // Default success - truncate at word boundary
  const preview = content.replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim()
  return { type: 'success', label: 'Result', summary: truncateAtWord(preview, 40) }
}

function getResultIcon(type: 'success' | 'error' | 'permission_pending' | 'permission_granted' | 'file') {
  switch (type) {
    case 'error':
      return XCircle
    case 'permission_pending':
    case 'permission_granted':
      return Shield
    case 'file':
      return FileText
    default:
      return CheckCircle
  }
}

export function ToolResultCard({ content, isExpanded, onToggle, sessionId }: ToolResultCardProps) {
  const respondToPermission = useSessionStore((s) => s.respondToPermission)
  const session = useSessionStore((s) => sessionId ? s.sessions[sessionId] : null)

  const userMessage = content as ClaudeUserMessage
  const results = userMessage.message?.content || []

  if (results.length === 0) return null

  const firstResult = results[0]
  const resultContent = firstResult?.content || ''

  const { type, label, summary } = parseResultType(resultContent)
  const Icon = getResultIcon(type)

  const isPendingPermission = type === 'permission_pending'
  // Show buttons if session is still active (has processId or is running/waiting)
  const canRespond = session?.processId && (session?.state === 'running' || session?.state === 'waiting_permission')

  const handleAllow = async () => {
    console.log('Allow clicked', { sessionId, processId: session?.processId })
    if (sessionId && session?.processId) {
      try {
        await respondToPermission(sessionId, true)
      } catch (err) {
        console.error('Failed to send permission response:', err)
      }
    }
  }

  const handleDeny = async () => {
    console.log('Deny clicked', { sessionId, processId: session?.processId })
    if (sessionId && session?.processId) {
      try {
        await respondToPermission(sessionId, false)
      } catch (err) {
        console.error('Failed to send permission response:', err)
      }
    }
  }

  // Special styling for pending permissions
  if (isPendingPermission) {
    return (
      <div className="py-2">
        <div className="flex items-start gap-3 p-3 bg-amber-950/20 rounded-lg border border-amber-900/30">
          <Shield className="w-4 h-4 text-amber-500/70 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-amber-200/80 font-medium mb-1">
              Permission Required
            </div>
            <div className="text-xs text-neutral-400 mb-2">
              {resultContent}
            </div>

            {canRespond && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAllow}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-900/40 hover:bg-green-900/60 text-green-300 rounded border border-green-800/50 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Allow
                </button>
                <button
                  onClick={handleDeny}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded border border-red-800/50 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Deny
                </button>
              </div>
            )}
            {!canRespond && sessionId && (
              <div className="text-[10px] text-neutral-600 mt-2">
                Session not active
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
      >
        <span className="opacity-50">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
        <Icon className="w-3 h-3" />
        <span className="italic">
          {label}
          {summary && <span className="text-neutral-600 ml-1.5">· {summary}</span>}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-5 p-2 bg-neutral-900/50 rounded border border-neutral-800/50">
          <pre className="text-xs text-neutral-400 whitespace-pre-wrap font-mono overflow-x-auto">
            {resultContent}
          </pre>
        </div>
      )}
    </div>
  )
}
