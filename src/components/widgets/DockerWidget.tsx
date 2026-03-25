'use client'

import useSWR from 'swr'
import type { DockerConfig } from '@/types'
import type { DockerContainer } from '@/types'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { Box, AlertTriangle } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function StateColor(state: DockerContainer['state']) {
  switch (state) {
    case 'running': return 'bg-emerald-500'
    case 'paused': return 'bg-amber-500'
    case 'restarting': return 'bg-blue-500 animate-pulse'
    case 'exited': return 'bg-red-500'
    default: return 'bg-zinc-500'
  }
}

interface DockerWidgetProps {
  config: Record<string, unknown>
}

export function DockerWidget({ config }: DockerWidgetProps) {
  const c = config as DockerConfig
  const host = c.host || 'http://localhost:2375'

  const params = new URLSearchParams({
    host,
    all: String(c.showAll || false),
    ...(c.containerFilter ? { filter: c.containerFilter } : {}),
  })

  const { data, isLoading, error } = useSWR<{ containers: DockerContainer[]; error?: string }>(
    `/api/docker?${params}`,
    fetcher,
    { refreshInterval: (c.refreshInterval || 10) * 1000 }
  )

  if (isLoading) {
    return <div className="flex items-center justify-center p-6"><Spinner /></div>
  }

  if (error || !data || data.error) {
    return (
      <div className="px-4 py-3 flex items-center gap-2 text-xs text-yellow-400">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{data?.error || 'Cannot connect to Docker'}</span>
      </div>
    )
  }

  const { containers } = data

  if (containers.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-[var(--text-muted)] flex items-center gap-2">
        <Box className="w-4 h-4" />
        No containers found
      </div>
    )
  }

  const running = containers.filter((c) => c.state === 'running').length
  const stopped = containers.filter((c) => c.state === 'exited').length

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Stats bar */}
      <div className="px-4 py-2 shrink-0 flex items-center gap-3 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--text-muted)]">{containers.length} total</span>
        <span className="text-xs text-emerald-400 font-medium">{running} running</span>
        {stopped > 0 && <span className="text-xs text-red-400">{stopped} stopped</span>}
      </div>
      {/* Container list */}
      <div className="flex-1 overflow-y-auto px-3 py-1.5 flex flex-col gap-0.5">
        {containers.map((container) => (
          <div key={container.id} className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/4 transition-colors">
            <span className={cn('w-2 h-2 rounded-full shrink-0 mt-1', StateColor(container.state))} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-[var(--text)] truncate font-medium">{container.name}</span>
                <span className={cn('text-[10px] font-medium capitalize shrink-0 px-1.5 py-0.5 rounded-full',
                  container.state === 'running' ? 'bg-emerald-500/15 text-emerald-400' :
                  container.state === 'paused' ? 'bg-amber-500/15 text-amber-400' :
                  container.state === 'restarting' ? 'bg-blue-500/15 text-blue-400' :
                  'bg-red-500/15 text-red-400'
                )}>
                  {container.state}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">{container.image}</div>
              {container.ports && container.ports.length > 0 && (
                <div className="text-[10px] text-[var(--accent)]/70 truncate mt-0.5">
                  {container.ports.slice(0, 3).join(' · ')}
                </div>
              )}
              {container.uptime && (
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Up {container.uptime}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
