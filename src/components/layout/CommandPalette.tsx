'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/cn'
import { Search, LayoutDashboard, Settings, Plus, X } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useRouter } from 'next/navigation'

function DynIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>
  const pascal = name.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')
  const Icon = icons[pascal] || LayoutDashboard
  return <Icon className={className} />
}

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: string
}

export function CommandPalette() {
  const router = useRouter()
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    dashboards,
    openDialog,
  } = useAppStore()

  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
    setQuery('')
    setActiveIdx(0)
  }, [setCommandPaletteOpen])

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandPaletteOpen, close, setCommandPaletteOpen])

  const items: CommandItem[] = [
    ...dashboards.map((d) => ({
      id: `dash-${d.id}`,
      label: d.name,
      description: d.description || 'Dashboard',
      icon: <DynIcon name={d.icon || 'layout-dashboard'} className="w-4 h-4" />,
      action: () => { router.push(`/dashboard/${d.slug}`); close() },
      category: 'Dashboards',
    })),
    {
      id: 'add-dashboard',
      label: 'New Dashboard',
      description: 'Create a new dashboard',
      icon: <Plus className="w-4 h-4" />,
      action: () => { openDialog({ type: 'add-dashboard' }); close() },
      category: 'Actions',
    },
    {
      id: 'add-widget',
      label: 'Add Widget',
      description: 'Add a widget to current dashboard',
      icon: <Plus className="w-4 h-4" />,
      action: () => { openDialog({ type: 'add-widget' }); close() },
      category: 'Actions',
    },
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Theme, accent, custom CSS',
      icon: <Settings className="w-4 h-4" />,
      action: () => { openDialog({ type: 'settings' }); close() },
      category: 'Actions',
    },
  ]

  const filtered = query
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : items

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  // Flatten for keyboard nav
  const flat = Object.values(grouped).flat()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flat[activeIdx]) {
      flat[activeIdx].action()
    }
  }

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  let flatIdx = 0

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-[20vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search dashboards, actions..."
                  className="flex-1 bg-transparent text-[var(--text)] placeholder:text-[var(--text-muted)] text-sm outline-none"
                />
                <button onClick={close} className="p-1 rounded-md hover:bg-white/10 text-[var(--text-muted)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">No results for &quot;{query}&quot;</p>
                ) : (
                  Object.entries(grouped).map(([category, groupItems]) => (
                    <div key={category}>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1.5">
                        {category}
                      </p>
                      {groupItems.map((item) => {
                        const idx = flatIdx++
                        return (
                          <button
                            key={item.id}
                            data-active={idx === activeIdx}
                            onClick={item.action}
                            onMouseEnter={() => setActiveIdx(idx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                              idx === activeIdx
                                ? 'bg-[var(--accent)] text-white'
                                : 'hover:bg-white/8 text-[var(--text)]'
                            )}
                          >
                            <span className={cn('shrink-0', idx === activeIdx ? 'text-white' : 'text-[var(--text-muted)]')}>
                              {item.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{item.label}</div>
                              {item.description && (
                                <div className={cn('text-xs truncate', idx === activeIdx ? 'text-white/70' : 'text-[var(--text-muted)]')}>
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-[var(--border)] flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> select</span>
                <span><kbd className="font-mono">Esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
