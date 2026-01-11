import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'
import type { ClaudeTextContent } from '../../types/claude'
import { useUIStore } from '../../stores/uiStore'

interface TextContentProps {
  content: unknown
}

export function TextContent({ content }: TextContentProps) {
  const textContent = content as ClaudeTextContent
  const text = textContent.text
  const [thinkingExpanded, setThinkingExpanded] = useState(false)
  const fontSize = useUIStore((s) => s.theme?.fontSize || 'sm')

  const textSizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[fontSize]

  if (!text) return null

  // Parse out <thinking> tags
  const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i)
  const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : null
  const mainContent = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()

  return (
    <div className="space-y-2">
      {/* Thinking block - collapsible */}
      {thinkingContent && (
        <div className="py-1">
          <button
            onClick={() => setThinkingExpanded(!thinkingExpanded)}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
          >
            <span className="opacity-50">
              {thinkingExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
            <Brain className="w-3 h-3" />
            <span className="italic">Thinking...</span>
          </button>

          {thinkingExpanded && (
            <div className="mt-2 ml-5 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50 text-xs text-neutral-400 italic">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {thinkingContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      {mainContent && (
        <div className={`markdown-content ${textSizeClass}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ children }) => (
                <pre className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 overflow-x-auto text-xs">
                  {children}
                </pre>
              ),
              code: ({ className, children, ...props }) => {
                const isInline = !className
                if (isInline) {
                  return (
                    <code className="bg-neutral-800 px-1 py-0.5 rounded text-[0.9em]" {...props}>
                      {children}
                    </code>
                  )
                }
                return (
                  <code className="text-xs text-neutral-100" {...props}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {mainContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
