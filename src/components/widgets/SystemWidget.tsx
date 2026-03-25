'use client'

import useSWR from 'swr'
import type { SystemConfig, SystemMetrics } from '@/types'
import { formatBytes, formatUptime } from '@/lib/widgets'
import { Spinner } from '@/components/ui/Spinner'
import { Cpu, MemoryStick, HardDrive, Timer } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function ProgressBar({ value, color = 'accent' }: { value: number; color?: string }) {
  const colorClass = color === 'accent'
    ? 'bg-[var(--accent)]'
    : color === 'green'
    ? 'bg-emerald-500'
    : color === 'yellow'
    ? 'bg-amber-500'
    : color === 'red'
    ? 'bg-red-500'
    : 'bg-[var(--accent)]'

  const barColor =
    value >= 85 ? 'bg-red-500' : value >= 65 ? 'bg-amber-500' : colorClass

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-xs font-mono text-[var(--text-muted)] w-10 text-right shrink-0">
        {Math.round(value)}%
      </span>
    </div>
  )
}

interface SystemWidgetProps {
  config: Record<string, unknown>
  onRefresh?: () => void
}

export function SystemWidget({ config }: SystemWidgetProps) {
  const c = config as SystemConfig

  const { data, isLoading, error } = useSWR<SystemMetrics>(
    '/api/metrics',
    fetcher,
    { refreshInterval: (c.refreshInterval || 5) * 1000, revalidateOnFocus: true }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Spinner />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-4 py-3 text-xs text-red-400">Failed to load metrics</div>
    )
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-3 h-full">
      {c.showCPU !== false && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
              <Cpu className="w-3.5 h-3.5" />
              CPU
            </span>
            <span className="text-xs text-[var(--text-muted)] truncate max-w-[120px]">
              {data.cpu.cores} cores
            </span>
          </div>
          <ProgressBar value={data.cpu.usage} />
        </div>
      )}

      {c.showRAM !== false && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
              <MemoryStick className="w-3.5 h-3.5" />
              Memory
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {formatBytes(data.memory.used)} / {formatBytes(data.memory.total)}
            </span>
          </div>
          <ProgressBar value={data.memory.usagePercent} color="green" />
        </div>
      )}

      {c.showDisk !== false && data.disk.length > 0 && data.disk.map((disk, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
              <HardDrive className="w-3.5 h-3.5" />
              {disk.path || 'Disk'}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {formatBytes(disk.used)} / {formatBytes(disk.total)}
            </span>
          </div>
          <ProgressBar value={disk.usagePercent} color="yellow" />
        </div>
      ))}

      {c.showUptime !== false && (
        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Timer className="w-3.5 h-3.5" />
            Uptime
          </span>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {formatUptime(data.uptime)}
          </span>
        </div>
      )}
    </div>
  )
}
