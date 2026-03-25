'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useAppStore } from '@/store/appStore'
import { DEFAULT_ICONS } from '@/lib/widgets'
import { cn } from '@/lib/cn'
import { Check, LayoutDashboard, Trash2, Settings, Palette, Upload, X } from 'lucide-react'
import type { Dashboard } from '@/types'
import * as LucideIcons from 'lucide-react'

function DynIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>
  const pascal = name.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')
  const Icon = icons[pascal] || LayoutDashboard
  return <Icon className={className} />
}

interface DashboardTheme {
  accentColor?: string
  textColor?: string
  widgetRadius?: number
  widgetOpacity?: number
  glowEnabled?: boolean
  glowIntensity?: number
  bgColor?: string
  bgImage?: string
  bgBlur?: number
  bgOverlayOpacity?: number
}

const PRESET_ACCENTS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#a855f7', '#f43f5e',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-6 gap-1.5">
        {PRESET_ACCENTS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={cn(
              'w-8 h-8 rounded-lg border-2 transition-all',
              value === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
            )}
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg border border-[var(--border)] shrink-0" style={{ background: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          id="accent-color-input"
        />
        <label
          htmlFor="accent-color-input"
          className="flex-1 text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)] transition-colors"
        >
          {value} <span className="opacity-60"> click to pick custom</span>
        </label>
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
        <span className="text-xs font-mono text-[var(--text)]">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)] cursor-pointer"
      />
    </div>
  )
}

