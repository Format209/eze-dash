'use client'

import useSWR from 'swr'
import type { RSSConfig, RSSFeed } from '@/types'
import { Spinner } from '@/components/ui/Spinner'
import { ExternalLink, Rss } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface RSSWidgetProps {
  config: Record<string, unknown>
}

export function RSSWidget({ config }: RSSWidgetProps) {
  const c = config as unknown as RSSConfig

  const { data, isLoading, error } = useSWR<RSSFeed>(
    c.url ? `/api/rss?url=${encodeURIComponent(c.url)}&max=${c.maxItems || 5}` : null,
    fetcher,
    { refreshInterval: (c.refreshInterval || 15) * 60 * 1000 }
  )

  if (!c.url) {
    return (
      <div className="px-4 py-3 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Rss className="w-4 h-4" />
        No feed URL configured
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center p-6"><Spinner /></div>
  }

  if (error || !data || (data as { error?: string }).error) {
    return (
      <div className="px-4 py-3 text-xs text-red-400">
        {(data as { error?: string })?.error || 'Failed to load feed'}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Feed header */}
      <div className="px-4 py-2 shrink-0 border-b border-[var(--border)]">
        <a
          href={data.link}
          target={c.openInNewTab !== false ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors w-fit"
        >
          <Rss className="w-3 h-3 text-orange-400" />
          <span className="truncate max-w-[200px]">{data.title}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      </div>
      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-1.5 flex flex-col gap-0.5">
        {data.items.map((item, i) => (
          <div key={i} className="group rounded-lg px-2 py-1.5 hover:bg-white/4 transition-colors">
            <a
              href={item.link}
              target={c.openInNewTab !== false ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="text-sm text-[var(--text)] hover:text-[var(--accent)] transition-colors leading-snug line-clamp-2 flex items-start gap-1.5"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40 shrink-0" />
              <span className="flex-1">{item.title}</span>
            </a>
            {c.showDescription && item.description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 ml-3 line-clamp-2">
                {item.description}
              </p>
            )}
            {c.showDate !== false && item.pubDate && (
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5 ml-3">
                {(() => {
                  try { return formatDistanceToNow(new Date(item.pubDate!), { addSuffix: true }) }
                  catch { return item.pubDate }
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

