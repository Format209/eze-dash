'use client'

import { useState, useRef, useCallback } from 'react'
import useSWR from 'swr'
import type { CustomAPIConfig, CustomAPIField, CustomAPIAction } from '@/types'
import { Spinner } from '@/components/ui/Spinner'
import { AlertCircle, ExternalLink } from 'lucide-react'

// ── Fetcher ───────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CustomAPIWidgetProps { config: Record<string, unknown> }

// ── JSON path extractor ───────────────────────────────────────────────────────
function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj
  const parts = path.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    const m = part.match(/^(.+)\[(\d+)\]$/)
    if (m) {
      const arr = (cur as Record<string, unknown>)[m[1]]
      cur = Array.isArray(arr) ? arr[parseInt(m[2])] : undefined
    } else {
      cur = (cur as Record<string, unknown>)[part]
    }
  }
  return cur
}

// ── Set nested value by dot-path ──────────────────────────────────────────────
function setDeep(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  if (!path) return { value }
  const parts = path.split('.')
  const result: Record<string, unknown> = { ...obj }
  let cur: Record<string, unknown> = result
  for (let i = 0; i < parts.length - 1; i++) {
    const next = typeof cur[parts[i]] === 'object' ? { ...(cur[parts[i]] as Record<string, unknown>) } : {}
    cur[parts[i]] = next
    cur = next
  }
  cur[parts[parts.length - 1]] = value
  return result
}

// ── Colour maps ───────────────────────────────────────────────────────────────
const DISP_COLORS: Record<string, string> = {
  accent: 'var(--accent)', green: '#34d399', red: '#f87171',
  yellow: '#fbbf24', blue: '#60a5fa', default: 'var(--text)',
}
const BTN_COLORS: Record<string, string> = {
  accent: 'var(--accent)', green: '#059669', red: '#dc2626',
  yellow: '#d97706', blue: '#2563eb', default: 'rgba(255,255,255,0.12)',
}

// ── SVG Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <span className="text-[10px] text-[var(--text-muted)]">…</span>
  const W = 100, H = 32
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const step = W / (values.length - 1)
  const pts = values.map((v, i) =>
    `${(i * step).toFixed(1)},${(H - ((v - min) / range) * (H - 4) - 2).toFixed(1)}`
  ).join(' ')
  const lx = ((values.length - 1) * step).toFixed(1)
  const ly = (H - ((values[values.length - 1] - min) / range) * (H - 4) - 2).toFixed(1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  )
}

