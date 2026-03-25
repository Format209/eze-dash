'use client'

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { WIDGET_REGISTRY, WIDGET_CATEGORIES, getWidgetDef, SEARCH_ENGINES } from '@/lib/widgets'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/cn'
import * as LucideIcons from 'lucide-react'
import { ArrowLeft, ArrowRight, Check, LayoutDashboard, Plus, Trash2 } from 'lucide-react'
import type { ServiceEntry, BookmarkEntry } from '@/types'
import type { WidgetType } from '@/types'

function DynIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>
  const pascal = name.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')
  const Icon = icons[pascal] || LayoutDashboard
  return <Icon className={className} />
}

type Step = 'choose' | 'configure'

interface WidgetFormState {
  title: string
  colSpan: number
  [key: string]: unknown
}

export function AddWidgetDialog() {
  const { dialog, closeDialog, currentDashboard, addWidgetToDashboard } = useAppStore()
  const open = dialog.type === 'add-widget'

  const [step, setStep] = useState<Step>('choose')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null)
  const [form, setForm] = useState<WidgetFormState>({ title: '', colSpan: 2 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = useCallback(() => {
    setStep('choose')
    setSelectedType(null)
    setForm({ title: '', colSpan: 2 })
    setError('')
    setActiveCategory('all')
  }, [])

  const handleClose = () => {
    reset()
    closeDialog()
  }

  const handleChoose = (type: WidgetType) => {
    const def = getWidgetDef(type)!
    setSelectedType(type)
    setForm({
      title: '',
      colSpan: def.defaultColSpan,
      ...def.defaultConfig,
    })
    setStep('configure')
  }

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!selectedType || !currentDashboard) return
    setLoading(true)
    setError('')

    const { title, colSpan, ...config } = form
    try {
      const res = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          title,
          config,
          colSpan,
          dashboardId: currentDashboard.id,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create widget')
      }
      const widget = await res.json()
      addWidgetToDashboard(widget)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const filteredWidgets =
    activeCategory === 'all'
      ? WIDGET_REGISTRY
      : WIDGET_REGISTRY.filter((w) => w.category === activeCategory)

  const def = selectedType ? getWidgetDef(selectedType) : null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 'choose' ? 'Add Widget' : `Configure ${def?.label}`}
      description={step === 'choose' ? 'Choose a widget type to add to your dashboard' : 'Configure your widget settings'}
      size="lg"
    >
      {step === 'choose' ? (
        <div className="flex flex-col gap-4">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                activeCategory === 'all'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-white/8 text-[var(--text-muted)] hover:text-[var(--text)]'
              )}
            >
              All
            </button>
            {WIDGET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  activeCategory === cat.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-white/8 text-[var(--text-muted)] hover:text-[var(--text)]'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Widget grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredWidgets.map((w) => (
              <button
                key={w.type}
                onClick={() => handleChoose(w.type)}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border border-[var(--border)] bg-white/3 hover:bg-white/8 hover:border-[var(--accent)]/50 transition-all text-left group"
              >
                <div className="p-2 rounded-lg bg-[var(--accent)]/15 group-hover:bg-[var(--accent)]/25 transition-colors">
                  <DynIcon name={w.icon} className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--text)]">{w.label}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">{w.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Title & Size */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Widget Title"
              value={form.title as string}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Leave empty to hide header"
            />
            <Select
              label="Column Span"
              value={String(form.colSpan)}
              onChange={(e) => set('colSpan', Number(e.target.value))}
              options={[
                { value: '1', label: '1 column (smallest)' },
                { value: '2', label: '2 columns' },
                { value: '3', label: '3 columns' },
                { value: '4', label: '4 columns (full)' },
              ]}
            />
          </div>

          {/* Widget-specific config */}
          <WidgetConfigForm type={selectedType!} form={form} setField={set} />

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => setStep('choose')}>
              Back
            </Button>
            <Button
              variant="primary"
              loading={loading}
              icon={<Check className="w-4 h-4" />}
              onClick={handleSubmit}
            >
              Add Widget
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Per-type config forms ───────────────────────────────────────────────────

interface FormProps {
  type: WidgetType
  form: WidgetFormState
  setField: (key: string, value: unknown) => void
}

