'use client'

import { useEffect, useState, useRef } from 'react'
import { format, toZonedTime } from 'date-fns-tz'
import type { ClockConfig } from '@/types'

interface ClockWidgetProps {
  config: Record<string, unknown>
}

function FlipDigit({ value }: { value: string }) {
  const [current, setCurrent] = useState(value)
  const [prev, setPrev] = useState(value)
  const [flipping, setFlipping] = useState(false)
  const prevRef = useRef(value)

  useEffect(() => {
    if (value !== prevRef.current) {
      setPrev(prevRef.current)
      setFlipping(true)
      prevRef.current = value
      const t = setTimeout(() => {
        setCurrent(value)
        setFlipping(false)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [value])

  return (
    <div className="relative w-8 h-11 mx-[1px]" style={{ perspective: '300px' }}>
      {/* Top half - shows upper portion of current digit */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-zinc-800 rounded-t-lg border border-zinc-600 border-b-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 flex items-center justify-center" style={{ height: '200%' }}>
          <span className="text-xl font-bold text-white font-mono tabular-nums leading-none">{current}</span>
        </div>
      </div>

      {/* Bottom half - shows lower portion of current digit */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-zinc-800 rounded-b-lg border border-zinc-600 border-t-0 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center" style={{ height: '200%' }}>
          <span className="text-xl font-bold text-white font-mono tabular-nums leading-none">{current}</span>
        </div>
      </div>

      {/* Center divider */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-black/80 z-10" />

      {/* Flap - top half showing prev digit, flips down */}
      {flipping && (
        <div
          className="absolute top-0 left-0 right-0 h-1/2 bg-zinc-700 rounded-t-lg border border-zinc-500 border-b-0 overflow-hidden z-20"
          style={{
            transformOrigin: 'bottom center',
            animation: 'flipDown 0.3s ease-in forwards',
          }}
        >
          <div className="absolute inset-x-0 top-0 flex items-center justify-center" style={{ height: '200%' }}>
            <span className="text-xl font-bold text-white font-mono tabular-nums leading-none">{prev}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function SingleClockFace({ displayDate, config, label }: {
  displayDate: Date
  config: ClockConfig
  label: string | null
}) {
  const c = config
  const style = c.clockStyle || 'default'
  const timeFmt = c.format === '12h'
    ? 'hh:mm' + (c.showSeconds !== false ? ':ss' : '') + ' a'
    : 'HH:mm' + (c.showSeconds !== false ? ':ss' : '')
  const timeStr = format(displayDate, timeFmt)
  const dateStr = c.showDate !== false ? format(displayDate, c.dateFormat || 'EEE, MMM d') : null

  if (style === 'default') {
    return (
      <div className="flex flex-col items-center justify-center p-3 gap-1">
        <div className="text-4xl font-bold text-[var(--text)] font-mono tracking-tight leading-none tabular-nums">
          {timeStr}
        </div>
        {dateStr && <div className="text-sm text-[var(--text-muted)] font-medium">{dateStr}</div>}
        {label && <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{label}</div>}
      </div>
    )
  }

  if (style === 'large') {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-4 gap-2">
        <div className="text-5xl font-black text-[var(--text)] font-mono tracking-tight leading-none tabular-nums">
          {timeStr}
        </div>
        {dateStr && <div className="text-sm text-[var(--text-muted)] font-medium">{dateStr}</div>}
        {label && (
          <div className="px-2.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[11px] text-[var(--accent)] uppercase tracking-widest font-medium">
            {label}
          </div>
        )}
      </div>
    )
  }

  if (style === 'minimal') {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-3xl font-semibold text-[var(--text)] font-mono tabular-nums leading-none">
          {timeStr}
        </span>
        {(dateStr || label) && (
          <div className="flex flex-col gap-0.5">
            {dateStr && <span className="text-xs text-[var(--text-muted)]">{dateStr}</span>}
            {label && <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</span>}
          </div>
        )}
      </div>
    )
  }

  if (style === 'card') {
    const segments = timeStr.split(/(:| )/).filter(Boolean)
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-3">
        <div className="flex items-center gap-1">
          {segments.map((seg, i) => (
            seg === ':' ? (
              <span key={i} className="text-2xl font-bold text-[var(--text-muted)] font-mono leading-none pb-1">:</span>
            ) : seg === ' ' ? null : (
              <div key={i} className="min-w-[48px] flex items-center justify-center rounded-xl bg-white/8 border border-[var(--border)] px-2.5 py-2">
                <span className="text-2xl font-bold text-[var(--text)] font-mono tabular-nums leading-none">{seg}</span>
              </div>
            )
          ))}
        </div>
        {dateStr && <div className="text-xs text-[var(--text-muted)] font-medium">{dateStr}</div>}
        {label && <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{label}</div>}
      </div>
    )
  }

  if (style === 'analog') {
    const h = displayDate.getHours() % 12
    const m = displayDate.getMinutes()
    const s = displayDate.getSeconds()
    const hourDeg = h * 30 + m * 0.5
    const minDeg = m * 6
    const secDeg = s * 6
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-3">
        <svg viewBox="0 0 120 120" className="w-full max-w-[120px] h-auto">
          <circle cx="60" cy="60" r="58" fill="none" stroke="var(--border)" strokeWidth="2" />
          <circle cx="60" cy="60" r="54" fill="var(--surface)" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 - 90) * (Math.PI / 180)
            const x1 = 60 + 46 * Math.cos(a), y1 = 60 + 46 * Math.sin(a)
            const x2 = 60 + 52 * Math.cos(a), y2 = 60 + 52 * Math.sin(a)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
          })}
          {Array.from({ length: 60 }).map((_, i) => {
            if (i % 5 === 0) return null
            const a = (i * 6 - 90) * (Math.PI / 180)
            const x1 = 60 + 49 * Math.cos(a), y1 = 60 + 49 * Math.sin(a)
            const x2 = 60 + 52 * Math.cos(a), y2 = 60 + 52 * Math.sin(a)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth="1" strokeLinecap="round" />
          })}
          <line x1="60" y1="60" x2={60 + 26 * Math.cos((hourDeg - 90) * Math.PI / 180)} y2={60 + 26 * Math.sin((hourDeg - 90) * Math.PI / 180)} stroke="var(--text)" strokeWidth="4" strokeLinecap="round" />
          <line x1="60" y1="60" x2={60 + 36 * Math.cos((minDeg - 90) * Math.PI / 180)} y2={60 + 36 * Math.sin((minDeg - 90) * Math.PI / 180)} stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" />
          {c.showSeconds !== false && (
            <line
              x1={60 - 8 * Math.cos((secDeg - 90) * Math.PI / 180)} y1={60 - 8 * Math.sin((secDeg - 90) * Math.PI / 180)}
              x2={60 + 42 * Math.cos((secDeg - 90) * Math.PI / 180)} y2={60 + 42 * Math.sin((secDeg - 90) * Math.PI / 180)}
              stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"
            />
          )}
          <circle cx="60" cy="60" r="3" fill="var(--accent)" />
        </svg>
        {dateStr && <div className="text-xs text-[var(--text-muted)] font-medium">{dateStr}</div>}
        {label && <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</div>}
      </div>
    )
  }

  if (style === 'digital') {
    return (
      <div className="flex flex-col items-center justify-center p-3 gap-1">
        <div
          className="text-4xl tracking-widest tabular-nums leading-none font-bold"
          style={{ fontFamily: "'Courier New', monospace", color: 'var(--accent)', textShadow: '0 0 16px var(--accent), 0 0 32px var(--accent)' }}
        >
          {timeStr}
        </div>
        {dateStr && <div className="text-xs tracking-widest uppercase font-medium" style={{ color: 'var(--accent)', opacity: 0.6 }}>{dateStr}</div>}
        {label && <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{label}</div>}
      </div>
    )
  }

  if (style === 'flip') {
    const flipFmt24 = 'HH:mm' + (c.showSeconds !== false ? ':ss' : '')
    const flipFmt12 = 'hh:mm' + (c.showSeconds !== false ? ':ss' : '')
    const flipStr = format(displayDate, c.format === '12h' ? flipFmt12 : flipFmt24)
    const parts = flipStr.split(':')
    const ampm = c.format === '12h' ? format(displayDate, 'a') : null
    return (
      <div className="flex flex-col items-center justify-center px-3 py-3 gap-2">
        <div className="flex items-center gap-1.5">
          {parts.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-xl font-bold text-[var(--text-muted)] font-mono leading-none mb-1">:</span>}
              <div className="flex">
                {seg.split('').map((ch, j) => <FlipDigit key={`${i}-${j}`} value={ch} />)}
              </div>
            </div>
          ))}
          {ampm && <span className="text-sm font-semibold text-[var(--text-muted)] ml-1 self-end mb-1">{ampm}</span>}
        </div>
        {dateStr && <div className="text-xs text-[var(--text-muted)] font-medium">{dateStr}</div>}
        {label && <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</div>}
      </div>
    )
  }

  return null
}

export function ClockWidget({ config }: ClockWidgetProps) {
  const c = config as ClockConfig
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const extra = c.additionalTimezones
  const layout = c.multiLayout || 'list'
  const style = c.clockStyle || 'default'

  const resolveDate = (tz?: string) =>
    tz && tz !== 'local' ? toZonedTime(now, tz) : now
  const resolveLabel = (entry: { timezone: string; label?: string }) =>
    entry.label || (entry.timezone && entry.timezone !== 'local'
      ? entry.timezone.split('/').pop()?.replace(/_/g, ' ') ?? entry.timezone
      : 'Local')

  // Multi-timezone mode
  if (extra && extra.length > 0) {
    const all = [{ timezone: c.timezone || 'local' }, ...extra]

    // Inject flip keyframes once if needed
    const needsFlipStyle = style === 'flip'

    if (layout === 'grid') {
      return (
        <>
          {needsFlipStyle && <style>{`@keyframes flipDown{0%{transform:rotateX(0deg)}100%{transform:rotateX(-90deg)}}`}</style>}
          <div className="h-full p-2 grid grid-cols-2 gap-2 content-start overflow-y-auto">
            {all.map((entry, i) => {
              const d = resolveDate(entry.timezone !== 'local' ? entry.timezone : undefined)
              const lbl = resolveLabel(entry)
              return (
                <div key={i} className="rounded-xl bg-white/5 border border-[var(--border)] overflow-hidden flex flex-col items-center justify-center">
                  <SingleClockFace displayDate={d} config={c} label={lbl} />
                </div>
              )
            })}
          </div>
        </>
      )
    }

    return (
      <>
        {needsFlipStyle && <style>{`@keyframes flipDown{0%{transform:rotateX(0deg)}100%{transform:rotateX(-90deg)}}`}</style>}
        <div className="h-full flex flex-col divide-y divide-[var(--border)] overflow-y-auto">
          {all.map((entry, i) => {
            const d = resolveDate(entry.timezone !== 'local' ? entry.timezone : undefined)
            const lbl = resolveLabel(entry)
            return (
              <div key={i} className="flex flex-col items-center">
                <SingleClockFace displayDate={d} config={c} label={lbl} />
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // Single-timezone mode
  const tz = c.timezone && c.timezone !== 'local' ? c.timezone : undefined
  const displayDate = resolveDate(tz)
  const tzLabel = tz ? tz.replace(/_/g, ' ') : null

  return (
    <>
      {style === 'flip' && <style>{`@keyframes flipDown{0%{transform:rotateX(0deg)}100%{transform:rotateX(-90deg)}}`}</style>}
      <div className="h-full flex flex-col items-stretch justify-center">
        <SingleClockFace displayDate={displayDate} config={c} label={tzLabel} />
      </div>
    </>
  )
}
