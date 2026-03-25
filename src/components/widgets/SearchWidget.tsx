'use client'

import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { SEARCH_ENGINES } from '@/lib/widgets'
import type { SearchConfig } from '@/types'

interface SearchWidgetProps {
  config: Record<string, unknown>
}

export function SearchWidget({ config }: SearchWidgetProps) {
  const c = config as SearchConfig
  const [query, setQuery] = useState('')
  const [activeEngine, setActiveEngine] = useState(c.engine || 'duckduckgo')
  const engines = SEARCH_ENGINES
  const engine = engines[activeEngine as keyof typeof engines] || engines.duckduckgo

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const url = engine.url + encodeURIComponent(query.trim())
    if (c.openInNewTab !== false) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = url
    }
    setQuery('')
  }

  return (
    <form onSubmit={handleSearch} className="h-full flex flex-col justify-center gap-2.5 px-4 py-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c.placeholder || `Search ${engine.label}...`}
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-[var(--border)] bg-white/5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] transition-all"
        />
      </div>
    </form>
  )
}
