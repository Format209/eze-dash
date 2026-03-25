'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { SEARCH_ENGINES } from '@/lib/widgets'
import { useAppStore } from '@/store/appStore'
import { Save, Plus, Trash2, X } from 'lucide-react'
import type { Widget, WidgetType, ServiceEntry, BookmarkEntry } from '@/types'

type FormState = Record<string, unknown>

export function EditWidgetDialog() {
  const { dialog, closeDialog, updateWidgetInDashboard } = useAppStore()
  const open = dialog.type === 'edit-widget'
  const widget: Widget | null = open ? (dialog as { type: 'edit-widget'; widget: Widget }).widget : null

  const [form, setForm] = useState<FormState>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (widget) {
      setForm({ title: widget.title, colSpan: widget.colSpan, ...widget.config })
    }
  }, [widget])

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!widget) return
    setLoading(true)
    setError('')

    const { title, colSpan, ...config } = form
    try {
      const res = await fetch(`/api/widgets/${widget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, colSpan, config }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update widget')
      }
      const updated = await res.json()
      updateWidgetInDashboard(updated)
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!widget) return null

  return (
    <Modal
      open={open}
      onClose={closeDialog}
      title={`Edit Widget`}
      description={`Update settings for "${widget.title}"`}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        {/* Common fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Widget Title"
            value={form.title as string || ''}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Leave empty to hide header"
          />
          <Select
            label="Column Span"
            value={String(form.colSpan ?? 2)}
            onChange={(e) => set('colSpan', Number(e.target.value))}
            options={[
              { value: '1', label: '1 column (smallest)' },
              { value: '2', label: '2 columns' },
              { value: '3', label: '3 columns' },
              { value: '4', label: '4 columns (full)' },
            ]}
          />
        </div>

        <WidgetConfigForm type={widget.type} form={form} setField={set} />

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
          <Button variant="primary" loading={loading} icon={<Save className="w-4 h-4" />} onClick={handleSubmit}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const TIMEZONE_OPTIONS = [
  { value: 'local', label: 'Local (system default)' },
  ...Intl.supportedValuesOf('timeZone').map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') })),
]

// Re-uses same per-type forms, just inline here for edit context
function ClockConfigForm({ form, set }: { form: FormState; set: (k: string, v: unknown) => void }) {
  const [newTz, setNewTz] = useState('local')
  const [newLabel, setNewLabel] = useState('')
  const additionalTimezones = (form.additionalTimezones as Array<{ timezone: string; label?: string }>) || []

  const addTz = () => {
    if (additionalTimezones.some((e) => e.timezone === newTz)) return
    set('additionalTimezones', [...additionalTimezones, { timezone: newTz, label: newLabel.trim() || undefined }])
    setNewTz('local')
    setNewLabel('')
  }

  const removeTz = (i: number) => {
    set('additionalTimezones', additionalTimezones.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Clock Style" value={form.clockStyle as string || 'default'} onChange={(e) => set('clockStyle', e.target.value)} options={[
          { value: 'default', label: 'Default' },
          { value: 'large', label: 'Large (fills widget)' },
          { value: 'minimal', label: 'Minimal (inline)' },
          { value: 'card', label: 'Card segments' },
          { value: 'analog', label: 'Analog (clock face)' },
          { value: 'digital', label: 'Digital (LED glow)' },
          { value: 'flip', label: 'Flip clock' },
        ]} />
        <Select label="Format" value={form.format as string || '24h'} onChange={(e) => set('format', e.target.value)} options={[{ value: '24h', label: '24-hour' }, { value: '12h', label: '12-hour' }]} />
        <Select label="Primary Timezone" value={form.timezone as string || 'local'} onChange={(e) => set('timezone', e.target.value)} options={TIMEZONE_OPTIONS} />
        <Switch label="Show Date" checked={form.showDate !== false} onChange={(v) => set('showDate', v)} />
        <Switch label="Show Seconds" checked={form.showSeconds !== false} onChange={(v) => set('showSeconds', v)} />
      </div>

      {/* Additional timezones */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[var(--text-muted)]">Additional Timezones</p>
        {additionalTimezones.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] italic">None — add below to show multiple clocks.</p>
        )}
        {additionalTimezones.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-[var(--border)]">
            <span className="flex-1 text-xs text-[var(--text)]">{entry.label || entry.timezone.split('/').pop()?.replace(/_/g, ' ') || entry.timezone}</span>
            <span className="text-[10px] text-[var(--text-muted)]">{entry.timezone}</span>
            <button onClick={() => removeTz(i)} className="p-0.5 text-[var(--text-muted)] hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Select label="Timezone" value={newTz} onChange={(e) => setNewTz(e.target.value)} options={TIMEZONE_OPTIONS} />
          <Input label="Label (optional)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. New York" />
          <button
            onClick={addTz}
            className="h-9 px-3 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {additionalTimezones.length > 0 && (
        <Select
          label="Multi-clock Layout"
          value={form.multiLayout as string || 'list'}
          onChange={(e) => set('multiLayout', e.target.value)}
          options={[
            { value: 'list', label: 'List (stacked rows)' },
            { value: 'grid', label: 'Grid (2 columns)' },
          ]}
        />
      )}
    </div>
  )
}

function WidgetConfigForm({ type, form, setField: set }: { type: WidgetType; form: FormState; setField: (k: string, v: unknown) => void }) {
  switch (type) {
    case 'clock':
      return <ClockConfigForm form={form} set={set} />
    case 'greeting':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Your Name" value={form.name as string || ''} onChange={(e) => set('name', e.target.value)} placeholder="optional" />
          <Input label="Custom Greeting" value={form.customGreeting as string || ''} onChange={(e) => set('customGreeting', e.target.value)} placeholder="e.g. Welcome back" />
          <Input label="Sub-message" value={form.customMessage as string || ''} onChange={(e) => set('customMessage', e.target.value)} placeholder="e.g. Have a great day!" />
          <Select label="Text Size" value={form.greetingSize as string || 'md'} onChange={(e) => set('greetingSize', e.target.value)} options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
            { value: 'xl', label: 'Extra Large' },
          ]} />
          <Select label="Alignment" value={form.align as string || 'left'} onChange={(e) => set('align', e.target.value)} options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]} />
          <Switch label="Show Date" checked={form.showDate !== false} onChange={(v) => set('showDate', v)} />
          <Switch label="Show Time" checked={!!form.showTime} onChange={(v) => set('showTime', v)} />
          <Switch label="Show Emoji" checked={form.showEmoji !== false} onChange={(v) => set('showEmoji', v)} />
        </div>
      )
    case 'search':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Select label="Engine" value={form.engine as string || 'duckduckgo'} onChange={(e) => set('engine', e.target.value)} options={Object.entries(SEARCH_ENGINES).map(([v, { label }]) => ({ value: v, label }))} />
          <Input label="Placeholder" value={form.placeholder as string || ''} onChange={(e) => set('placeholder', e.target.value)} />
          <Switch label="Open in New Tab" checked={form.openInNewTab !== false} onChange={(v) => set('openInNewTab', v)} />
        </div>
      )
    case 'service': {
      const services: ServiceEntry[] = Array.isArray(form.services)
        ? (form.services as ServiceEntry[])
        : form.url
        ? [{ url: form.url as string, label: '', description: form.description as string || '', icon: form.icon as string || '', iconColor: '' }]
        : [{ url: '', label: '', description: '', icon: '', iconColor: '' }]

      const updateSvc = (index: number, field: keyof ServiceEntry, value: string) => {
        const next = services.map((s, i) => i === index ? { ...s, [field]: value } : s)
        set('services', next)
      }
      const addSvc = () => set('services', [...services, { url: '', label: '', description: '', icon: '', iconColor: '' }])
      const removeSvc = (index: number) => { if (services.length > 1) set('services', services.filter((_, i) => i !== index)) }

      return (
        <div className="flex flex-col gap-4">
          {services.map((svc, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--border)] bg-white/2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Service {i + 1}</span>
                {services.length > 1 && (
                  <button onClick={() => removeSvc(i)} className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Input label="URL *" value={svc.url} onChange={(e) => updateSvc(i, 'url', e.target.value)} type="url" placeholder="https://" />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Label" value={svc.label || ''} onChange={(e) => updateSvc(i, 'label', e.target.value)} placeholder="e.g. Plex" />
                <Input label="Description" value={svc.description || ''} onChange={(e) => updateSvc(i, 'description', e.target.value)} placeholder="optional" />
                <Input label="Icon (emoji)" value={svc.icon || ''} onChange={(e) => updateSvc(i, 'icon', e.target.value)} placeholder="🌐" />
              </div>
            </div>
          ))}
          <button onClick={addSvc} className="flex items-center gap-2 text-sm text-[var(--accent)] hover:opacity-80 transition-opacity">
            <Plus className="w-4 h-4" />
            Add Service
          </button>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
            <Input label="Check Interval (s)" type="number" value={form.checkInterval as number || 30} onChange={(e) => set('checkInterval', Number(e.target.value))} hint="Applied to all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Switch label="Show Status" checked={form.showStatus !== false} onChange={(v) => set('showStatus', v)} />
            <Switch label="Show Response Time" checked={form.showResponseTime !== false} onChange={(v) => set('showResponseTime', v)} />
          </div>
        </div>
      )
    }
    case 'bookmark': {
      const bookmarks: BookmarkEntry[] = Array.isArray(form.bookmarks)
        ? (form.bookmarks as BookmarkEntry[])
        : form.url
        ? [{ url: form.url as string, label: '', description: form.description as string || '', icon: form.icon as string || '', iconColor: '' }]
        : [{ url: '', label: '', description: '', icon: '', iconColor: '' }]

      const updateBm = (index: number, field: keyof BookmarkEntry, value: string) =>
        set('bookmarks', bookmarks.map((b, i) => i === index ? { ...b, [field]: value } : b))
      const addBm = () => set('bookmarks', [...bookmarks, { url: '', label: '', description: '', icon: '', iconColor: '' }])
      const removeBm = (i: number) => { if (bookmarks.length > 1) set('bookmarks', bookmarks.filter((_, idx) => idx !== i)) }

      return (
        <div className="flex flex-col gap-4">
          {bookmarks.map((bm, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--border)] bg-white/2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Bookmark {i + 1}</span>
                {bookmarks.length > 1 && (
                  <button onClick={() => removeBm(i)} className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Input label="URL *" value={bm.url} onChange={(e) => updateBm(i, 'url', e.target.value)} type="url" placeholder="https://" />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Label" value={bm.label || ''} onChange={(e) => updateBm(i, 'label', e.target.value)} placeholder="e.g. GitHub" />
                <Input label="Description" value={bm.description || ''} onChange={(e) => updateBm(i, 'description', e.target.value)} placeholder="optional" />
                <Input label="Icon (emoji)" value={bm.icon || ''} onChange={(e) => updateBm(i, 'icon', e.target.value)} placeholder="🔖" />
              </div>
            </div>
          ))}
          <button onClick={addBm} className="flex items-center gap-2 text-sm text-[var(--accent)] hover:opacity-80 transition-opacity">
            <Plus className="w-4 h-4" />
            Add Bookmark
          </button>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
            <Select label="Layout" value={form.layout as string || 'list'} onChange={(e) => set('layout', e.target.value)} options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid (2 cols)' }]} />
            <Switch label="Open in New Tab" checked={form.openInNewTab !== false} onChange={(v) => set('openInNewTab', v)} />
          </div>
        </div>
      )
    }
    case 'system':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Switch label="Show CPU" checked={form.showCPU !== false} onChange={(v) => set('showCPU', v)} />
          <Switch label="Show Memory" checked={form.showRAM !== false} onChange={(v) => set('showRAM', v)} />
          <Switch label="Show Disk" checked={form.showDisk !== false} onChange={(v) => set('showDisk', v)} />
          <Switch label="Show Uptime" checked={form.showUptime !== false} onChange={(v) => set('showUptime', v)} />
          <Input label="Refresh (seconds)" type="number" value={form.refreshInterval as number || 5} onChange={(e) => set('refreshInterval', Number(e.target.value))} />
        </div>
      )
    case 'weather':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Location Name" value={form.locationName as string || ''} onChange={(e) => set('locationName', e.target.value)} />
          <Select label="Units" value={form.units as string || 'celsius'} onChange={(e) => set('units', e.target.value)} options={[{ value: 'celsius', label: 'Celsius' }, { value: 'fahrenheit', label: 'Fahrenheit' }]} />
          <Input label="Latitude" type="number" step="0.0001" value={form.latitude as number || 40.7128} onChange={(e) => set('latitude', parseFloat(e.target.value))} />
          <Input label="Longitude" type="number" step="0.0001" value={form.longitude as number || -74.006} onChange={(e) => set('longitude', parseFloat(e.target.value))} />
          <Switch label="Show Forecast" checked={form.showForecast !== false} onChange={(v) => set('showForecast', v)} />
          <Input label="Forecast Days" type="number" min="1" max="7" value={form.forecastDays as number || 3} onChange={(e) => set('forecastDays', Number(e.target.value))} />
        </div>
      )
    case 'note':
      return <Textarea label="Content" value={form.content as string || ''} onChange={(e) => set('content', e.target.value)} rows={5} />
    case 'rss':
      return (
        <div className="grid grid-cols-1 gap-4">
          <Input label="RSS URL *" value={form.url as string || ''} onChange={(e) => set('url', e.target.value)} type="url" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Items" type="number" min="1" max="20" value={form.maxItems as number || 5} onChange={(e) => set('maxItems', Number(e.target.value))} />
            <Input label="Refresh (minutes)" type="number" value={form.refreshInterval as number || 15} onChange={(e) => set('refreshInterval', Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Switch label="Show Description" checked={!!form.showDescription} onChange={(v) => set('showDescription', v)} />
            <Switch label="Show Date" checked={form.showDate !== false} onChange={(v) => set('showDate', v)} />
            <Switch label="New Tab" checked={form.openInNewTab !== false} onChange={(v) => set('openInNewTab', v)} />
          </div>
        </div>
      )
    case 'docker':
      return (
        <div className="grid grid-cols-1 gap-4">
          <Input label="Docker Host" value={form.host as string || 'http://localhost:2375'} onChange={(e) => set('host', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Switch label="Show All Containers" checked={!!form.showAll} onChange={(v) => set('showAll', v)} />
            <Input label="Name Filter" value={form.containerFilter as string || ''} onChange={(e) => set('containerFilter', e.target.value)} />
          </div>
        </div>
      )
    case 'custom_api':
      return <CustomAPIConfigForm form={form} set={set} />
    case 'iframe':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="URL *" value={form.url as string || ''} onChange={(e) => set('url', e.target.value)} type="url" />
          </div>
          <Input label="Height (px)" type="number" value={form.height as number || 400} onChange={(e) => set('height', Number(e.target.value))} />
          <Switch label="Allow Fullscreen" checked={form.allowFullscreen !== false} onChange={(v) => set('allowFullscreen', v)} />
        </div>
      )
    case 'integration':
      return <IntegrationConfigForm form={form} set={set} />
    default:
      return null
  }
}

const CUSTOM_API_METHODS = [
  { value: 'GET',    label: 'GET' },
  { value: 'POST',   label: 'POST' },
  { value: 'PUT',    label: 'PUT' },
  { value: 'PATCH',  label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
]

const CUSTOM_API_AUTH_TYPES = [
  { value: 'none',       label: 'None' },
  { value: 'bearer',     label: 'Bearer Token' },
  { value: 'basic',      label: 'Basic Auth (Base64)' },
  { value: 'api-header', label: 'API Key — Header' },
  { value: 'api-query',  label: 'API Key — Query Param' },
]

const CUSTOM_API_BODY_TYPES = [
  { value: 'json', label: 'JSON' },
  { value: 'form', label: 'Form URL-encoded' },
  { value: 'text', label: 'Plain Text' },
]

const CUSTOM_API_LAYOUTS = [
  { value: 'grid-2', label: '2-column grid' },
  { value: 'grid-3', label: '3-column grid' },
  { value: 'list',   label: 'Single column list' },
]

const CUSTOM_API_DISPLAY_TYPES = [
  { value: 'text',      label: 'Text' },
  { value: 'number',    label: 'Number (large)' },
  { value: 'gauge',     label: 'Gauge' },
  { value: 'badge',     label: 'Badge / Pill' },
  { value: 'boolean',   label: 'Boolean (Yes/No)' },
  { value: 'sparkline', label: 'Sparkline Chart' },
  { value: 'datetime',  label: 'Date / Time' },
  { value: 'image',     label: 'Image URL' },
  { value: 'link',      label: 'Hyperlink' },
  { value: 'list',      label: 'Array List' },
  { value: 'json',      label: 'Raw JSON' },
  { value: 'color',     label: 'Color Swatch' },
  { value: 'items',     label: 'Items List (title/subtitle/value)' },
]

const CUSTOM_API_COLORS = [
  { value: 'accent',  label: 'Accent' },
  { value: 'green',   label: 'Green' },
  { value: 'red',     label: 'Red' },
  { value: 'yellow',  label: 'Yellow' },
  { value: 'blue',    label: 'Blue' },
  { value: 'default', label: 'Default' },
]

const CUSTOM_API_DATE_FORMATS = [
  { value: 'datetime', label: 'Date & Time' },
  { value: 'date',     label: 'Date only' },
  { value: 'time',     label: 'Time only' },
  { value: 'relative', label: 'Relative (5m ago)' },
]

const GAUGE_STYLES = [
  { value: 'bar', label: 'Bar' },
  { value: 'arc', label: 'Arc' },
]

const ACTION_TYPES = [
  { value: 'button', label: 'Button' },
  { value: 'toggle', label: 'Toggle Switch' },
  { value: 'input',  label: 'Text Input' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'slider', label: 'Slider' },
]

type ApiFieldDef = {
  path: string; label?: string; displayType: string
  unit?: string; min?: number; max?: number; color?: string
  gaugeStyle?: string; sparkPoints?: number; linkLabel?: string
  listMax?: number; dateFormat?: string
  // items display type
  itemTitle?: string; itemSubtitle?: string; itemValue?: string; itemMax?: number
}

// ── JSON path walker ──────────────────────────────────────────────────────────
type InspectedPath = {
  path: string
  inferredType: string
  sample: string
  isItems?: boolean
  itemFields?: { titlePath?: string; subtitlePath?: string; valuePath?: string }
}

function inferLeafType(val: unknown): string {
  if (typeof val === 'boolean') return 'boolean'
  if (typeof val === 'number') return 'number'
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return 'datetime'
    if (/^https?:\/\/.*\.(png|jpg|jpeg|gif|svg|webp)/i.test(val)) return 'image'
    if (/^https?:\/\//.test(val)) return 'link'
    if (/^#[0-9a-f]{3,6}$/i.test(val) || /^(rgb|hsl)\(/.test(val)) return 'color'
  }
  return 'text'
}

function walkPaths(obj: unknown, prefix = ''): InspectedPath[] {
  if (obj === null || obj === undefined) return []
  if (Array.isArray(obj)) {
    if (obj.length === 0) return []
    if (typeof obj[0] === 'object' && obj[0] !== null && !Array.isArray(obj[0])) {
      const first = obj[0] as Record<string, unknown>
      const keys = Object.keys(first)
      const primitiveKeys = keys.filter(k => typeof first[k] !== 'object')
      const titlePath = primitiveKeys.find(k => /^(name|title|label)$/i.test(k))
      const subtitlePath = primitiveKeys.find(k => /addr|host|url|desc|sub/i.test(k))
      const valuePath = primitiveKeys.find(k =>
        /^(ping|value|count|num|score|stat|ms|latency|duration|size|rate)$/i.test(k) &&
        typeof first[k] === 'number'
      )
      return [{ path: prefix, inferredType: 'items', sample: `[${obj.length} objects]`, isItems: true, itemFields: { titlePath, subtitlePath, valuePath } }]
    }
    const sample = `[${obj.slice(0, 3).map(v => String(v)).join(', ')}]`
    return [{ path: prefix, inferredType: 'list', sample }]
  }
  if (typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([key, val]) => {
      const p = prefix ? `${prefix}.${key}` : key
      if (typeof val === 'object' && val !== null) return walkPaths(val, p)
      return [{ path: p, inferredType: inferLeafType(val), sample: val == null ? 'null' : String(val).slice(0, 50) }]
    })
  }
  return [{ path: prefix, inferredType: inferLeafType(obj), sample: String(obj).slice(0, 50) }]
}

// ── JSON Inspector component ───────────────────────────────────────────────────
function JSONInspector({ onGenerate }: { onGenerate: (fields: ApiFieldDef[]) => void }) {
  const [jsonText, setJsonText] = useState('')
  const [paths, setPaths] = useState<InspectedPath[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [typeOverrides, setTypeOverrides] = useState<Record<string, string>>({})
  const [parseError, setParseError] = useState('')

  // Attempts to fix common JSON issues: trailing commas, single quotes, unquoted keys, JS comments
  const tryFix = (raw: string): string => {
    let s = raw.trim()
    // Strip JS line/block comments
    s = s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    // Replace single-quoted strings with double-quoted
    s = s.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"')
    // Quote unquoted object keys: { key: → { "key":
    s = s.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3')
    // Remove trailing commas before } or ]
    s = s.replace(/,(\s*[}\]])/g, '$1')
    return s
  }

  const format = () => {
    setParseError('')
    const attempts = [jsonText, tryFix(jsonText)]
    for (const attempt of attempts) {
      try {
        const obj = JSON.parse(attempt)
        setJsonText(JSON.stringify(obj, null, 2))
        setParseError('')
        return
      } catch { /* try next */ }
    }
    setParseError('Could not parse JSON — check for syntax errors above')
  }

  const inspect = () => {
    setParseError('')
    const attempts = [jsonText, tryFix(jsonText)]
    for (const attempt of attempts) {
      try {
        const obj = JSON.parse(attempt)
        const found = walkPaths(obj)
        setPaths(found)
        setSelected(new Set(found.map(p => p.path)))
        setTypeOverrides({})
        return
      } catch { /* try next */ }
    }
    try { JSON.parse(jsonText) } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  const toggle = (path: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(path) ? s.delete(path) : s.add(path); return s })

  const generate = () => {
    const newFields: ApiFieldDef[] = paths
      .filter(p => selected.has(p.path))
      .map(p => {
        const dt = typeOverrides[p.path] || p.inferredType
        const base: ApiFieldDef = {
          path: p.path,
          label: p.path.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || p.path,
          displayType: dt,
          color: 'accent',
        }
        if (dt === 'gauge') { base.min = 0; base.max = 100 }
        if (p.isItems && p.itemFields) {
          base.itemTitle = p.itemFields.titlePath
          base.itemSubtitle = p.itemFields.subtitlePath
          base.itemValue = p.itemFields.valuePath
        }
        return base
      })
    onGenerate(newFields)
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={jsonText}
        onChange={e => { setJsonText(e.target.value); setParseError(''); setPaths([]) }}
        placeholder={`Paste a sample JSON response here…\n{\n  "cpu": 42,\n  "memory": 78\n}`}
        rows={6}
        className="rounded-lg px-3 py-2 text-xs font-mono bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] resize-y focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
        spellCheck={false}
      />
      {parseError && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1.5">{parseError}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={inspect}
          disabled={!jsonText.trim()}
          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
        >Inspect JSON</button>
        <button
          onClick={format}
          disabled={!jsonText.trim()}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] text-xs font-medium hover:bg-white/5 disabled:opacity-40 transition-colors"
        >Format / Fix</button>
        {jsonText.trim() && (
          <button
            onClick={() => { setJsonText(''); setPaths([]); setParseError('') }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors ml-auto"
          >Clear</button>
        )}
      </div>

      {paths.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Detected paths — select to generate fields</span>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(paths.map(p => p.path)))} className="text-[10px] text-[var(--accent)] hover:opacity-80">All</button>
              <button onClick={() => setSelected(new Set())} className="text-[10px] text-[var(--text-muted)] hover:opacity-80">None</button>
            </div>
          </div>
          <div className="flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] overflow-hidden">
            {paths.map(p => (
              <div key={p.path} className={`flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${selected.has(p.path) ? 'bg-[var(--accent)]/5' : 'opacity-50'}`}>
                <input type="checkbox" checked={selected.has(p.path)} onChange={() => toggle(p.path)}
                  className="accent-[var(--accent)] shrink-0" />
                <span className="font-mono text-[var(--text)] min-w-[120px] truncate">{p.path}</span>
                <span className="text-[var(--text-muted)] truncate flex-1">{p.sample}</span>
                <select
                  value={typeOverrides[p.path] || p.inferredType}
                  onChange={e => setTypeOverrides(prev => ({ ...prev, [p.path]: e.target.value }))}
                  className="rounded px-1.5 py-0.5 text-[10px] bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] shrink-0"
                >
                  {CUSTOM_API_DISPLAY_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={generate}
              disabled={selected.size === 0}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >Add {selected.size} Field{selected.size !== 1 ? 's' : ''} →</button>
          </div>
        </div>
      )}
    </div>
  )
}

type ApiActionDef = {
  id: string; type: string; label: string; color?: string
  url?: string; method?: string
  bodyPath?: string; bodyTemplate?: string
  value?: string; onValue?: string; offValue?: string
  options?: Array<{ value: string; label: string }>
  min?: number; max?: number; step?: number
  placeholder?: string; multiline?: boolean
  confirm?: boolean; confirmMessage?: string
}

const mkId = () => Math.random().toString(36).slice(2, 10)

const SEC = 'border border-[var(--border)] rounded-lg overflow-hidden'
const SEC_HDR = 'px-3 py-2 bg-[rgba(255,255,255,0.03)] text-xs font-semibold text-[var(--text)] border-b border-[var(--border)]'
const SEC_BODY = 'p-3 flex flex-col gap-3'

function CustomAPIConfigForm({ form, set }: { form: FormState; set: (k: string, v: unknown) => void }) {
  const fields   = (form.fields   as ApiFieldDef[]   | undefined) ?? []
  const actions  = (form.actions  as ApiActionDef[]  | undefined) ?? []
  const headers  = (form.headers  as Record<string, string> | undefined) ?? {}
  const method   = (form.method   as string) || 'GET'
  const authType = (form.authType as string) || 'none'
  const isGet    = method === 'GET'


  // Header key-value pairs
  const hPairs = Object.entries(headers)
  const setHdrs = (pairs: [string, string][]) =>
    set('headers', Object.fromEntries(pairs.filter(([k]) => k.trim())))

  // Field helpers
  const updF = (i: number, k: string, v: unknown) =>
    set('fields', fields.map((f, idx) => idx === i ? { ...f, [k]: v } : f))
  const addF = () =>
    set('fields', [...fields, { path: '', label: '', displayType: 'text', color: 'accent' }])
  const delF = (i: number) => set('fields', fields.filter((_, idx) => idx !== i))

  // Action helpers
  const updA = (i: number, k: string, v: unknown) =>
    set('actions', actions.map((a, idx) => idx === i ? { ...a, [k]: v } : a))
  const addA = () =>
    set('actions', [...actions, { id: mkId(), type: 'button', label: 'Action', color: 'accent' }])
  const delA = (i: number) => set('actions', actions.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-4">

      {/* ── General ──────────────────────────────────────────────────────── */}
      <div className={SEC}>
        <div className={SEC_HDR}>General</div>
        <div className={SEC_BODY}>
          <Input
            label="API URL *"
            value={form.url as string || ''}
            onChange={e => set('url', e.target.value)}
            type="url"
            placeholder="https://api.example.com/data"
          />
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="HTTP Method"
              value={method}
              onChange={e => set('method', e.target.value)}
              options={CUSTOM_API_METHODS}
            />
            <Input
              label="Refresh (seconds)"
              type="number"
              min="5"
              value={form.refreshInterval as number || 30}
              onChange={e => set('refreshInterval', Number(e.target.value))}
            />
            <Select
              label="Field Layout"
              value={(form.layout as string) || 'grid-2'}
              onChange={e => set('layout', e.target.value)}
              options={CUSTOM_API_LAYOUTS}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Root JSON Path"
              value={form.jsonPath as string || ''}
              onChange={e => set('jsonPath', e.target.value)}
              placeholder="data.results"
              hint="Applied before each field path"
            />
            <Input
              label="Label (legacy single-value)"
              value={form.label as string || ''}
              onChange={e => set('label', e.target.value)}
              placeholder="My Value"
            />
          </div>
          <div className="border-t border-[var(--border)] pt-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">Sample Response <span className="normal-case font-normal">— paste to auto-detect fields</span></p>
            <JSONInspector onGenerate={newFields => set('fields', [...fields, ...newFields])} />
          </div>
        </div>
      </div>

      {/* ── Authentication ────────────────────────────────────────────────── */}
      <div className={SEC}>
        <div className={SEC_HDR}>Authentication</div>
        <div className={SEC_BODY}>
          <Select
            label="Auth Type"
            value={authType}
            onChange={e => set('authType', e.target.value)}
            options={CUSTOM_API_AUTH_TYPES}
          />
          {authType !== 'none' && (
            <Input
              label={authType === 'bearer' ? 'Bearer Token' : authType === 'basic' ? 'Base64 Credentials (user:pass)' : 'API Key / Token'}
              value={form.authValue as string || ''}
              onChange={e => set('authValue', e.target.value)}
              type="password"
            />
          )}
          {authType === 'api-header' && (
            <Input
              label="Header Name"
              value={form.authHeader as string || 'X-API-Key'}
              onChange={e => set('authHeader', e.target.value)}
              placeholder="X-API-Key"
            />
          )}
          {authType === 'api-query' && (
            <Input
              label="Query Param Name"
              value={form.authQuery as string || 'api_key'}
              onChange={e => set('authQuery', e.target.value)}
              placeholder="api_key"
            />
          )}
        </div>
      </div>

      {/* ── Request Body (non-GET) ────────────────────────────────────────── */}
      {!isGet && (
        <div className={SEC}>
          <div className={SEC_HDR}>Request Body</div>
          <div className={SEC_BODY}>
            <Select
              label="Content Type"
              value={(form.bodyType as string) || 'json'}
              onChange={e => set('bodyType', e.target.value)}
              options={CUSTOM_API_BODY_TYPES}
            />
            <Textarea
              label="Default Body (optional)"
              value={form.body as string || ''}
              onChange={e => set('body', e.target.value)}
              placeholder={'{"key": "value"}'}
              rows={3}
            />
          </div>
        </div>
      )}

      {/* ── Custom Headers ────────────────────────────────────────────────── */}
      <div className={SEC}>
        <div className={SEC_HDR}>
          <div className="flex items-center justify-between">
            <span>Custom Headers</span>
            <button
              onClick={() => setHdrs([...hPairs, ['', '']])}
              className="text-[10px] text-[var(--accent)] hover:opacity-80 font-normal"
            >+ Add Header</button>
          </div>
        </div>
        {hPairs.length === 0 ? (
          <div className="px-3 py-2 text-[10px] text-[var(--text-muted)]">No custom headers</div>
        ) : (
          <div className="p-3 flex flex-col gap-2">
            {hPairs.map(([k, v], i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={k}
                  onChange={e => { const n = [...hPairs] as [string,string][]; n[i]=[e.target.value,v]; setHdrs(n) }}
                  placeholder="Header-Name"
                  className="flex-1 rounded px-2 py-1 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
                />
                <input
                  value={v}
                  onChange={e => { const n = [...hPairs] as [string,string][]; n[i]=[k,e.target.value]; setHdrs(n) }}
                  placeholder="Value"
                  className="flex-1 rounded px-2 py-1 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
                />
                <button
                  onClick={() => setHdrs(hPairs.filter((_, j) => j !== i) as [string,string][])}
                  className="p-1 text-[var(--text-muted)] hover:text-red-400 shrink-0"
                ><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Fields ───────────────────────────────────────────────────────── */}
      <div className={SEC}>
        <div className={SEC_HDR}>
          <div className="flex items-center justify-between">
            <div>
              <span>Fields</span>
              <span className="ml-2 text-[10px] font-normal text-[var(--text-muted)]">Map JSON paths to display types</span>
            </div>
            <Button variant="outline" size="sm" icon={<Plus className="w-3 h-3" />} onClick={addF}>
              Add Field
            </Button>
          </div>
        </div>
        <div className="p-3 flex flex-col gap-3">
          {fields.length === 0 && (
            <div className="rounded border border-dashed border-[var(--border)] py-4 text-center text-xs text-[var(--text-muted)]">
              No fields yet — add one to map API values to display cards
            </div>
          )}
          {fields.map((field, idx) => {
            const dt       = field.displayType
            const isGauge  = dt === 'gauge'
            const isNum    = dt === 'number'
            const isSpark  = dt === 'sparkline'
            const isDt     = dt === 'datetime'
            const isList   = dt === 'list'
            const isLink   = dt === 'link'
            const isItems  = dt === 'items'
            return (
              <div key={idx} className="rounded-lg border border-[var(--border)] p-3 flex flex-col gap-2.5">
                <div className="flex gap-2 items-end">
                  <Input label="JSON Path *" placeholder="cpu.usage" value={field.path}
                    onChange={e => updF(idx, 'path', e.target.value)} className="flex-1" />
                  <Input label="Label" placeholder="CPU Usage" value={field.label || ''}
                    onChange={e => updF(idx, 'label', e.target.value)} className="flex-1" />
                  <button onClick={() => delF(idx)}
                    className="mb-0.5 p-2 rounded-lg hover:bg-red-500/15 text-[var(--text-muted)] hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className={`grid gap-2 ${isGauge ? 'grid-cols-5' : 'grid-cols-3'}`}>
                  <Select label="Display Type" value={dt || 'text'}
                    onChange={e => updF(idx, 'displayType', e.target.value)}
                    options={CUSTOM_API_DISPLAY_TYPES} />
                  <Select label="Color" value={field.color || 'accent'}
                    onChange={e => updF(idx, 'color', e.target.value)}
                    options={CUSTOM_API_COLORS} />
                  {(isGauge || isNum || isSpark) && (
                    <Input label="Unit" placeholder="%" value={field.unit || ''}
                      onChange={e => updF(idx, 'unit', e.target.value)} />
                  )}
                  {isGauge && (
                    <Select label="Gauge Style" value={field.gaugeStyle || 'bar'}
                      onChange={e => updF(idx, 'gaugeStyle', e.target.value)}
                      options={GAUGE_STYLES} />
                  )}
                  {isGauge && (
                    <Input label="Min" type="number" value={field.min ?? 0}
                      onChange={e => updF(idx, 'min', Number(e.target.value))} />
                  )}
                  {isGauge && (
                    <Input label="Max" type="number" value={field.max ?? 100}
                      onChange={e => updF(idx, 'max', Number(e.target.value))} />
                  )}
                  {isSpark && (
                    <Input label="History Points" type="number" placeholder="20"
                      value={field.sparkPoints || ''}
                      onChange={e => updF(idx, 'sparkPoints', Number(e.target.value) || undefined)} />
                  )}
                  {isDt && (
                    <Select label="Date Format" value={field.dateFormat || 'datetime'}
                      onChange={e => updF(idx, 'dateFormat', e.target.value)}
                      options={CUSTOM_API_DATE_FORMATS} />
                  )}
                  {isList && (
                    <Input label="Max Items" type="number" placeholder="6"
                      value={field.listMax || ''}
                      onChange={e => updF(idx, 'listMax', Number(e.target.value) || undefined)} />
                  )}
                  {isLink && (
                    <Input label="Link Label" placeholder="Open link" value={field.linkLabel || ''}
                      onChange={e => updF(idx, 'linkLabel', e.target.value)} />
                  )}
                </div>
                {isItems && (
                  <div className="grid grid-cols-4 gap-2 pt-1 border-t border-[var(--border)]/50">
                    <Input label="Title sub-path" placeholder="name" value={(field as ApiFieldDef).itemTitle || ''}
                      onChange={e => updF(idx, 'itemTitle', e.target.value)} />
                    <Input label="Subtitle sub-path" placeholder="address" value={(field as ApiFieldDef).itemSubtitle || ''}
                      onChange={e => updF(idx, 'itemSubtitle', e.target.value)} />
                    <Input label="Value sub-path" placeholder="ping" value={(field as ApiFieldDef).itemValue || ''}
                      onChange={e => updF(idx, 'itemValue', e.target.value)} />
                    <Input label="Unit" placeholder="ms" value={field.unit || ''}
                      onChange={e => updF(idx, 'unit', e.target.value)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className={SEC}>
        <div className={SEC_HDR}>
          <div className="flex items-center justify-between">
            <div>
              <span>Actions</span>
              <span className="ml-2 text-[10px] font-normal text-[var(--text-muted)]">Buttons, toggles, inputs, sliders, selects</span>
            </div>
            <Button variant="outline" size="sm" icon={<Plus className="w-3 h-3" />} onClick={addA}>
              Add Action
            </Button>
          </div>
        </div>
        <div className="p-3 flex flex-col gap-3">
          {actions.length === 0 && (
            <div className="rounded border border-dashed border-[var(--border)] py-4 text-center text-xs text-[var(--text-muted)]">
              No actions yet — add one to send data to your API
            </div>
          )}
          {actions.map((action, idx) => {
            const at       = action.type || 'button'
            const isToggle = at === 'toggle'
            const isSelect = at === 'select'
            const isSlider = at === 'slider'
            const isInput  = at === 'input'
            const isButton = at === 'button'
            const opts     = action.options ?? []
            return (
              <div key={idx} className="rounded-lg border border-[var(--border)] p-3 flex flex-col gap-2.5">
                {/* Type + Label + Delete */}
                <div className="flex gap-2 items-end">
                  <Select label="Type" value={at}
                    onChange={e => updA(idx, 'type', e.target.value)}
                    options={ACTION_TYPES} />
                  <Input label="Label" placeholder="Run Action" value={action.label || ''}
                    onChange={e => updA(idx, 'label', e.target.value)} className="flex-1" />
                  <button onClick={() => delA(idx)}
                    className="mb-0.5 p-2 rounded-lg hover:bg-red-500/15 text-[var(--text-muted)] hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Color + Method override + URL override */}
                <div className="grid grid-cols-3 gap-2">
                  <Select label="Color" value={action.color || 'accent'}
                    onChange={e => updA(idx, 'color', e.target.value)}
                    options={CUSTOM_API_COLORS} />
                  <Select label="Method Override"
                    value={action.method || ''}
                    onChange={e => updA(idx, 'method', e.target.value || undefined)}
                    options={[{ value: '', label: '— inherit —' }, ...CUSTOM_API_METHODS]} />
                  <Input label="URL Override" placeholder="(uses widget URL)"
                    value={action.url || ''}
                    onChange={e => updA(idx, 'url', e.target.value || undefined)} />
                </div>
                {/* Button: static value */}
                {isButton && (
                  <Input label="Value / Payload" placeholder='{"cmd":"restart"}' value={action.value || ''}
                    onChange={e => updA(idx, 'value', e.target.value)} />
                )}
                {/* Toggle: body path + on/off values */}
                {isToggle && (
                  <div className="grid grid-cols-3 gap-2">
                    <Input label="Body Path" placeholder="state" value={action.bodyPath || ''}
                      onChange={e => updA(idx, 'bodyPath', e.target.value)} />
                    <Input label="On Value" placeholder="true" value={action.onValue || ''}
                      onChange={e => updA(idx, 'onValue', e.target.value)} />
                    <Input label="Off Value" placeholder="false" value={action.offValue || ''}
                      onChange={e => updA(idx, 'offValue', e.target.value)} />
                  </div>
                )}
                {/* Input: body path + placeholder + multiline */}
                {isInput && (
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <Input label="Body Path" placeholder="message" value={action.bodyPath || ''}
                      onChange={e => updA(idx, 'bodyPath', e.target.value)} />
                    <Input label="Placeholder" value={action.placeholder || ''}
                      onChange={e => updA(idx, 'placeholder', e.target.value)} />
                    <Switch label="Multiline" checked={!!action.multiline}
                      onChange={v => updA(idx, 'multiline', v)} />
                  </div>
                )}
                {/* Slider: body path + min/max/step */}
                {isSlider && (
                  <div className="grid grid-cols-4 gap-2">
                    <Input label="Body Path" placeholder="brightness" value={action.bodyPath || ''}
                      onChange={e => updA(idx, 'bodyPath', e.target.value)} />
                    <Input label="Min" type="number" value={action.min ?? 0}
                      onChange={e => updA(idx, 'min', Number(e.target.value))} />
                    <Input label="Max" type="number" value={action.max ?? 100}
                      onChange={e => updA(idx, 'max', Number(e.target.value))} />
                    <Input label="Step" type="number" value={action.step ?? 1}
                      onChange={e => updA(idx, 'step', Number(e.target.value))} />
                  </div>
                )}
                {/* Select: body path + options list */}
                {isSelect && (
                  <div className="flex flex-col gap-2">
                    <Input label="Body Path" placeholder="mode" value={action.bodyPath || ''}
                      onChange={e => updA(idx, 'bodyPath', e.target.value)} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Options</span>
                      <button
                        onClick={() => updA(idx, 'options', [...opts, { value: '', label: '' }])}
                        className="text-[10px] text-[var(--accent)] hover:opacity-80"
                      >+ Add Option</button>
                    </div>
                    {opts.map((o, oi) => (
                      <div key={oi} className="flex gap-2 items-center">
                        <input value={o.value}
                          onChange={e => updA(idx, 'options', opts.map((x, xi) => xi === oi ? { ...x, value: e.target.value } : x))}
                          placeholder="value"
                          className="flex-1 rounded px-2 py-1 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]" />
                        <input value={o.label}
                          onChange={e => updA(idx, 'options', opts.map((x, xi) => xi === oi ? { ...x, label: e.target.value } : x))}
                          placeholder="Label"
                          className="flex-1 rounded px-2 py-1 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]" />
                        <button onClick={() => updA(idx, 'options', opts.filter((_, xi) => xi !== oi))}
                          className="p-1 text-[var(--text-muted)] hover:text-red-400 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Body Template (all types) */}
                <Textarea
                  label="Body Template (optional — use {{value}} placeholder)"
                  value={action.bodyTemplate || ''}
                  onChange={e => updA(idx, 'bodyTemplate', e.target.value || undefined)}
                  placeholder='{"command": "{{value}}"}'
                  rows={2}
                />
                {/* Confirmation */}
                <div className="flex items-center gap-3">
                  <Switch label="Require Confirmation" checked={!!action.confirm}
                    onChange={v => updA(idx, 'confirm', v)} />
                  {action.confirm && (
                    <Input label="Confirmation Message" value={action.confirmMessage || ''}
                      onChange={e => updA(idx, 'confirmMessage', e.target.value)}
                      className="flex-1"
                      placeholder={`Run "${action.label}"?`} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

const INTEGRATION_SERVICES = [
  { value: 'pihole', label: 'Pi-hole', auth: 'apikey', keyLabel: 'API Password / Token', keyHint: 'Found in Settings → API' },
  { value: 'adguard', label: 'AdGuard Home', auth: 'userpass' },
  { value: 'sonarr', label: 'Sonarr', auth: 'apikey', keyLabel: 'API Key', keyHint: 'Settings → General → API Key' },
  { value: 'radarr', label: 'Radarr', auth: 'apikey', keyLabel: 'API Key', keyHint: 'Settings → General → API Key' },
  { value: 'lidarr', label: 'Lidarr', auth: 'apikey', keyLabel: 'API Key' },
  { value: 'readarr', label: 'Readarr', auth: 'apikey', keyLabel: 'API Key' },
  { value: 'prowlarr', label: 'Prowlarr', auth: 'apikey', keyLabel: 'API Key' },
  { value: 'qbittorrent', label: 'qBittorrent', auth: 'userpass' },
  { value: 'transmission', label: 'Transmission', auth: 'userpass' },
  { value: 'sabnzbd', label: 'SABnzbd', auth: 'apikey', keyLabel: 'API Key' },
  { value: 'nzbget', label: 'NZBGet', auth: 'userpass' },
  { value: 'flood', label: 'Flood', auth: 'userpass' },
  { value: 'jellyfin', label: 'Jellyfin', auth: 'apikey', keyLabel: 'API Key', keyHint: 'Dashboard → API Keys' },
  { value: 'emby', label: 'Emby', auth: 'apikey', keyLabel: 'API Key' },
  { value: 'portainer', label: 'Portainer', auth: 'apikey', keyLabel: 'Access Token', keyHint: 'User Settings → Access Tokens' },
  { value: 'nextcloud', label: 'Nextcloud', auth: 'userpass' },
  { value: 'gitea', label: 'Gitea', auth: 'apikey', keyLabel: 'Access Token', keyHint: 'Settings → Applications' },
  { value: 'proxmox', label: 'Proxmox VE', auth: 'apikey', keyLabel: 'API Token', keyHint: 'Format: user@realm!token-name=secret' },
  { value: 'uptime_kuma', label: 'Uptime Kuma', auth: 'slug', keyLabel: '' },
  { value: 'home_assistant', label: 'Home Assistant', auth: 'apikey', keyLabel: 'Long-Lived Access Token', keyHint: 'Profile → Long-Lived Access Tokens → Create Token' },
] as const

function IntegrationConfigForm({ form, set }: { form: FormState; set: (k: string, v: unknown) => void }) {
  const service = form.service as string || ''
  const def = INTEGRATION_SERVICES.find((s) => s.value === service)
  const auth = def?.auth

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Service *"
        value={service}
        onChange={(e) => set('service', e.target.value)}
        options={[
          { value: '', label: '— Choose a service —' },
          ...INTEGRATION_SERVICES.map((s) => ({ value: s.value, label: s.label })),
        ]}
      />
      <Input
        label="Base URL *"
        value={form.url as string || ''}
        onChange={(e) => set('url', e.target.value)}
        type="url"
        placeholder="http://192.168.1.x:port"
        hint="Include protocol and port, no trailing slash"
      />
      {(auth === 'apikey') && (
        <Input
          label={def?.keyLabel || 'API Key'}
          value={form.apiKey as string || ''}
          onChange={(e) => set('apiKey', e.target.value)}
          type="password"
          hint={def && 'keyHint' in def ? String(def.keyHint) : undefined}
        />
      )}
      {(auth === 'userpass') && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Username" value={form.username as string || ''} onChange={(e) => set('username', e.target.value)} />
          <Input label="Password" value={form.password as string || ''} onChange={(e) => set('password', e.target.value)} type="password" />
        </div>
      )}
      {(auth === 'slug') && (
        <Input
          label="Status Page Slug"
          value={form.slug as string || ''}
          onChange={(e) => set('slug', e.target.value)}
          placeholder="default"
          hint="The slug used in the public status page URL"
        />
      )}
      <Input
        label="Refresh Interval (seconds)"
        type="number"
        min="10"
        value={form.refreshInterval as number || 30}
        onChange={(e) => set('refreshInterval', Number(e.target.value))}
      />
    </div>
  )
}
