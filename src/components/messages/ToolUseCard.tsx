import { ChevronDown, ChevronRight, Pencil, Terminal, Search, FileText, FolderOpen } from 'lucide-react'
import type { ClaudeToolUseContent } from '../../types/claude'

interface ToolUseCardProps {
  content: unknown
  isExpanded: boolean
  onToggle: () => void
}

export function ToolUseCard({ content, isExpanded, onToggle }: ToolUseCardProps) {
  const toolContent = content as ClaudeToolUseContent
  const toolName = toolContent.name
  const input = toolContent.input

  const summary = getToolSummary(toolName, input)
  const ToolIcon = getToolIcon(toolName)

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
        <ToolIcon className="w-3 h-3" />
        <span className="italic">
          {toolName}
          {summary && <span className="text-neutral-600 ml-1.5">· {summary}</span>}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 ml-5">
          <ToolContent toolName={toolName} input={input} />
        </div>
      )}
    </div>
  )
}

function ToolContent({ toolName, input }: { toolName: string; input: Record<string, unknown> }) {
  // Special handling for Write/Edit - show code content nicely
  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = String(input.file_path || input.path || '')
    const content = String(input.content || input.new_string || '')
    const oldString = input.old_string ? String(input.old_string) : null

    // For Edit, generate a unified diff view
    if (toolName === 'Edit' && oldString) {
      const diffLines = generateUnifiedDiff(oldString, content)

      return (
        <div className="space-y-1">
          {filePath && (
            <div className="text-[10px] text-neutral-500 font-mono">{truncatePath(filePath)}</div>
          )}
          <div className="rounded border border-neutral-800/50 overflow-hidden">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={`px-2 py-0.5 font-mono text-xs ${
                  line.type === 'remove'
                    ? 'bg-red-950/30 text-red-300/80'
                    : line.type === 'add'
                    ? 'bg-green-950/30 text-green-300/80'
                    : 'bg-neutral-900/30 text-neutral-500'
                }`}
              >
                <span className="inline-block w-3 text-[10px] opacity-60">
                  {line.type === 'remove' ? '−' : line.type === 'add' ? '+' : ' '}
                </span>
                <span className="whitespace-pre-wrap">{line.content}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // For Write, show clean code view
    return (
      <div className="space-y-1">
        {filePath && (
          <div className="text-[10px] text-neutral-500 font-mono">{truncatePath(filePath)}</div>
        )}
        <div className="p-2 bg-neutral-900/50 rounded border border-neutral-800/50">
          <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono overflow-x-auto">
            {content}
          </pre>
        </div>
      </div>
    )
  }

  // Special handling for Bash - show command nicely
  if (toolName === 'Bash') {
    const command = String(input.command || '')
    return (
      <div className="p-2 bg-neutral-900/50 rounded border border-neutral-800/50">
        <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono overflow-x-auto">
          <span className="text-neutral-500">$ </span>{command}
        </pre>
      </div>
    )
  }

  // Special handling for Read - just show path
  if (toolName === 'Read') {
    const filePath = String(input.file_path || '')
    return (
      <div className="p-2 bg-neutral-900/50 rounded border border-neutral-800/50">
        <span className="text-xs text-neutral-400 font-mono">{filePath}</span>
      </div>
    )
  }

  // Default: show JSON
  return (
    <div className="p-2 bg-neutral-900/50 rounded border border-neutral-800/50">
      <pre className="text-xs text-neutral-400 overflow-x-auto whitespace-pre-wrap font-mono">
        {JSON.stringify(input, null, 2)}
      </pre>
    </div>
  )
}

function getToolIcon(name: string) {
  switch (name) {
    case 'Bash':
      return Terminal
    case 'Read':
      return FileText
    case 'Glob':
    case 'Grep':
      return Search
    case 'Write':
    case 'Edit':
      return Pencil
    default:
      return FolderOpen
  }
}

function getToolSummary(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Read':
      return truncatePath(String(input.file_path || ''))
    case 'Edit':
    case 'Write':
      return truncatePath(String(input.file_path || input.path || ''))
    case 'Bash':
      return String(input.command || '').slice(0, 40)
    case 'Glob':
      return String(input.pattern || '')
    case 'Grep':
      return String(input.pattern || '')
    case 'Task':
      return String(input.description || '').slice(0, 40)
    default:
      return ''
  }
}

function truncatePath(path: string): string {
  if (path.length <= 40) return path
  const parts = path.split('/')
  if (parts.length <= 2) return path.slice(-40)
  return '.../' + parts.slice(-2).join('/')
}

interface DiffLine {
  type: 'context' | 'remove' | 'add'
  content: string
}

function generateUnifiedDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const result: DiffLine[] = []

  // Simple LCS-based diff for small inputs
  if (oldLines.length <= 50 && newLines.length <= 50) {
    // Find longest common subsequence
    const lcs = findLCS(oldLines, newLines)

    let oldIdx = 0
    let newIdx = 0
    let lcsIdx = 0

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
      if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
        // Common line
        if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
          result.push({ type: 'context', content: oldLines[oldIdx] })
          oldIdx++
          newIdx++
          lcsIdx++
        } else {
          // New line added
          result.push({ type: 'add', content: newLines[newIdx] })
          newIdx++
        }
      } else if (oldIdx < oldLines.length && (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])) {
        // Old line removed
        result.push({ type: 'remove', content: oldLines[oldIdx] })
        oldIdx++
      } else if (newIdx < newLines.length) {
        // New line added
        result.push({ type: 'add', content: newLines[newIdx] })
        newIdx++
      }
    }

    // Collapse context to show only 2 lines around changes
    return collapseContext(result, 2)
  }

  // Fallback for large inputs: show all old as removed, all new as added
  oldLines.forEach(line => result.push({ type: 'remove', content: line }))
  newLines.forEach(line => result.push({ type: 'add', content: line }))

  return result
}

function findLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return lcs
}

function collapseContext(lines: DiffLine[], contextSize: number): DiffLine[] {
  if (lines.length === 0) return lines

  // Find ranges of changes
  const changeIndices: number[] = []
  lines.forEach((line, i) => {
    if (line.type !== 'context') changeIndices.push(i)
  })

  if (changeIndices.length === 0) {
    // No changes, show first and last few lines
    if (lines.length <= contextSize * 2 + 1) return lines
    return [
      ...lines.slice(0, contextSize),
      { type: 'context', content: `... ${lines.length - contextSize * 2} unchanged lines ...` },
      ...lines.slice(-contextSize)
    ]
  }

  // Build result with collapsed context
  const result: DiffLine[] = []
  let lastIncluded = -1

  for (const idx of changeIndices) {
    const start = Math.max(0, idx - contextSize)
    const end = Math.min(lines.length - 1, idx + contextSize)

    // Add ellipsis if there's a gap
    if (start > lastIncluded + 1) {
      const skipped = start - lastIncluded - 1
      if (skipped > 0) {
        result.push({ type: 'context', content: `··· ${skipped} lines ···` })
      }
    }

    // Add context and change lines
    for (let i = Math.max(start, lastIncluded + 1); i <= end; i++) {
      result.push(lines[i])
      lastIncluded = i
    }
  }

  // Add trailing ellipsis if needed
  if (lastIncluded < lines.length - 1) {
    const skipped = lines.length - 1 - lastIncluded
    if (skipped > 0) {
      result.push({ type: 'context', content: `··· ${skipped} lines ···` })
    }
  }

  return result
}