export function DashboardDialog() {
  const { dialog, closeDialog, openDialog, setDashboards, dashboards, setCurrentDashboard, currentDashboard } = useAppStore()
  const open = dialog.type === 'add-dashboard' || dialog.type === 'edit-dashboard'
  const isEdit = dialog.type === 'edit-dashboard'
  const editDashboard: Dashboard | null = isEdit ? (dialog as { type: 'edit-dashboard'; dashboard: Dashboard }).dashboard : null

  const [tab, setTab] = useState<'general' | 'appearance'>('general')

  // General fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('layout-dashboard')
  const [columns, setColumns] = useState('4')
  const [isDefault, setIsDefault] = useState(false)

  // Appearance / theme
  const [theme, setTheme] = useState<DashboardTheme>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editDashboard) {
      setName(editDashboard.name)
      setDescription(editDashboard.description || '')
      setIcon(editDashboard.icon || 'layout-dashboard')
      setColumns(String(editDashboard.columns || 4))
      setIsDefault(editDashboard.isDefault || false)
      try {
        setTheme(editDashboard.theme ? JSON.parse(editDashboard.theme) : {})
      } catch { setTheme({}) }
    } else {
      setName('')
      setDescription('')
      setIcon('layout-dashboard')
      setColumns('4')
      setIsDefault(false)
      setTheme({})
    }
    setTab('general')
    setError('')
  }, [editDashboard, open])

  const patchTheme = (patch: Partial<DashboardTheme>) => setTheme((t) => ({ ...t, ...patch }))

  const handleBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') patchTheme({ bgImage: ev.target.result })
    }
    reader.readAsDataURL(file)
    // reset so same file can be re-picked
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Dashboard name is required'); return }
    setLoading(true)
    setError('')

    const themeJson = Object.keys(theme).length > 0 ? JSON.stringify(theme) : null

    try {
      const body = {
        name: name.trim(),
        description,
        icon,
        columns: Number(columns),
        isDefault,
        theme: themeJson,
      }

      if (isEdit && editDashboard) {
        const res = await fetch(`/api/dashboards/${editDashboard.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
        const updated: Dashboard = await res.json()
        const merged = { ...dashboards.find((d) => d.id === updated.id), ...updated } as Dashboard
        const newList = dashboards.map((d) =>
          d.id === updated.id ? merged : isDefault ? { ...d, isDefault: false } : d
        )
        setDashboards(newList)
        if (currentDashboard?.id === updated.id) {
          setCurrentDashboard({ ...currentDashboard, ...updated })
        }
      } else {
        const res = await fetch('/api/dashboards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
        const created: Dashboard = await res.json()
        setDashboards([...dashboards, created])
        setCurrentDashboard(created)
      }
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={closeDialog}
      title={isEdit ? 'Edit Dashboard' : 'New Dashboard'}
      description={isEdit ? 'Update dashboard settings' : 'Create a new dashboard tab'}
      size="md"
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-[var(--border)] mb-5">
        <button
          onClick={() => setTab('general')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all',
            tab === 'general'
              ? 'bg-[var(--surface-2)] text-[var(--text)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          General
        </button>
        <button
          onClick={() => setTab('appearance')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all',
            tab === 'appearance'
              ? 'bg-[var(--surface-2)] text-[var(--text)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          )}
        >
          <Palette className="w-3.5 h-3.5" />
          Appearance
        </button>
      </div>

      <div className="flex flex-col gap-5">

        {/*  General tab  */}
        {tab === 'general' && (
          <>
            <Input
              label="Dashboard Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Dashboard"
              autoFocus
            />

            <Textarea
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this dashboard for?"
              rows={2}
            />

            <Select
              label="Grid Columns"
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
              options={[
                { value: '1', label: '1 column' },
                { value: '2', label: '2 columns' },
                { value: '3', label: '3 columns' },
                { value: '4', label: '4 columns (default)' },
                { value: '5', label: '5 columns' },
                { value: '6', label: '6 columns' },
                { value: '7', label: '7 columns' },
                { value: '8', label: '8 columns' },
                { value: '9', label: '9 columns' },
                { value: '10', label: '10 columns' },
                { value: '11', label: '11 columns' },
                { value: '12', label: '12 columns' },
                { value: '13', label: '13 columns' },
                { value: '14', label: '14 columns' },
                { value: '15', label: '15 columns' },
                { value: '16', label: '16 columns' },
              ]}
            />

            {/* Icon picker */}
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Icon</p>
              <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-white/3 border border-[var(--border)]">
                {DEFAULT_ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={cn(
                      'p-2 rounded-lg flex items-center justify-center transition-colors relative',
                      icon === ic
                        ? 'bg-[var(--accent)] text-white'
                        : 'hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text)]'
                    )}
                    title={ic}
                  >
                    <DynIcon name={ic} className="w-4 h-4" />
                    {icon === ic && <Check className="w-2.5 h-2.5 absolute bottom-0.5 right-0.5" />}
                  </button>
                ))}
              </div>
            </div>

            {isEdit && (
              <Switch
                checked={isDefault}
                onChange={setIsDefault}
                label="Set as default dashboard"
                description="This dashboard will load first when you open the app"
              />
            )}
          </>
        )}

        {/*  Appearance tab  */}
        {tab === 'appearance' && (
          <>
            {/* Accent color */}
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Accent Color</p>
              <ColorPicker
                value={theme.accentColor || '#6366f1'}
                onChange={(v) => patchTheme({ accentColor: v })}
              />
            </div>

            {/* Text color */}
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Widget Text Color</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-[var(--border)] shrink-0"
                  style={{ background: theme.textColor || 'transparent' }}
                />
                <input
                  type="color"
                  value={theme.textColor || '#ffffff'}
                  onChange={(e) => patchTheme({ textColor: e.target.value })}
                  className="flex-1 h-8 rounded-lg cursor-pointer border border-[var(--border)] bg-transparent"
                />
                {theme.textColor && (
                  <button
                    onClick={() => patchTheme({ textColor: undefined })}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Reset text color"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Widget border radius */}
            <Slider
              label="Widget Border Radius"
              value={theme.widgetRadius ?? 16}
              min={0}
              max={32}
              step={2}
              unit="px"
              onChange={(v) => patchTheme({ widgetRadius: v })}
            />

            {/* Widget surface opacity */}
            <Slider
              label="Widget Surface Opacity"
              value={theme.widgetOpacity ?? 100}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={(v) => patchTheme({ widgetOpacity: v })}
            />

            {/* Glow effect */}
            <div className="flex flex-col gap-3">
              <Switch
                checked={theme.glowEnabled ?? false}
                onChange={(v) => patchTheme({ glowEnabled: v })}
                label="Widget Glow / Shadow"
                description="Adds coloured accent glow around widget borders on hover"
              />
              {theme.glowEnabled && (
                <Slider
                  label="Glow Intensity"
                  value={theme.glowIntensity ?? 40}
                  min={10}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(v) => patchTheme({ glowIntensity: v })}
                />
              )}
            </div>

            {/* Background color (no image) */}
            {!theme.bgImage && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Background Color</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg border border-[var(--border)] shrink-0"
                    style={{ background: theme.bgColor || 'transparent' }}
                  />
                  <input
                    type="color"
                    value={theme.bgColor || '#09090b'}
                    onChange={(e) => patchTheme({ bgColor: e.target.value })}
                    className="flex-1 h-8 rounded-lg cursor-pointer border border-[var(--border)] bg-transparent"
                  />
                  {theme.bgColor && (
                    <button
                      onClick={() => patchTheme({ bgColor: undefined })}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-white/5 transition-colors"
                      title="Reset background color"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Background image */}
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Background Image</p>
              {theme.bgImage ? (
                <div className="relative rounded-xl overflow-hidden border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={theme.bgImage}
                    alt="background preview"
                    className="w-full h-24 object-cover"
                  />
                  <button
                    onClick={() => patchTheme({ bgImage: undefined })}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    title="Remove background"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={''}
                    onChange={(e) => { if (e.target.value) patchTheme({ bgImage: e.target.value }) }}
                    onBlur={(e) => { if (e.target.value) patchTheme({ bgImage: e.target.value }) }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors"
                    title="Upload image file"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleBgFile}
                  />
                </div>
              )}
            </div>

            {/* Blur + dark overlay — only when bg image set */}
            {theme.bgImage && (
              <>
                <Slider
                  label="Background Blur"
                  value={theme.bgBlur ?? 0}
                  min={0}
                  max={20}
                  step={1}
                  unit="px"
                  onChange={(v) => patchTheme({ bgBlur: v })}
                />
                <Slider
                  label="Dark Overlay"
                  value={theme.bgOverlayOpacity ?? 0}
                  min={0}
                  max={95}
                  step={5}
                  unit="%"
                  onChange={(v) => patchTheme({ bgOverlayOpacity: v })}
                />
              </>
            )}

            {/* Reset theme */}
            {Object.keys(theme).length > 0 && (
              <button
                onClick={() => setTheme({})}
                className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors self-start"
              >
                Reset to defaults
              </button>
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
          {isEdit && editDashboard && (
            <button
              onClick={() => {
                closeDialog()
                openDialog({ type: 'delete-dashboard', dashboardId: editDashboard.id })
              }}
              disabled={dashboards.length <= 1}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={dashboards.length <= 1 ? 'Cannot delete the last dashboard' : 'Delete this dashboard'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Create Dashboard'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}