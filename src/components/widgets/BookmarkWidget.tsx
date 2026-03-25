'use client'

import type { BookmarkConfig, BookmarkEntry } from '@/types'
import { ExternalLink } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

// Converts 'pen-tool' → 'PenTool' and returns the Lucide component, or null
// Lucide icons are forwardRef objects (typeof === 'object'), not plain functions
function getLucideIcon(name: string): React.FC<LucideProps> | null {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) return null
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  const Icon = (LucideIcons as Record<string, unknown>)[pascal]
  return Icon != null ? (Icon as React.FC<LucideProps>) : null
}

interface BookmarkWidgetProps {
  config: Record<string, unknown>
}

function BookmarkItem({ entry, openInNewTab }: { entry: BookmarkEntry; openInNewTab: boolean }) {
  const domain = entry.url ? (() => {
    try { return new URL(entry.url).hostname } catch { return entry.url }
  })() : ''
  const faviconUrl = entry.url ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null
  const displayLabel = entry.label?.trim() || domain

  return (
    <a
      href={entry.url}
      target={openInNewTab ? '_blank' : '_self'}
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/6 transition-colors group border border-transparent hover:border-[var(--border)]"
    >
      {entry.icon ? (() => {
        const LucideIcon = getLucideIcon(entry.icon!)
        return (
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-base shrink-0"
            style={{ background: `${entry.iconColor || 'var(--accent)'}20`, color: entry.iconColor || 'var(--accent)' }}
          >
            {LucideIcon
              ? <LucideIcon className="w-4 h-4" />
              : <span>{entry.icon}</span>
            }
          </div>
        )
      })() : faviconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl}
          alt=""
          className="w-6 h-6 rounded shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors flex items-center gap-1">
          {displayLabel}
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        {entry.description && (
          <div className="text-xs text-[var(--text-muted)] truncate">{entry.description}</div>
        )}
      </div>
    </a>
  )
}

export function BookmarkWidget({ config }: BookmarkWidgetProps) {
  const c = config as unknown as BookmarkConfig

  // Normalise: support legacy single-url config
  const bookmarks: BookmarkEntry[] = c.bookmarks?.length
    ? c.bookmarks
    : c.url
    ? [{ url: c.url, description: c.description, icon: c.icon, iconColor: c.iconColor }]
    : []

  const openInNewTab = c.openInNewTab !== false
  const isGrid = c.layout === 'grid'

  if (bookmarks.length === 0) {
    return <div className="px-4 py-3 text-sm text-[var(--text-muted)]">No bookmarks configured.</div>
  }

  return (
    <div className={`p-2 h-full overflow-y-auto ${
      isGrid ? 'grid grid-cols-2 gap-1 auto-rows-min' : 'flex flex-col gap-0.5'
    }`}>
      {bookmarks.map((entry, i) => (
        <BookmarkItem key={i} entry={entry} openInNewTab={openInNewTab} />
      ))}
    </div>
  )
}

