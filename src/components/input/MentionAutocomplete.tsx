import { useState, useEffect, useRef } from 'react'
import { File, Folder } from 'lucide-react'

interface MentionAutocompleteProps {
  query: string
  cwd: string
  position: { top: number; left: number }
  onSelect: (path: string) => void
  onClose: () => void
}

interface FileItem {
  name: string
  path: string
  isDirectory: boolean
}

export function MentionAutocomplete({
  query,
  cwd,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const searchFiles = async () => {
      setLoading(true)
      try {
        const results = await window.applaude.files.search(cwd, query)
        setFiles(results.slice(0, 10))
        setSelectedIndex(0)
      } catch (e) {
        console.error('File search error:', e)
        setFiles([])
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchFiles, 100)
    return () => clearTimeout(debounce)
  }, [query, cwd])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, files.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && files[selectedIndex]) {
        e.preventDefault()
        onSelect(files[selectedIndex].path)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [files, selectedIndex, onSelect, onClose])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (files.length === 0 && !loading) {
    return (
      <div
        ref={containerRef}
        className="absolute z-50 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden animate-fade-in"
        style={{ bottom: position.top, left: position.left, minWidth: '300px' }}
      >
        <div className="px-3 py-2 text-sm text-neutral-500">
          No files found
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden animate-fade-in"
      style={{ bottom: position.top, left: position.left, minWidth: '300px', maxWidth: '400px' }}
    >
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Searching...</div>
        ) : (
          files.map((file, index) => (
            <button
              key={file.path}
              onClick={() => onSelect(file.path)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-300 hover:bg-neutral-800/50'
              }`}
            >
              {file.isDirectory ? (
                <Folder className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              ) : (
                <File className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              )}
              <span className="truncate font-mono text-xs">{file.path}</span>
            </button>
          ))
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-neutral-800 text-xs text-neutral-600">
        <kbd className="px-1 py-0.5 bg-neutral-800 rounded">↑↓</kbd> navigate
        <kbd className="px-1 py-0.5 bg-neutral-800 rounded ml-2">Enter</kbd> select
        <kbd className="px-1 py-0.5 bg-neutral-800 rounded ml-2">Esc</kbd> close
      </div>
    </div>
  )
}
