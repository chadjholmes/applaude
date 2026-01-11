import { useState, useEffect, useCallback } from 'react'
import {
  HelpCircle,
  Trash2,
  FolderOpen,
  Settings,
  RotateCcw,
  MessageSquare,
  FileCode,
  Bug,
  GitBranch,
  Terminal,
  Search,
} from 'lucide-react'

interface SlashCommand {
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const COMMANDS: SlashCommand[] = [
  { name: 'help', description: 'Show available commands', icon: HelpCircle },
  { name: 'clear', description: 'Clear conversation history', icon: Trash2 },
  { name: 'init', description: 'Initialize CLAUDE.md in current directory', icon: FileCode },
  { name: 'config', description: 'Open settings', icon: Settings },
  { name: 'review', description: 'Review code changes', icon: Search },
  { name: 'bug', description: 'Report a bug or issue', icon: Bug },
  { name: 'commit', description: 'Create a git commit', icon: GitBranch },
  { name: 'terminal', description: 'Execute terminal commands', icon: Terminal },
  { name: 'project', description: 'Change working directory', icon: FolderOpen },
  { name: 'retry', description: 'Retry last message', icon: RotateCcw },
  { name: 'feedback', description: 'Provide feedback', icon: MessageSquare },
]

interface SlashCommandAutocompleteProps {
  query: string
  onSelect: (command: string) => void
  onClose: () => void
}

export function SlashCommandAutocomplete({
  query,
  onSelect,
  onClose,
}: SlashCommandAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filter commands based on query
  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(query.toLowerCase())
  )

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].name)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [filteredCommands, selectedIndex, onSelect, onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (filteredCommands.length === 0) {
    return null
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden z-50">
      <div className="px-3 py-1.5 border-b border-neutral-800">
        <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Commands</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filteredCommands.map((cmd, i) => {
          const Icon = cmd.icon
          return (
            <button
              key={cmd.name}
              onClick={() => onSelect(cmd.name)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                i === selectedIndex ? 'bg-neutral-800' : 'hover:bg-neutral-800/50'
              }`}
            >
              <Icon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-neutral-200 font-mono">/{cmd.name}</div>
                <div className="text-[10px] text-neutral-500 truncate">{cmd.description}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
