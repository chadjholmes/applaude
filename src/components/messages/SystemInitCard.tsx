import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ClaudeSystemInit } from '../../types/claude'

interface SystemInitCardProps {
  content: unknown
  isExpanded: boolean
  onToggle: () => void
}

export function SystemInitCard({ content, isExpanded, onToggle }: SystemInitCardProps) {
  const initData = content as ClaudeSystemInit

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
        <span className="italic">
          Session initialized · {initData.model}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-5 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2 text-neutral-500">
            <div>
              <span className="text-neutral-600">Version:</span>
              <span className="ml-2">{initData.claude_code_version}</span>
            </div>
            <div>
              <span className="text-neutral-600">Mode:</span>
              <span className="ml-2">{initData.permissionMode}</span>
            </div>
            <div className="col-span-2">
              <span className="text-neutral-600">CWD:</span>
              <span className="ml-2 font-mono">{initData.cwd}</span>
            </div>
          </div>

          {initData.tools && initData.tools.length > 0 && (
            <div className="pt-2 border-t border-neutral-800/50">
              <span className="text-neutral-600">{initData.tools.length} tools available</span>
            </div>
          )}

          {initData.mcp_servers && initData.mcp_servers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {initData.mcp_servers.map((server, i) => (
                <span
                  key={i}
                  className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                    server.status === 'connected'
                      ? 'bg-neutral-800 text-neutral-400'
                      : 'bg-neutral-800/50 text-neutral-600'
                  }`}
                >
                  {server.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
