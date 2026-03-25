'use client'

import { useEffect, useRef, useState } from 'react'
import type { IntegrationConfig } from '@/types'
import { RefreshCw, AlertCircle, Plug, ShieldCheck, ShieldOff } from 'lucide-react'

interface IntegrationStat {
  label: string
  value: string | number
  color?: 'default' | 'green' | 'red' | 'yellow' | 'blue'
}

interface IntegrationData {
  service: string
  status: 'ok' | 'error'
  error?: string
  stats: IntegrationStat[]
  blocking?: boolean
}

const COLOR_CLASSES: Record<string, string> = {
  green: 'text-emerald-400',
  red: 'text-red-400',
  yellow: 'text-amber-400',
  blue: 'text-sky-400',
  default: 'text-[var(--text)]',
}

export function IntegrationWidget({ config }: { config: Record<string, unknown> }) {
  const cfg = config as unknown as IntegrationConfig
  const [data, setData] = useState<IntegrationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = async () => {
    if (!cfg.service || !cfg.url) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ service: cfg.service, url: cfg.url })
      if (cfg.apiKey) params.set('apiKey', cfg.apiKey)
      if (cfg.username) params.set('username', cfg.username)
      if (cfg.password) params.set('password', cfg.password)
      if (cfg.slug) params.set('slug', cfg.slug)
      const res = await fetch(`/api/integration?${params.toString()}`)
      const json = await res.json()
      setData(json)
      setUpdatedAt(new Date())
    } catch {
      setData({ service: cfg.service, status: 'error', error: 'Fetch failed', stats: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = Math.max(10, cfg.refreshInterval ?? 30) * 1000
    timerRef.current = setInterval(fetchData, interval)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.service, cfg.url, cfg.apiKey, cfg.username, cfg.password, cfg.slug, cfg.refreshInterval])

  const togglePiholeBlocking = async () => {
    if (!data || data.blocking === undefined || actionLoading) return
    const prevBlocking = data.blocking
    const newBlocking = !prevBlocking
    const action = prevBlocking ? 'disable' : 'enable'
    // Optimistic update — flip immediately so the UI feels instant
    setData(prev => prev ? { ...prev, blocking: newBlocking } : prev)
    setActionLoading(true)
    try {
      const res = await fetch('/api/integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: cfg.service, url: cfg.url, apiKey: cfg.apiKey ?? '', action }),
      })
      if (!res.ok) {
        // Revert optimistic update if the API rejected the request
        setData(prev => prev ? { ...prev, blocking: prevBlocking } : prev)
      } else {
        // Give Pi-hole a moment to apply the change before re-fetching
        await new Promise(r => setTimeout(r, 1000))
        await fetchData()
      }
    } catch {
      // Revert on network error
      setData(prev => prev ? { ...prev, blocking: prevBlocking } : prev)
    } finally {
      setActionLoading(false)
    }
  }

  if (!cfg.service || !cfg.url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-[var(--text-muted)]">
        <Plug className="w-8 h-8 opacity-40" />
        <span className="text-sm text-center">Configure service URL and credentials in edit settings</span>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <RefreshCw className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  if (data?.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
        <span className="text-xs text-red-400 text-center">{data.error ?? 'Connection failed'}</span>
        <button
          onClick={fetchData}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1 mt-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-3 gap-2 overflow-hidden">
      {/* Stats grid */}
      <div className="flex-1 min-h-0" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
        alignContent: 'space-evenly',
        justifyContent: 'space-evenly',
        gap: '0.5rem',
      }}>
        {data?.stats.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col gap-0.5 rounded-lg p-2 min-w-0 overflow-hidden"
            style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 60%, transparent)' }}
          >
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] leading-tight truncate">
              {stat.label}
            </span>
            <span className={`text-sm font-semibold leading-tight truncate min-w-0 ${COLOR_CLASSES[stat.color ?? 'default']}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span className="capitalize">{cfg.service.replace(/_/g, ' ')}</span>
        <div className="flex items-center gap-2">
          {/* Pi-hole blocking toggle */}
          {cfg.service === 'pihole' && data?.blocking !== undefined && (
            <button
              onClick={togglePiholeBlocking}
              disabled={actionLoading}
              title={data.blocking ? 'Blocking enabled — click to pause' : 'Blocking paused — click to enable'}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                actionLoading
                  ? 'opacity-50 cursor-not-allowed bg-white/5'
                  : data.blocking
                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
              }`}
            >
              {actionLoading
                ? <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                : data.blocking
                ? <ShieldCheck className="w-2.5 h-2.5" />
                : <ShieldOff className="w-2.5 h-2.5" />
              }
              {data.blocking ? 'Blocking' : 'Paused'}
            </button>
          )}
          {loading && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
          {updatedAt && (
            <span>
              {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
