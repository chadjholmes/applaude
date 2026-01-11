export function LoadingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-1.5 px-4 py-3">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-pulse-subtle" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-pulse-subtle" style={{ animationDelay: '300ms' }} />
          <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-pulse-subtle" style={{ animationDelay: '600ms' }} />
        </div>
      </div>
    </div>
  )
}
