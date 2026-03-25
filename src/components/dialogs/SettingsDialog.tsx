'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Select } from '@/components/ui/Select'
import { useAppStore } from '@/store/appStore'
import { Save, Sparkles, Download, Upload } from 'lucide-react'
import { useRef } from 'react'

const TABS = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'data', label: 'Data' },
]

export function SettingsDialog() {
  const { dialog, closeDialog, settings, setSettings, setDashboards } = useAppStore()
  const open = dialog.type === 'settings'

  const [activeTab, setActiveTab] = useState('appearance')
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(settings?.theme || 'dark')
  const [accentColor, setAccentColor] = useState(settings?.accentColor || '#6366f1')
  const [siteTitle, setSiteTitle] = useState(settings?.siteTitle || 'EzeDash')
  const [customCSS, setCustomCSS] = useState(settings?.customCSS || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoMsg, setDemoMsg] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          accentColor,
          siteTitle,
          customCSS,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to save settings')
      }
      const updated = await res.json()
      setSettings(updated)

      // Apply theme immediately
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(updated.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : updated.theme
      )
      // Apply accent
      document.documentElement.style.setProperty('--accent', updated.accentColor)
      // Apply custom CSS
      const styleEl = document.getElementById('custom-css')
      if (styleEl) styleEl.textContent = updated.customCSS || ''

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleExportAll = async () => {
    try {
      const res = await fetch('/api/dashboards')
      if (!res.ok) throw new Error('Failed to fetch dashboards')
      const dashboards = await res.json()
      // Strip server-generated fields to produce a clean import-ready file
      const exportPayload = {
        version: '1',
        exportedAt: new Date().toISOString(),
        dashboards: dashboards.map((d: Record<string, unknown>) => ({
          name: d.name,
          icon: d.icon,
          description: d.description,
          columns: d.columns,
          background: d.background,
          theme: d.theme,
          widgets: Array.isArray(d.widgets)
            ? (d.widgets as Array<Record<string, unknown>>).map((w) => ({
                type: w.type,
                title: w.title,
                config: w.config,
                colSpan: w.colSpan,
                rowSpan: w.rowSpan,
                posX: w.posX,
                posY: w.posY,
                order: w.order,
              }))
            : [],
        })),
      }
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eze-dash-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so the same file can be re-selected
    e.target.value = ''
    setImportLoading(true)
    setImportMsg('')
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const res = await fetch('/api/dashboards/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Import failed')
      setImportMsg(`Imported ${result.imported} dashboard${result.imported !== 1 ? 's' : ''} successfully.`)
      // Refresh sidebar
      const dbRes = await fetch('/api/dashboards')
      if (dbRes.ok) setDashboards(await dbRes.json())
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImportLoading(false)
    }
  }

  const handleCreateDemo = async () => {
    setDemoLoading(true)
    setDemoMsg('')
    try {
      const res = await fetch('/api/init', { method: 'PUT' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      if (d.seeded === false) {
        setDemoMsg('Demo dashboard already exists.')
      } else {
        setDemoMsg(`Demo dashboard created with ${d.widgetCount} widgets!`)
        // Refresh dashboards list in store
        const dbRes = await fetch('/api/dashboards')
        if (dbRes.ok) setDashboards(await dbRes.json())
      }
    } catch (err) {
      setDemoMsg(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={closeDialog}
      title="Settings"
      description="Customize your dashboard appearance and behavior"
      size="lg"
    >
      <div className="flex flex-col gap-5">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        <TabPanel id="appearance" activeTab={activeTab}>
          <div className="flex flex-col gap-5">
            <Input
              label="Site Title"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder="EzeDash"
            />

            <Select
              label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'System (auto)' },
              ]}
            />

            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Accent Color</p>
              <ColorPicker value={accentColor} onChange={setAccentColor} />
            </div>


          </div>
        </TabPanel>

        <TabPanel id="advanced" activeTab={activeTab}>
          <div className="flex flex-col gap-5">
            <Textarea
              label="Custom CSS"
              value={customCSS}
              onChange={(e) => setCustomCSS(e.target.value)}
              placeholder="/* Add custom CSS here */&#10;.widget-card { border-radius: 16px; }"
              rows={10}
              hint="Injected into <style> on every page load"
            />
          </div>
        </TabPanel>

        <TabPanel id="data" activeTab={activeTab}>
          <div className="flex flex-col gap-4">
            {/* Export / Import */}
            <div className="rounded-xl border border-[var(--border)] p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent)]/15">
                  <Download className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Export &amp; Import</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Export all dashboards to a JSON file you can back up or share. Import a previously exported file to restore dashboards.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleExportAll}
                >
                  Export All
                </Button>
                <Button
                  variant="secondary"
                  loading={importLoading}
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => importInputRef.current?.click()}
                >
                  Import
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
              {importMsg && (
                <p className="text-xs text-[var(--text-muted)] bg-white/5 rounded-lg px-3 py-2">{importMsg}</p>
              )}
            </div>

            <div className="rounded-xl border border-[var(--border)] p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent)]/15">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Demo Dashboard</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Creates a new dashboard showcasing all widget types — clocks, weather, RSS, bookmarks, notes, service monitor, system metrics and more.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                loading={demoLoading}
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleCreateDemo}
              >
                Create Demo Dashboard
              </Button>
              {demoMsg && (
                <p className="text-xs text-[var(--text-muted)] bg-white/5 rounded-lg px-3 py-2">{demoMsg}</p>
              )}
            </div>
          </div>
        </TabPanel>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={closeDialog}>Close</Button>
          <Button
            variant="primary"
            loading={loading}
            icon={<Save className="w-4 h-4" />}
            onClick={handleSave}
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
