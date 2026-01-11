import { useSessionStore } from '../../stores/sessionStore'
import { useUIStore } from '../../stores/uiStore'
import type { Message, ContentBlock } from '../../types'
import { TextContent } from './TextContent'
import { ToolUseCard } from './ToolUseCard'
import { ThinkingCard } from './ThinkingCard'
import { ToolResultCard } from './ToolResultCard'
import { SystemInitCard } from './SystemInitCard'
import { ResultCard } from './ResultCard'
import { PermissionRequestCard } from './PermissionRequestCard'
import { InputRequestCard } from './InputRequestCard'

interface MessageItemProps {
  message: Message
  sessionId: string
}

export function MessageItem({ message, sessionId }: MessageItemProps) {
  const toggleExpansion = useSessionStore((s) => s.toggleContentExpansion)
  const fontSize = useUIStore((s) => s.theme?.fontSize || 'sm')

  const textSizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[fontSize]

  const handleToggle = (blockId: string) => {
    toggleExpansion(sessionId, message.id, blockId)
  }

  // User input messages
  if (message.type === 'user' && (message.raw as { type: string }).type === 'user_input') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-neutral-800 rounded-2xl rounded-br-md px-3 py-2">
          <p className={`${textSizeClass} text-neutral-100 whitespace-pre-wrap`}>
            {(message.raw as { content: string }).content}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {message.contentBlocks.map((block) => (
        <ContentBlockRenderer
          key={block.id}
          block={block}
          sessionId={sessionId}
          onToggle={() => handleToggle(block.id)}
        />
      ))}
    </div>
  )
}

interface ContentBlockRendererProps {
  block: ContentBlock
  sessionId: string
  onToggle: () => void
}

function ContentBlockRenderer({ block, sessionId, onToggle }: ContentBlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <TextContent content={block.content} />

    case 'tool_use':
      return (
        <ToolUseCard
          content={block.content}
          isExpanded={block.isExpanded}
          onToggle={onToggle}
        />
      )

    case 'thinking':
      return (
        <ThinkingCard
          content={block.content}
          isExpanded={block.isExpanded}
          onToggle={onToggle}
        />
      )

    case 'tool_result':
      return (
        <ToolResultCard
          content={block.content}
          isExpanded={block.isExpanded}
          onToggle={onToggle}
          sessionId={sessionId}
        />
      )

    case 'system_init':
      // Don't render system init - it's metadata, not conversation content
      return null

    case 'result':
      // Don't render result - it's metadata, not conversation content
      return null

    case 'permission_request':
      return (
        <PermissionRequestCard
          content={block.content}
          sessionId={sessionId}
        />
      )

    case 'input_request':
      return (
        <InputRequestCard
          content={block.content}
          sessionId={sessionId}
        />
      )

    default:
      return null
  }
}
