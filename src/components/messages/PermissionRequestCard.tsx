import { Shield, Check, X } from 'lucide-react'
import type { ClaudePermissionRequest } from '../../types/claude'
import { useSessionStore } from '../../stores/sessionStore'

interface PermissionRequestCardProps {
  content: unknown
  sessionId: string
}

export function PermissionRequestCard({ content, sessionId }: PermissionRequestCardProps) {
  const respondToPermission = useSessionStore((s) => s.respondToPermission)
  const session = useSessionStore((s) => s.sessions[sessionId])
  const isWaiting = session?.state === 'waiting_permission'

  const permRequest = content as ClaudePermissionRequest
  const request = permRequest.permission_request

  const toolName = request.tool_name || request.type
  const description = request.description

  const handleAllow = () => {
    respondToPermission(sessionId, true)
  }

  const handleDeny = () => {
    respondToPermission(sessionId, false)
  }

  return (
    <div className="py-2">
      <div className="flex items-start gap-3 p-3 bg-amber-950/20 rounded-lg border border-amber-900/30">
        <Shield className="w-4 h-4 text-amber-500/70 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-amber-200/80 font-medium mb-1">
            Permission Request
          </div>
          <div className="text-xs text-neutral-400 mb-2">
            {toolName && <span className="text-amber-300/70 font-mono">{toolName}</span>}
            {description && <span className="ml-1.5">— {description}</span>}
          </div>

          {request.input && (
            <pre className="text-[10px] text-neutral-500 bg-neutral-900/50 rounded p-2 mb-2 overflow-x-auto font-mono">
              {JSON.stringify(request.input, null, 2)}
            </pre>
          )}

          {isWaiting && (
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
        </div>
      </div>
    </div>
  )
}
