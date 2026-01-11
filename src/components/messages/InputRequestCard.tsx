import { useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import type { ClaudeInputRequest } from '../../types/claude'
import { useSessionStore } from '../../stores/sessionStore'

interface InputRequestCardProps {
  content: unknown
  sessionId: string
}

export function InputRequestCard({ content, sessionId }: InputRequestCardProps) {
  const respondToInput = useSessionStore((s) => s.respondToInput)
  const session = useSessionStore((s) => s.sessions[sessionId])
  const isWaiting = session?.state === 'waiting_input'

  const inputRequest = content as ClaudeInputRequest
  const request = inputRequest.input_request

  const [textValue, setTextValue] = useState(request.default || '')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const handleSubmit = () => {
    if (request.type === 'select' && selectedOption) {
      respondToInput(sessionId, selectedOption)
    } else if (request.type === 'text' && textValue) {
      respondToInput(sessionId, textValue)
    } else if (request.type === 'confirm') {
      respondToInput(sessionId, selectedOption || 'y')
    }
  }

  const handleOptionSelect = (value: string) => {
    setSelectedOption(value)
    // Auto-submit for confirm type
    if (request.type === 'confirm') {
      respondToInput(sessionId, value)
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-start gap-3 p-3 bg-blue-950/20 rounded-lg border border-blue-900/30">
        <MessageCircle className="w-4 h-4 text-blue-500/70 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-blue-200/80 font-medium mb-2">
            {request.message}
          </div>

          {isWaiting && (
            <>
              {/* Select/Multiple choice */}
              {request.type === 'select' && request.options && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {request.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleOptionSelect(opt.value)}
                      className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                        selectedOption === opt.value
                          ? 'bg-blue-900/50 border-blue-700/50 text-blue-200'
                          : 'bg-neutral-900/50 border-neutral-700/50 text-neutral-400 hover:bg-neutral-800/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {selectedOption && (
                    <button
                      onClick={handleSubmit}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 rounded border border-blue-800/50 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      Submit
                    </button>
                  )}
                </div>
              )}

              {/* Confirm (yes/no) */}
              {request.type === 'confirm' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleOptionSelect('y')}
                    className="px-3 py-1.5 text-xs bg-green-900/40 hover:bg-green-900/60 text-green-300 rounded border border-green-800/50 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleOptionSelect('n')}
                    className="px-3 py-1.5 text-xs bg-neutral-900/50 hover:bg-neutral-800/50 text-neutral-400 rounded border border-neutral-700/50 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}

              {/* Text input */}
              {request.type === 'text' && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="flex-1 px-2 py-1.5 text-xs bg-neutral-900/50 border border-neutral-700/50 rounded text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-blue-700/50"
                    placeholder="Type your response..."
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!textValue}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 rounded border border-blue-800/50 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