function WidgetConfigForm({ type, form, setField }: FormProps) {
  switch (type) {
    case 'clock': return <ClockForm form={form} set={setField} />
    case 'greeting': return <GreetingForm form={form} set={setField} />
    case 'search': return <SearchForm form={form} set={setField} />
    case 'service': return <ServiceForm form={form} set={setField} />
    case 'bookmark': return <BookmarkForm form={form} set={setField} />
    case 'system': return <SystemForm form={form} set={setField} />
    case 'weather': return <WeatherForm form={form} set={setField} />
    case 'note': return <NoteForm form={form} set={setField} />
    case 'rss': return <RSSForm form={form} set={setField} />
    case 'docker': return <DockerForm form={form} set={setField} />
    case 'custom_api': return <CustomAPIForm form={form} set={setField} />
    case 'iframe': return <IframeForm form={form} set={setField} />
    default: return null
  }
}

function ClockForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Select
        label="Clock Style"
        value={form.clockStyle as string || 'default'}
        onChange={(e) => set('clockStyle', e.target.value)}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'large', label: 'Large (fills widget)' },
          { value: 'minimal', label: 'Minimal (inline)' },
          { value: 'card', label: 'Card segments' },
          { value: 'analog', label: 'Analog (clock face)' },
          { value: 'digital', label: 'Digital (LED glow)' },
          { value: 'flip', label: 'Flip clock' },
        ]}
      />
      <Select
        label="Time Format"
        value={form.format as string || '24h'}
        onChange={(e) => set('format', e.target.value)}
        options={[{ value: '24h', label: '24-hour' }, { value: '12h', label: '12-hour (AM/PM)' }]}
      />
      <Input
        label="Timezone"
        value={form.timezone as string || 'local'}
        onChange={(e) => set('timezone', e.target.value)}
        placeholder="e.g. America/New_York"
        hint="Use IANA timezone name or 'local'"
      />
      <Switch label="Show Date" checked={form.showDate !== false} onChange={(v) => set('showDate', v)} />
      <Switch label="Show Seconds" checked={form.showSeconds !== false} onChange={(v) => set('showSeconds', v)} />
    </div>
  )
}

function GreetingForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="Your Name (optional)"
        value={form.name as string || ''}
        onChange={(e) => set('name', e.target.value)}
        placeholder="e.g. Alex"
      />
      <Input
        label="Custom Greeting (optional)"
        value={form.customGreeting as string || ''}
        onChange={(e) => set('customGreeting', e.target.value)}
        placeholder="e.g. Welcome back"
      />
      <Input
        label="Sub-message (optional)"
        value={form.customMessage as string || ''}
        onChange={(e) => set('customMessage', e.target.value)}
        placeholder="e.g. Have a great day!"
      />
      <Select
        label="Text Size"
        value={form.greetingSize as string || 'md'}
        onChange={(e) => set('greetingSize', e.target.value)}
        options={[
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium (default)' },
          { value: 'lg', label: 'Large' },
          { value: 'xl', label: 'Extra Large' },
        ]}
      />
      <Select
        label="Alignment"
        value={form.align as string || 'left'}
        onChange={(e) => set('align', e.target.value)}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ]}
      />
      <Switch label="Show Date" checked={form.showDate !== false} onChange={(v) => set('showDate', v)} />
      <Switch label="Show Time" checked={!!form.showTime} onChange={(v) => set('showTime', v)} />
      <Switch label="Show Emoji" checked={form.showEmoji !== false} onChange={(v) => set('showEmoji', v)} />
    </div>
  )
}

function SearchForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Select
        label="Search Engine"
        value={form.engine as string || 'duckduckgo'}
        onChange={(e) => set('engine', e.target.value)}
        options={Object.entries(SEARCH_ENGINES).map(([v, { label }]) => ({ value: v, label }))}
      />
      <Input
        label="Placeholder Text"
        value={form.placeholder as string || ''}
        onChange={(e) => set('placeholder', e.target.value)}
        placeholder="Search the web..."
      />
      <Switch label="Open in New Tab" checked={form.openInNewTab !== false} onChange={(v) => set('openInNewTab', v)} />
    </div>
  )
}

function ServiceForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  const services: ServiceEntry[] = Array.isArray(form.services)
    ? (form.services as ServiceEntry[])
    : [{ url: form.url as string || '', label: '', description: form.description as string || '', icon: form.icon as string || '', iconColor: '' }]

  const update = (index: number, field: keyof ServiceEntry, value: string) => {
    const next = services.map((s, i) => i === index ? { ...s, [field]: value } : s)
    set('services', next)
  }

  const addRow = () => set('services', [...services, { url: '', label: '', description: '', icon: '', iconColor: '' }])

  const removeRow = (index: number) => {
    if (services.length === 1) return
    set('services', services.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-4">
      {services.map((svc, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--border)] bg-white/2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Service {i + 1}</span>
            {services.length > 1 && (
              <button onClick={() => removeRow(i)} className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Input
            label="URL *"
            value={svc.url}
            onChange={(e) => update(i, 'url', e.target.value)}
            placeholder="https://example.com"
            type="url"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Label" value={svc.label || ''} onChange={(e) => update(i, 'label', e.target.value)} placeholder="e.g. Plex" />
            <Input label="Description" value={svc.description || ''} onChange={(e) => update(i, 'description', e.target.value)} placeholder="optional" />
            <Input label="Icon (emoji)" value={svc.icon || ''} onChange={(e) => update(i, 'icon', e.target.value)} placeholder="🌐" />
          </div>
        </div>
      ))}
      <button
        onClick={addRow}
        className="flex items-center gap-2 text-sm text-[var(--accent)] hover:opacity-80 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        Add Service
      </button>
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
        <Input
          label="Check Interval (seconds)"
          type="number"
          value={form.checkInterval as number || 30}
          onChange={(e) => set('checkInterval', Number(e.target.value))}
          hint="Applied to all services"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Switch label="Show Status" checked={form.showStatus !== false} onChange={(v) => set('showStatus', v)} />
        <Switch label="Show Response Time" checked={form.showResponseTime !== false} onChange={(v) => set('showResponseTime', v)} />
      </div>
    </div>
  )
}

function BookmarkForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  const bookmarks: BookmarkEntry[] = Array.isArray(form.bookmarks)
    ? (form.bookmarks as BookmarkEntry[])
    : [{ url: form.url as string || '', label: '', description: form.description as string || '', icon: form.icon as string || '', iconColor: '' }]

  const update = (index: number, field: keyof BookmarkEntry, value: string) => {
    set('bookmarks', bookmarks.map((b, i) => i === index ? { ...b, [field]: value } : b))
  }
  const addRow = () => set('bookmarks', [...bookmarks, { url: '', label: '', description: '', icon: '', iconColor: '' }])
  const removeRow = (i: number) => { if (bookmarks.length > 1) set('bookmarks', bookmarks.filter((_, idx) => idx !== i)) }

  return (
    <div className="flex flex-col gap-4">
      {bookmarks.map((bm, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--border)] bg-white/2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Bookmark {i + 1}</span>
            {bookmarks.length > 1 && (
              <button onClick={() => removeRow(i)} className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Input label="URL *" value={bm.url} onChange={(e) => update(i, 'url', e.target.value)} placeholder="https://example.com" type="url" />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Label" value={bm.label || ''} onChange={(e) => update(i, 'label', e.target.value)} placeholder="e.g. GitHub" />
            <Input label="Description" value={bm.description || ''} onChange={(e) => update(i, 'description', e.target.value)} placeholder="optional" />
            <Input label="Icon (emoji)" value={bm.icon || ''} onChange={(e) => update(i, 'icon', e.target.value)} placeholder="🔖" />
          </div>
        </div>
      ))}
      <button onClick={addRow} className="flex items-center gap-2 text-sm text-[var(--accent)] hover:opacity-80 transition-opacity">
        <Plus className="w-4 h-4" />
        Add Bookmark
      </button>
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
        <Select
          label="Layout"
          value={form.layout as string || 'list'}
          onChange={(e) => set('layout', e.target.value)}
          options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid (2 cols)' }]}
        />
        <Switch label="Open in New Tab" checked={form.openInNewTab !== false} onChange={(v) => set('openInNewTab', v)} />
      </div>
    </div>
  )
}

function SystemForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Switch label="Show CPU" checked={form.showCPU !== false} onChange={(v) => set('showCPU', v)} />
      <Switch label="Show Memory" checked={form.showRAM !== false} onChange={(v) => set('showRAM', v)} />
      <Switch label="Show Disk" checked={form.showDisk !== false} onChange={(v) => set('showDisk', v)} />
      <Switch label="Show Uptime" checked={form.showUptime !== false} onChange={(v) => set('showUptime', v)} />
      <Input
        label="Refresh Interval (seconds)"
        type="number"
        value={form.refreshInterval as number || 5}
        onChange={(e) => set('refreshInterval', Number(e.target.value))}
      />
    </div>
  )
}

function WeatherForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="Location Name"
        value={form.locationName as string || ''}
        onChange={(e) => set('locationName', e.target.value)}
        placeholder="New York"
      />
      <Select
        label="Units"
        value={form.units as string || 'celsius'}
        onChange={(e) => set('units', e.target.value)}
        options={[{ value: 'celsius', label: 'Celsius (°C)' }, { value: 'fahrenheit', label: 'Fahrenheit (°F)' }]}
      />
      <Input
        label="Latitude"
        type="number"
        step="0.0001"
        value={form.latitude as number || 40.7128}
        onChange={(e) => set('latitude', parseFloat(e.target.value))}
        hint="e.g. 40.7128 for New York"
      />
      <Input
        label="Longitude"
        type="number"
        step="0.0001"
        value={form.longitude as number || -74.006}
        onChange={(e) => set('longitude', parseFloat(e.target.value))}
        hint="e.g. -74.0060 for New York"
      />
      <Switch label="Show Forecast" checked={form.showForecast !== false} onChange={(v) => set('showForecast', v)} />
      <Input
        label="Forecast Days"
        type="number"
        min="1" max="7"
        value={form.forecastDays as number || 3}
        onChange={(e) => set('forecastDays', Number(e.target.value))}
      />
    </div>
  )
}

function NoteForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Textarea
        label="Note Content (supports plain text)"
        value={form.content as string || ''}
        onChange={(e) => set('content', e.target.value)}
        placeholder="Write your note here..."
        rows={5}
      />
    </div>
  )
}

function RSSForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Input
        label="RSS Feed URL *"
        value={form.url as string || ''}
        onChange={(e) => set('url', e.target.value)}
        placeholder="https://example.com/feed.xml"
        type="url"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Max Items"
          type="number"
          min="1" max="20"
          value={form.maxItems as number || 5}
          onChange={(e) => set('maxItems', Number(e.target.value))}
        />
        <Input
          label="Refresh (minutes)"
          type="number"
          value={form.refreshInterval as number || 15}
          onChange={(e) => set('refreshInterval', Number(e.target.value))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Switch label="Show Description" checked={!!form.showDescription} onChange={(v) => set('showDescription', v)} />
        <Switch label="Show Date" checked={form.showDate !== false} onChange={(v) => set('showDate', v)} />
        <Switch label="Open in New Tab" checked={form.openInNewTab !== false} onChange={(v) => set('openInNewTab', v)} />
      </div>
    </div>
  )
}

function DockerForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Input
        label="Docker Host URL"
        value={form.host as string || 'http://localhost:2375'}
        onChange={(e) => set('host', e.target.value)}
        placeholder="http://localhost:2375"
        hint="Enable Docker TCP socket or use Portainer proxy"
      />
      <div className="grid grid-cols-2 gap-4">
        <Switch label="Show All Containers" checked={!!form.showAll} onChange={(v) => set('showAll', v)} />
        <Input
          label="Name Filter"
          value={form.containerFilter as string || ''}
          onChange={(e) => set('containerFilter', e.target.value)}
          placeholder="my-service"
        />
      </div>
    </div>
  )
}

function CustomAPIForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Input
        label="API URL *"
        value={form.url as string || ''}
        onChange={(e) => set('url', e.target.value)}
        placeholder="https://api.example.com/data"
        type="url"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="JSON Path"
          value={form.jsonPath as string || ''}
          onChange={(e) => set('jsonPath', e.target.value)}
          placeholder="data.value"
          hint="Dot-notation path to extract"
        />
        <Select
          label="Display Type"
          value={form.displayType as string || 'text'}
          onChange={(e) => set('displayType', e.target.value)}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'number', label: 'Number' },
            { value: 'badge', label: 'Badge' },
            { value: 'list', label: 'List' },
          ]}
        />
        <Input
          label="Label"
          value={form.label as string || ''}
          onChange={(e) => set('label', e.target.value)}
          placeholder="Value"
        />
        <Input
          label="Unit"
          value={form.unit as string || ''}
          onChange={(e) => set('unit', e.target.value)}
          placeholder="°C, GB, %, etc."
        />
      </div>
    </div>
  )
}

function IframeForm({ form, set }: { form: WidgetFormState; set: (k: string, v: unknown) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Input
          label="URL *"
          value={form.url as string || ''}
          onChange={(e) => set('url', e.target.value)}
          placeholder="https://example.com"
          type="url"
        />
      </div>
      <Input
        label="Height (px)"
        type="number"
        value={form.height as number || 400}
        onChange={(e) => set('height', Number(e.target.value))}
      />
      <Switch label="Allow Fullscreen" checked={form.allowFullscreen !== false} onChange={(v) => set('allowFullscreen', v)} />
    </div>
  )
}
