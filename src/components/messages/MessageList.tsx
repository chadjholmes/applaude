import { useRef, useEffect, useState, useCallback } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { MessageItem } from './MessageItem'
import { LoadingIndicator } from './LoadingIndicator'
import { PendingQuestionCard } from './PendingQuestionCard'

export function MessageList() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const session = useSessionStore((s) =>
    activeSessionId ? s.sessions[activeSessionId] : null
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Track which messages have already been animated to prevent re-animation on re-renders
  const [animatedMessages, setAnimatedMessages] = useState<Set<string>>(new Set())
  const lastMessageCountRef = useRef(0)

  // Scroll to bottom - only when new messages are added
  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [])

  // Only scroll when message count increases
  useEffect(() => {
    const currentCount = session?.messages.length || 0
    if (currentCount > lastMessageCountRef.current) {
      // Small delay to let content render first
      requestAnimationFrame(() => {
        scrollToBottom()
      })
    }
    lastMessageCountRef.current = currentCount
  }, [session?.messages.length, scrollToBottom])

  // Mark new messages for animation immediately
  useEffect(() => {
    if (!session?.messages) return
    const currentIds = new Set(session.messages.map(m => m.id))
    const newIds = session.messages.map(m => m.id).filter(id => !animatedMessages.has(id))
    if (newIds.length > 0) {
      setAnimatedMessages(prev => {
        const next = new Set(prev)
        newIds.forEach(id => next.add(id))
        return next
      })
    }
  }, [session?.messages])

  if (!session) {
    return null
  }

  if (session.messages.length === 0 && session.state !== 'running') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-neutral-500">
          <p className="text-sm">Send a message to start the conversation</p>
        </div>
      </div>
    )
  }

  // Show loading indicator when running (processing or waiting for output)
  const isRunning = session.state === 'running'

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {session.messages.map((message) => {
          const isNew = !animatedMessages.has(message.id)
          return (
            <div
              key={message.id}
              className={isNew ? 'animate-fade-in' : ''}
            >
              <MessageItem
                message={message}
                sessionId={session.id}
              />
            </div>
          )
        })}

        {isRunning && <LoadingIndicator />}

        {/* Show pending question when waiting for input */}
        {session.pendingQuestion && session.state === 'waiting_input' && (
          <PendingQuestionCard
            pendingQuestion={session.pendingQuestion}
            sessionId={session.id}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
