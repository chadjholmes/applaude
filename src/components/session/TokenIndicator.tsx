import { Layers } from 'lucide-react'
import type { Session } from '../../types'

interface TokenIndicatorProps {
  session: Session
}

export function TokenIndicator({ session }: TokenIndicatorProps) {
  const { contextTokens, contextLimit, compactionCount } = session.metadata

  // Don't show if we don't have context info yet
  if (!contextTokens || !contextLimit) return null

  const percentage = Math.min((contextTokens / contextLimit) * 100, 100)
  const isHigh = percentage > 75
  const isCritical = percentage > 90

  // Format token count (e.g., 125K)
  const formatTokens = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
    return n.toString()
  }

  return (
    <div
      className="flex items-center gap-1.5 text-xs"
      title={`Context: ${contextTokens.toLocaleString()} / ${contextLimit.toLocaleString()} tokens${compactionCount ? ` (compacted ${compactionCount}x)` : ''}`}
    >
      <Layers className={`w-3 h-3 ${isCritical ? 'text-amber-500' : 'text-neutral-500'}`} />

      {/* Mini progress bar */}
      <div className="w-12 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isCritical ? 'bg-amber-500' : isHigh ? 'bg-blue-500' : 'bg-neutral-600'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <span className={`text-[10px] tabular-nums ${isCritical ? 'text-amber-500' : 'text-neutral-600'}`}>
        {formatTokens(contextTokens)}
      </span>

      {compactionCount && compactionCount > 0 && (
        <span className="text-[9px] text-amber-500/70" title={`Compacted ${compactionCount} time(s)`}>
          {compactionCount}x
        </span>
      )}
    </div>
  )
}
