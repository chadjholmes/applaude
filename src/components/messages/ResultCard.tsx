import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ClaudeResult } from '../../types/claude'

interface ResultCardProps {
  content: unknown
  isExpanded: boolean
  onToggle: () => void
}

export function ResultCard({ content, isExpanded, onToggle }: ResultCardProps) {
  const result = content as ClaudeResult

  const isSuccess = result.subtype === 'success'
  const durationSecs = (result.duration_ms / 1000).toFixed(1)

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
          {isSuccess ? 'Completed' : 'Error'} · {durationSecs}s · ${result.total_cost_usd.toFixed(4)}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-5 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 text-xs text-neutral-500">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-neutral-600">Duration:</span>
              <span className="ml-2">{durationSecs}s total</span>
            </div>
            <div>
              <span className="text-neutral-600">API time:</span>
              <span className="ml-2">{(result.duration_api_ms / 1000).toFixed(1)}s</span>
            </div>
            <div>
              <span className="text-neutral-600">Turns:</span>
              <span className="ml-2">{result.num_turns}</span>
            </div>
            <div>
              <span className="text-neutral-600">Cost:</span>
              <span className="ml-2">${result.total_cost_usd.toFixed(4)}</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-neutral-800/50 flex gap-4">
            <span>In: {result.usage.input_tokens.toLocaleString()}</span>
            <span>Out: {result.usage.output_tokens.toLocaleString()}</span>
            {result.usage.cache_read_input_tokens && (
              <span>Cache: {result.usage.cache_read_input_tokens.toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
