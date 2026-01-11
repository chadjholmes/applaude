import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { useSessionStore } from '../stores/sessionStore'
import type { TodoItem } from '../types'

export function TodoListOverlay() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const session = useSessionStore((s) => activeSessionId ? s.sessions[activeSessionId] : null)

  const todos = session?.todos || []

  // Only show if there are non-completed todos
  const hasActiveTodos = todos.some((t) => t.status !== 'completed')
  if (!hasActiveTodos || todos.length === 0) return null

  const completedCount = todos.filter((t) => t.status === 'completed').length
  const progress = Math.round((completedCount / todos.length) * 100)

  return (
    <div className="fixed top-4 right-4 w-64 bg-neutral-900/95 backdrop-blur-sm border border-neutral-800/50 rounded-lg shadow-xl overflow-hidden z-50">
      {/* Header with progress */}
      <div className="px-3 py-2 border-b border-neutral-800/50 flex items-center justify-between">
        <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Tasks</span>
        <span className="text-[10px] text-neutral-600">
          {completedCount}/{todos.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-neutral-800">
        <div
          className="h-full bg-neutral-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Todo list */}
      <div className="max-h-48 overflow-y-auto">
        {todos.map((todo, i) => (
          <TodoItemRow key={i} todo={todo} />
        ))}
      </div>
    </div>
  )
}

function TodoItemRow({ todo }: { todo: TodoItem }) {
  const isCompleted = todo.status === 'completed'
  const isInProgress = todo.status === 'in_progress'

  return (
    <div className={`px-3 py-1.5 flex items-start gap-2 ${isCompleted ? 'opacity-50' : ''}`}>
      <div className="mt-0.5 flex-shrink-0">
        {isCompleted ? (
          <CheckCircle className="w-3 h-3 text-green-500/70" />
        ) : isInProgress ? (
          <Loader2 className="w-3 h-3 text-blue-400/70 animate-spin" />
        ) : (
          <Circle className="w-3 h-3 text-neutral-600" />
        )}
      </div>
      <span className={`text-[11px] leading-tight ${
        isCompleted
          ? 'text-neutral-600 line-through'
          : isInProgress
          ? 'text-neutral-300'
          : 'text-neutral-500'
      }`}>
        {isInProgress && todo.activeForm ? todo.activeForm : todo.content}
      </span>
    </div>
  )
}
