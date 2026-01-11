import { ChevronDown, ChevronRight, Brain } from 'lucide-react'
import type { ClaudeThinkingContent } from '../../types/claude'

interface ThinkingCardProps {
  content: unknown
  isExpanded: boolean
  onToggle: () => void
}

export function ThinkingCard({ content, isExpanded, onToggle }: ThinkingCardProps) {
  const thinkingContent = content as ClaudeThinkingContent
  const thinking = thinkingContent.thinking

  const preview = thinking.slice(0, 50).replace(/\n/g, ' ').trim()

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
        <Brain className="w-3 h-3" />
        <span className="italic">
          Thinking
          {preview && <span className="text-neutral-600 ml-1.5">· {preview}...</span>}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-5 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
          <p className="text-xs text-neutral-400 whitespace-pre-wrap leading-relaxed">
            {thinking}
          </p>
        </div>
      )}
    </div>
  )
}