// ── SVG Arc Gauge ─────────────────────────────────────────────────────────────
function ArcGauge({ pct, color, label, unit, fieldLabel }: { pct: number; color: string; label: string; unit?: string; fieldLabel?: string }) {
  const r = 34, cx = 44, cy = 44
  const startDeg = -210, totalDeg = 240
  const toRad = (d: number) => (d * Math.PI) / 180
  const describeArc = (endDeg: number) => {
    const s = toRad(startDeg), e = toRad(endDeg)
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${(e - s) > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }
  const filledEnd = startDeg + totalDeg * Math.min(1, Math.max(0, pct / 100))
  return (
    <svg viewBox="0 0 88 78" className="w-full max-w-[88px]">
      <path d={describeArc(startDeg + totalDeg)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeLinecap="round" />
      <path d={describeArc(filledEnd)} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>{label}</text>
      {unit && <text x={cx} y={cy + 14} textAnchor="middle" fontSize="8" fill="currentColor" className="fill-[var(--text-muted)]">{unit}</text>}
      {fieldLabel && <text x={cx} y={75} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.45)" fontWeight="500" letterSpacing="0.06em">{fieldLabel.toUpperCase()}</text>}
    </svg>
  )
}

// ── FieldDisplay ──────────────────────────────────────────────────────────────
type SparkMap = Map<number, number[]>

function FieldDisplay({ field, rootValue, sparkMap, idx }: {
  field: CustomAPIField; rootValue: unknown; sparkMap: SparkMap; idx: number
}) {
  const val   = getByPath(rootValue, field.path)
  const color = DISP_COLORS[field.color ?? 'accent']
  const label = field.label || field.path
  const card  = 'flex flex-col gap-1.5 rounded-lg p-2.5'
  const bg    = { backgroundColor: 'color-mix(in srgb, var(--surface) 60%, transparent)' } as React.CSSProperties
  const lbl   = 'text-[10px] uppercase tracking-wider text-[var(--text-muted)] leading-tight truncate'

  // ── gauge (bar or arc) ────────────────────────────────────────────────────
  if (field.displayType === 'gauge') {
    const num = parseFloat(String(val))
    const min = field.min ?? 0, max = field.max ?? 100
    const pct = isNaN(num) ? 0 : Math.min(100, Math.max(0, ((num - min) / (max - min)) * 100))
    const display = isNaN(num) ? '—' : num.toLocaleString()
    if (field.gaugeStyle === 'arc') return (
      <div className={card} style={bg}>
        <ArcGauge pct={pct} color={color} label={display} unit={field.unit} fieldLabel={label} />
      </div>
    )
    return (
      <div className={card} style={bg}>
        <span className={lbl}>{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold" style={{ color }}>{display}</span>
          {field.unit && <span className="text-[10px] text-[var(--text-muted)]">{field.unit}</span>}
          <span className="text-[10px] text-[var(--text-muted)] ml-auto">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    )
  }

  // ── number ────────────────────────────────────────────────────────────────
  if (field.displayType === 'number') {
    const num = parseFloat(String(val))
    return (
      <div className={card} style={bg}>
        <span className={lbl}>{label}</span>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
            {isNaN(num) ? (val == null ? '—' : String(val)) : num.toLocaleString()}
          </span>
          {field.unit && <span className="text-xs text-[var(--text-muted)]">{field.unit}</span>}
        </div>
      </div>
    )
  }

  // ── badge ─────────────────────────────────────────────────────────────────
  if (field.displayType === 'badge') {
    const str = val == null ? '—' : (typeof val === 'object' ? JSON.stringify(val) : String(val))
    return (
      <div className={card} style={bg}>
        <span className={lbl}>{label}</span>
        <span className="self-start px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 truncate max-w-full"
          style={{ backgroundColor: `${color}25`, color }}>{str}</span>
      </div>
    )
  }

  // ── boolean ───────────────────────────────────────────────────────────────
  if (field.displayType === 'boolean') {
    const ok = val === true || val === 'true' || val === 1 || val === 'on' || val === 'yes' || val === 'enabled'
    return (
      <div className={card} style={bg}>
        <span className={lbl}>{label}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={`w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-sm font-medium" style={{ color: ok ? '#34d399' : '#f87171' }}>
            {ok ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    )
  }

  // ── sparkline (live chart) ────────────────────────────────────────────────
  if (field.displayType === 'sparkline') {
    const num = parseFloat(String(val))
    if (!isNaN(num)) {
      const prev = sparkMap.get(idx) ?? []
      if (prev[prev.length - 1] !== num) sparkMap.set(idx, [...prev, num].slice(-(field.sparkPoints ?? 20)))
    }
    const hist   = sparkMap.get(idx) ?? []
    const latest = isNaN(parseFloat(String(val))) ? (val == null ? '—' : String(val)) : parseFloat(String(val)).toLocaleString()
    return (
      <div className={`${card} col-span-2`} style={bg}>
        <span className={lbl}>{label}</span>
        <div className="flex items-end justify-between gap-2 mt-0.5">
          <div>
            <span className="text-xl font-bold tabular-nums" style={{ color }}>{latest}</span>
            {field.unit && <span className="text-xs text-[var(--text-muted)] ml-1">{field.unit}</span>}
          </div>
          <Sparkline values={hist} color={color} />
        </div>
      </div>
    )
  }

  // ── image ─────────────────────────────────────────────────────────────────
  if (field.displayType === 'image') {
    const src = val == null ? null : String(val)
    return (
      <div className={`${card} col-span-2`} style={bg}>
        <span className={lbl}>{label}</span>
        {src
          ? <img src={src} alt={label} className="rounded max-h-32 object-contain mt-1" />
          : <span className="text-xs text-[var(--text-muted)]">—</span>}
      </div>
    )
  }

  // ── link ──────────────────────────────────────────────────────────────────
  if (field.displayType === 'link') {
    const href = val == null ? null : String(val)
    return (
      <div className={card} style={bg}>
        <span className={lbl}>{label}</span>
        {href
          ? <a href={href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm truncate mt-0.5" style={{ color }}>
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{field.linkLabel || href}</span>
            </a>
          : <span className="text-xs text-[var(--text-muted)]">—</span>}
      </div>
    )
  }

  // ── list ──────────────────────────────────────────────────────────────────
  if (field.displayType === 'list') {
    const arr = Array.isArray(val) ? val : (val != null ? [val] : [])
    const max = field.listMax ?? 6
    return (
      <div className={`${card} col-span-2`} style={bg}>
        <span className={lbl}>{label}</span>
        <ul className="flex flex-col gap-1 mt-0.5">
          {arr.slice(0, max).map((item, i) => (
            <li key={i} className="text-xs text-[var(--text)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </li>
          ))}
          {arr.length > max && <li className="text-[10px] text-[var(--text-muted)]">+{arr.length - max} more</li>}
        </ul>
      </div>
    )
  }

  // ── datetime ──────────────────────────────────────────────────────────────
  if (field.displayType === 'datetime') {
    const fmt = field.dateFormat || 'datetime'
    let display = '—'
    if (val != null) {
      try {
        const d = new Date(String(val))
        if (!isNaN(d.getTime())) {
          if (fmt === 'relative') {
            const s = Math.round((Date.now() - d.getTime()) / 1000)
            display = Math.abs(s) < 60 ? `${s}s ago`
              : Math.abs(s) < 3600   ? `${Math.round(s / 60)}m ago`
              : Math.abs(s) < 86400  ? `${Math.round(s / 3600)}h ago`
              : `${Math.round(s / 86400)}d ago`
          } else if (fmt === 'date') display = d.toLocaleDateString()
          else if (fmt === 'time') display = d.toLocaleTimeString()
          else display = d.toLocaleString()
        } else display = String(val)
      } catch { display = String(val) }
    }
    return (
      <div className={card} style={bg}>
        <span className={lbl}>{label}</span>
        <span className="text-sm font-medium text-[var(--text)] mt-0.5">{display}</span>
      </div>
    )
  }

  // ── json (raw dump) ───────────────────────────────────────────────────────
  if (field.displayType === 'json') {
    const str = val == null ? 'null' : (typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val))
    return (
      <div className={`${card} col-span-2`} style={bg}>
        <span className={lbl}>{label}</span>
        <pre className="text-[10px] text-[var(--text)] bg-black/20 rounded p-2 overflow-auto max-h-24 mt-0.5 leading-snug">{str}</pre>
      </div>
    )
  }

  // ── color swatch ──────────────────────────────────────────────────────────
  if (field.displayType === 'color') {
    const clr = val == null ? null : String(val)
    return (
      <div className={card} style={bg}>
        <span className={lbl}>{label}</span>
        <div className="flex items-center gap-2 mt-0.5">
          {clr && <div className="w-5 h-5 rounded border border-white/10 shrink-0" style={{ backgroundColor: clr }} />}
          <span className="text-xs text-[var(--text)] font-mono">{clr ?? '—'}</span>
        </div>
      </div>
    )
  }

  // ── items — iterate object values or array, render title/subtitle/value ──
  if (field.displayType === 'items') {
    const raw = getByPath(rootValue, field.path)
    const items: unknown[] = Array.isArray(raw)
      ? raw
      : (raw != null && typeof raw === 'object' ? Object.values(raw as Record<string, unknown>) : [])
    const max = field.itemMax ?? 20
    const color = DISP_COLORS[field.color ?? 'accent']

    const pingColor = (v: number) => {
      if (v < 0) return '#f87171'       // unreachable
      if (v < 50) return '#34d399'       // good
      if (v < 150) return '#fbbf24'      // ok
      return '#f87171'                   // slow
    }

    return (
      <div className="col-span-full flex flex-col divide-y divide-[var(--border)]">
        {items.slice(0, max).map((item, i) => {
          const title    = field.itemTitle    ? String(getByPath(item, field.itemTitle)    ?? '') : ''
          const subtitle = field.itemSubtitle ? String(getByPath(item, field.itemSubtitle) ?? '') : ''
          const rawVal   = field.itemValue    ? getByPath(item, field.itemValue)            : undefined
          const num      = rawVal != null ? parseFloat(String(rawVal)) : NaN
          const display  = isNaN(num) ? (rawVal == null ? '—' : String(rawVal)) : num.toLocaleString()
          const valColor = field.itemValue === 'ping' ? pingColor(num) : color
          return (
            <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-white/3 transition-colors">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-[var(--text)] truncate leading-tight">{title || String(item)}</span>
                {subtitle && <span className="text-[11px] text-[var(--text-muted)] font-mono truncate leading-tight">{subtitle}</span>}
              </div>
              {field.itemValue && (
                <span className="text-sm font-bold tabular-nums ml-3 shrink-0" style={{ color: valColor }}>
                  {num < 0 ? '—' : display}
                  {field.unit && num >= 0 && <span className="text-[10px] font-normal text-[var(--text-muted)] ml-0.5">{field.unit}</span>}
                </span>
              )}
            </div>
          )
        })}
        {items.length > max && (
          <div className="px-3 py-1.5 text-[10px] text-[var(--text-muted)]">+{items.length - max} more</div>
        )}
      </div>
    )
  }

  // ── text (default) ────────────────────────────────────────────────────────
  const str = val == null ? '—' : (typeof val === 'object' ? JSON.stringify(val) : String(val))
  return (
    <div className={card} style={bg}>
      <span className={lbl}>{label}</span>
      <span className="text-sm font-medium text-[var(--text)] leading-tight break-all line-clamp-2">
        {str}{field.unit && <span className="text-[10px] text-[var(--text-muted)] ml-1">{field.unit}</span>}
      </span>
    </div>
  )
}

// ── Action Panel ──────────────────────────────────────────────────────────────
function ActionPanel({ actions, cfg, onRefresh }: {
  actions: CustomAPIAction[]; cfg: CustomAPIConfig; onRefresh: () => void
}) {
  const [values,  setValues]  = useState<Record<string, string>>({})
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [busy,    setBusy]    = useState<Record<string, boolean>>({})
  const [fb,      setFb]      = useState<Record<string, { ok: boolean; msg: string }>>({})

  const fire = useCallback(async (action: CustomAPIAction, override?: string) => {
    if (action.confirm && !window.confirm(action.confirmMessage ?? `Run "${action.label}"?`)) return
    const id = action.id
    setBusy(p => ({ ...p, [id]: true }))
    setFb(p => { const n = { ...p }; delete n[id]; return n })

    const method   = action.method   ?? cfg.method   ?? 'POST'
    const url      = action.url      ?? cfg.url
    const val      = override ?? values[id] ?? action.value ?? ''
    let body: unknown
    if (action.bodyTemplate) {
      const rendered = action.bodyTemplate.replace(/\{\{value\}\}/g, String(val))
      try { body = JSON.parse(rendered) } catch { body = rendered }
    } else if (action.bodyPath) {
      body = setDeep({}, action.bodyPath, val)
    } else {
      body = val
    }

    try {
      const res = await fetch('/api/custom-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url, method,
          headers:    cfg.headers   ?? {},
          body,
          bodyType:   cfg.bodyType  ?? 'json',
          authType:   cfg.authType  ?? 'none',
          authValue:  cfg.authValue ?? '',
          authHeader: cfg.authHeader ?? 'X-API-Key',
          authQuery:  cfg.authQuery  ?? 'api_key',
        }),
      })
      const data = await res.json()
      if (data.error) {
        setFb(p => ({ ...p, [id]: { ok: false, msg: data.error } }))
      } else {
        setFb(p => ({ ...p, [id]: { ok: true, msg: 'Done ✓' } }))
        setTimeout(() => setFb(p => { const n = { ...p }; delete n[id]; return n }), 2500)
        onRefresh()
      }
    } catch (e) {
      setFb(p => ({ ...p, [id]: { ok: false, msg: e instanceof Error ? e.message : 'Failed' } }))
    } finally {
      setBusy(p => ({ ...p, [id]: false }))
    }
  }, [values, cfg, onRefresh])

  return (
    <div className="flex flex-col gap-2.5 p-2.5 border-t border-[var(--border)]">
      {actions.map(action => {
        const color   = DISP_COLORS[action.color ?? 'accent']
        const btnBg   = BTN_COLORS[action.color ?? 'accent']
        const loading = busy[action.id]
        const feedback = fb[action.id]

        // ── button ──────────────────────────────────────────────────────────
        if (action.type === 'button') return (
          <div key={action.id} className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fire(action, action.value)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: btnBg }}
            >{loading ? '…' : action.label}</button>
            {feedback && <span className={`text-[10px] ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.msg}</span>}
          </div>
        )

        // ── toggle ───────────────────────────────────────────────────────────
        if (action.type === 'toggle') {
          const isOn = toggles[action.id] ?? (action.value === action.onValue)
          return (
            <div key={action.id} className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs text-[var(--text-muted)] min-w-[60px] shrink-0">{action.label}</span>
              <button
                onClick={() => {
                  const next = !isOn
                  setToggles(p => ({ ...p, [action.id]: next }))
                  fire(action, next ? (action.onValue ?? 'true') : (action.offValue ?? 'false'))
                }}
                disabled={loading}
                className="relative w-9 h-5 rounded-full transition-colors duration-200 disabled:opacity-50 shrink-0"
                style={isOn ? { backgroundColor: color } : { backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${isOn ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <span className="text-[10px] text-[var(--text-muted)]">{isOn ? (action.onValue ?? 'On') : (action.offValue ?? 'Off')}</span>
              {feedback && <span className={`text-[10px] w-full ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.msg}</span>}
            </div>
          )
        }

        // ── select ───────────────────────────────────────────────────────────
        if (action.type === 'select') {
          const opts = action.options ?? []
          return (
            <div key={action.id} className="flex flex-col gap-1.5">
              <span className="text-xs text-[var(--text-muted)]">{action.label}</span>
              <div className="flex gap-2">
                <select
                  value={values[action.id] ?? ''}
                  onChange={e => setValues(p => ({ ...p, [action.id]: e.target.value }))}
                  className="flex-1 rounded px-2 py-1 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
                >
                  <option value="" disabled>Choose…</option>
                  {opts.map(o => <option key={o.value} value={o.value}>{o.label || o.value}</option>)}
                </select>
                <button
                  onClick={() => fire(action)}
                  disabled={loading || !values[action.id]}
                  className="px-2.5 py-1 rounded text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90 shrink-0"
                  style={{ backgroundColor: btnBg }}
                >{loading ? '…' : 'Set'}</button>
              </div>
              {feedback && <span className={`text-[10px] ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.msg}</span>}
            </div>
          )
        }

        // ── slider ───────────────────────────────────────────────────────────
        if (action.type === 'slider') {
          const min = action.min ?? 0, max = action.max ?? 100, step = action.step ?? 1
          const cur = values[action.id] ?? String(min)
          return (
            <div key={action.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">{action.label}</span>
                <span className="text-xs font-semibold tabular-nums" style={{ color }}>{cur}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={min} max={max} step={step} value={cur}
                  onChange={e => setValues(p => ({ ...p, [action.id]: e.target.value }))}
                  className="flex-1"
                  style={{ accentColor: color } as React.CSSProperties}
                />
                <button
                  onClick={() => fire(action)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90 shrink-0"
                  style={{ backgroundColor: btnBg }}
                >{loading ? '…' : 'Set'}</button>
              </div>
              {feedback && <span className={`text-[10px] ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.msg}</span>}
            </div>
          )
        }

        // ── input (text / textarea) ──────────────────────────────────────────
        return (
          <div key={action.id} className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">{action.label}</span>
            <div className="flex gap-2">
              {action.multiline ? (
                <textarea
                  value={values[action.id] ?? ''}
                  onChange={e => setValues(p => ({ ...p, [action.id]: e.target.value }))}
                  placeholder={action.placeholder}
                  rows={2}
                  className="flex-1 rounded px-2 py-1 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={values[action.id] ?? ''}
                  onChange={e => setValues(p => ({ ...p, [action.id]: e.target.value }))}
                  placeholder={action.placeholder}
                  className="flex-1 rounded px-2 py-1 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
                />
              )}
              <button
                onClick={() => fire(action)}
                disabled={loading}
                className="px-2.5 py-1 rounded text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90 shrink-0"
                style={{ backgroundColor: btnBg }}
              >{loading ? '…' : 'Send'}</button>
            </div>
            {feedback && <span className={`text-[10px] ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.msg}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export function CustomAPIWidget({ config }: CustomAPIWidgetProps) {
  const c       = config as unknown as CustomAPIConfig
  const fields  = c.fields  ?? []
  const actions = c.actions ?? []
  const isGet   = (c.method ?? 'GET') === 'GET'
  const sparkRef = useRef<SparkMap>(new Map())

  const buildUrl = () => {
    if (!c.url || !isGet) return null
    const p = new URLSearchParams({ url: c.url })
    if (c.jsonPath) p.set('path', c.jsonPath)
    if (c.authType && c.authType !== 'none') {
      p.set('auth',  c.authType)
      p.set('authv', c.authValue  ?? '')
      p.set('authh', c.authHeader ?? 'Authorization')
      p.set('authq', c.authQuery  ?? 'api_key')
    }
    if (c.headers) Object.entries(c.headers).forEach(([k, v]) => { p.append('hk', k); p.append('hv', v) })
    return `/api/custom-api?${p}`
  }

  const { data, isLoading, error, mutate } = useSWR<{ value: unknown; error?: string }>(
    buildUrl(),
    fetcher,
    { refreshInterval: (c.refreshInterval ?? 30) * 1000 },
  )

  if (!c.url) return <div className="px-4 py-3 text-sm text-[var(--text-muted)]">No API URL configured</div>

  if (isGet && isLoading) return <div className="flex items-center justify-center p-4"><Spinner size="sm" /></div>
  if (isGet && (error || data?.error)) return (
    <div className="px-4 py-3 flex items-center gap-2 text-xs text-red-400">
      <AlertCircle className="w-3.5 h-3.5" />{data?.error ?? 'Request failed'}
    </div>
  )

  const value  = data?.value
  const layout = c.layout ?? 'grid-2'
  const minItemWidth = layout === 'grid-3' ? '90px' : layout === 'list' ? '100%' : '120px'
  const gridTemplateColumns = layout === 'list'
    ? '1fr'
    : `repeat(auto-fit, ${minItemWidth})`

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* ── Multi-field display ─────────────────────────────────────────── */}
      {isGet && fields.length > 0 && (
        <div className="p-2.5 gap-2 flex-1" style={{
          display: 'grid',
          gridTemplateColumns,
          alignContent: 'space-evenly',
          justifyContent: 'space-evenly',
        }}>
          {fields.map((field, i) => (
            <FieldDisplay key={i} field={field} rootValue={value} sparkMap={sparkRef.current} idx={i} />
          ))}
        </div>
      )}

      {/* ── Legacy single-value display ─────────────────────────────────── */}
      {isGet && fields.length === 0 && (
        <div className="px-4 py-3 flex-1">
          {c.displayType === 'number' ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[var(--text)] tabular-nums leading-none">
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </span>
              {c.unit && <span className="text-sm text-[var(--text-muted)]">{c.unit}</span>}
            </div>
          ) : c.displayType === 'badge' ? (
            <div className="flex flex-wrap gap-2">
              {Array.isArray(value)
                ? value.map((v, i) => <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-[var(--accent)]/15 text-[var(--accent)]">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>)
                : <span className="px-2 py-0.5 rounded-full text-sm bg-[var(--accent)]/15 text-[var(--accent)]">{String(value)}</span>}
            </div>
          ) : c.displayType === 'list' ? (
            <ul className="flex flex-col gap-1.5">
              {(Array.isArray(value) ? value.slice(0, 8) : [value]).map((item, i) => (
                <li key={i} className="text-sm text-[var(--text)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                  {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-baseline gap-2">
              {c.label && <span className="text-xs text-[var(--text-muted)]">{c.label}:</span>}
              <span className="text-sm text-[var(--text)]">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')}
              </span>
              {c.unit && <span className="text-xs text-[var(--text-muted)]">{c.unit}</span>}
            </div>
          )}
        </div>
      )}

      {/* ── Non-GET placeholder when no actions defined ──────────────────── */}
      {!isGet && actions.length === 0 && (
        <div className="px-4 py-3 text-sm text-[var(--text-muted)]">
          {c.method} endpoint configured — add Actions to trigger it
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      {actions.length > 0 && (
        <ActionPanel actions={actions} cfg={c} onRefresh={mutate} />
      )}
    </div>
  )
}
