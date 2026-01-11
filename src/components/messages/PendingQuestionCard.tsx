import { MessageCircle } from 'lucide-react'
import type { PendingQuestion } from '../../types'
import { useSessionStore } from '../../stores/sessionStore'

interface PendingQuestionCardProps {
  pendingQuestion: PendingQuestion
  sessionId: string
}

export function PendingQuestionCard({ pendingQuestion, sessionId }: PendingQuestionCardProps) {
  const sendMessage = useSessionStore((s) => s.sendMessage)
  const session = useSessionStore((s) => s.sessions[sessionId])
  const isWaiting = session?.state === 'waiting_input'

  const handleOptionSelect = (optionLabel: string) => {
    // Send the selected option as a message
    sendMessage(sessionId, optionLabel)
  }

  if (!isWaiting || !pendingQuestion.questions.length) {
    return null
  }

  return (
    <div className="py-2">
      {pendingQuestion.questions.map((q, qIndex) => (
        <div key={qIndex} className="flex items-start gap-3 p-3 bg-blue-950/20 rounded-lg border border-blue-900/30 mb-2">
          <MessageCircle className="w-4 h-4 text-blue-500/70 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {q.header && (
              <div className="text-[10px] uppercase tracking-wider text-blue-400/60 mb-1">
                {q.header}
              </div>
            )}
            <div className="text-xs text-blue-200/80 font-medium mb-3">
              {q.question}
            </div>

            <div className="flex flex-wrap gap-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionSelect(opt.label)}
                  className="group text-left px-3 py-2 text-xs rounded border bg-neutral-900/50 border-neutral-700/50 text-neutral-300 hover:bg-blue-900/30 hover:border-blue-700/50 hover:text-blue-200 transition-colors"
                >
                  <div className="font-medium">{opt.label}</div>
                  {opt.description && (
                    <div className="text-[10px] text-neutral-500 group-hover:text-blue-300/60 mt-0.5">
                      {opt.description}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-neutral-500 mt-3">
              Click an option or type your own response below
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
