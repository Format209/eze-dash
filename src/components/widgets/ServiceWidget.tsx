'use client'

import useSWR from 'swr'
import type { ServiceConfig, ServiceEntry, ServiceStatus } from '@/types'
import { ExternalLink, CircleCheck, CircleX, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function ServiceRow({
  entry,
  checkInterval,
  showStatus,
  showResponseTime,
}: {
  entry: ServiceEntry
  checkInterval: number
  showStatus: boolean
  showResponseTime: boolean
}) {
  const { data: status, isLoading, error } = useSWR<ServiceStatus>(
    entry.url ? `/api/service-check?url=${encodeURIComponent(entry.url)}` : null,
    fetcher,
    { refreshInterval: checkInterval * 1000, revalidateOnFocus: false }
  )

  const isOnline = status?.online
  const statusColor = isLoading
    ? 'text-[var(--text-muted)]'
    : error
    ? 'text-yellow-400'
    : isOnline
    ? 'text-emerald-400'
    : 'text-red-400'

  const domain = entry.url
    ? (() => { try { return new URL(entry.url).hostname } catch { return entry.url } })()
    : ''

  const displayLabel = entry.label?.trim() || domain

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {entry.icon ? (
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0"
            style={{ background: `${entry.iconColor || 'var(--accent)'}20` }}
          >
            <span style={{ color: entry.iconColor || 'var(--accent)' }}>{entry.icon}</span>
          </div>
        ) : (
          <div className={cn('shrink-0', statusColor)}>
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isOnline ? (
              <CircleCheck className="w-4 h-4" />
            ) : (
              <CircleX className="w-4 h-4" />
            )}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text)] truncate">
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1 group"
            >
              {displayLabel}
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
          {entry.description && (
            <div className="text-xs text-[var(--text-muted)] truncate">{entry.description}</div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {showStatus && (
          <span className={cn('text-xs font-medium', statusColor)}>
            {isLoading ? 'Checking…' : isOnline ? 'Online' : 'Offline'}
          </span>
        )}
        {showResponseTime && status?.responseTime !== undefined && (
          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {status.responseTime}ms
          </span>
        )}
      </div>
    </div>
  )
}

interface ServiceWidgetProps {
  config: Record<string, unknown>
}

export function ServiceWidget({ config }: ServiceWidgetProps) {
  const c = config as unknown as ServiceConfig

  // Normalise: support legacy single-url config alongside new services array
  const services: ServiceEntry[] = c.services?.length
    ? c.services
    : c.url
    ? [{ url: c.url, description: c.description, icon: c.icon, iconColor: c.iconColor }]
    : []

  const checkInterval = c.checkInterval || 30
  const showStatus = c.showStatus !== false
  const showResponseTime = c.showResponseTime !== false

  if (services.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-[var(--text-muted)]">No services configured.</div>
    )
  }

  return (
    <div className="px-4 py-1 flex flex-col overflow-y-auto h-full">
      {services.map((entry, i) => (
        <ServiceRow
          key={i}
          entry={entry}
          checkInterval={checkInterval}
          showStatus={showStatus}
          showResponseTime={showResponseTime}
        />
      ))}
    </div>
  )
}

