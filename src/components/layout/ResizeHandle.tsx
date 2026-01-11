import { useCallback, useEffect, useRef } from 'react'
import { useUIStore } from '../../stores/uiStore'

export function ResizeHandle() {
  const { sidebarWidth, setSidebarWidth, setIsResizing } = useUIStore()
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      startX.current = e.clientX
      startWidth.current = sidebarWidth
      setIsResizing(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [sidebarWidth, setIsResizing]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      setSidebarWidth(startWidth.current + delta)
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        setIsResizing(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setSidebarWidth, setIsResizing])

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-1 cursor-col-resize hover:bg-neutral-600 active:bg-neutral-500
                 transition-colors flex-shrink-0 relative group"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  )
}
