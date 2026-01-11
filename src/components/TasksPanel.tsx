import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Loader2, ListTodo } from 'lucide-react'
import { useSessionStore } from '../stores/sessionStore'
import type { TodoItem } from '../types'

export function TasksPanel() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const session = useSessionStore((s) => activeSessionId ? s.sessions[activeSessionId] : null)

  const todos = session?.todos || []
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false)

  // Only show if there are non-completed todos
  const hasActiveTodos = todos.some((t) => t.status !== 'completed')

  const completedCount = todos.filter((t) => t.status === 'completed').length

  // Auto-expand briefly when todos first appear, then collapse to tab
  useEffect(() => {
    if (hasActiveTodos && todos.length > 0 && !hasAnimatedIn) {
      setIsExpanded(true)
      setHasAnimatedIn(true)
      const timer = setTimeout(() => {
        setIsExpanded(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
    if (!hasActiveTodos || todos.length === 0) {
      setHasAnimatedIn(false)
    }
  }, [hasActiveTodos, todos.length, hasAnimatedIn])

  if (!hasActiveTodos || todos.length === 0) return null

  return (
    <div className="absolute bottom-0 left-0 z-40 mb-1">
      {/* Sliding panel */}
      <div
        className={`bg-neutral-900/95 backdrop-blur-sm border border-l-0 border-neutral-800/50 rounded-r-lg shadow-xl overflow-hidden transition-transform duration-300 ease-out ${
          isExpanded ? 'translate-x-0' : '-translate-x-[calc(100%-28px)]'
        }`}
      >
        <div className="flex items-stretch">
          {/* Main content */}
          <div className={`transition-opacity duration-200 max-w-xs ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            {/* Header */}
            <div className="px-3 py-1.5 border-b border-neutral-800/50 flex items-center gap-2">
              <ListTodo className="w-3 h-3 text-neutral-500" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Tasks</span>
              <span className="text-[10px] text-neutral-600">
                {completedCount}/{todos.length}
              </span>
            </div>

            {/* Todo list - scrollbar hidden unless hovering */}
            <div className="max-h-48 overflow-y-auto scrollbar-on-hover">
              {todos.map((todo, i) => (
                <TodoItemRow key={i} todo={todo} />
              ))}
            </div>
          </div>

          {/* Tab handle - slim vertical bar */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 w-7 flex flex-col items-center justify-center gap-0.5 py-1.5 border-l border-neutral-800/50 hover:bg-neutral-800/50 transition-colors"
          >
            <ListTodo className="w-3 h-3 text-neutral-500" />
            <span className="text-[9px] text-neutral-400 font-medium">
              {completedCount}/{todos.length}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

function TodoItemRow({ todo }: { todo: TodoItem }) {
  const isCompleted = todo.status === 'completed'
  const isInProgress = todo.status === 'in_progress'

  return (
    <div className={`px-3 py-1 flex items-center gap-2 ${isCompleted ? 'opacity-50' : ''}`}>
      <div className="flex-shrink-0">
        {isCompleted ? (
          <CheckCircle className="w-3 h-3 text-green-500/70" />
        ) : isInProgress ? (
          <Loader2 className="w-3 h-3 text-blue-400/70 animate-spin" />
        ) : (
          <Circle className="w-3 h-3 text-neutral-600" />
        )}
      </div>
      <span className={`text-[11px] whitespace-nowrap ${
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
