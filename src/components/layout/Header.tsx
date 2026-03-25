'use client'

import { useAppStore } from '@/store/appStore'
import {
  Plus,
  Moon,
  Sun,
  Settings,
  LayoutDashboard,
  Pencil,
  X,
  ChevronsUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import * as LucideIcons from 'lucide-react'

function DynIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>
  const pascal = name.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')
  const Icon = icons[pascal] || LucideIcons.LayoutDashboard
  return <Icon className={className} />
}

export function Header() {
  const {
    editMode,
    toggleEditMode,
    openDialog,
    settings,
    setSettings,
    dashboards,
    currentDashboard,
    toggleHeader,
  } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()

  const toggleTheme = async () => {
    const newTheme = settings?.theme === 'dark' ? 'light' : 'dark'
    if (settings) setSettings({ ...settings, theme: newTheme as 'dark' | 'light' | 'system' })
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSettings(updated)
        document.documentElement.classList.remove('dark', 'light')
        document.documentElement.classList.add(newTheme)
      }
    } catch { /* ignore */ }
  }

  return (
    <header className="flex items-center h-12 px-3 gap-2 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0 mr-2">
        {/* <LayoutDashboard className="w-4 h-4 text-[var(--accent)]" /> */}
        <span className="text-sm font-bold text-[var(--text)] tracking-tight hidden sm:block">
          {settings?.siteTitle || 'EzeDash'}
        </span>
      </div>

      {/* Dashboard Tabs */}
      <nav className="flex items-end gap-0.5 flex-1 min-w-0 overflow-x-auto h-full scrollbar-none">
        {dashboards.map((dashboard) => {
          const isActive = currentDashboard?.id === dashboard.id ||
            pathname === `/dashboard/${dashboard.slug}`
          return (
            <div key={dashboard.id} className="relative flex items-center shrink-0 group">
              <button
                onClick={() => router.push(`/dashboard/${dashboard.slug}`)}
                className={`relative h-9 px-4 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--bg)] text-[var(--text)] border border-b-0 border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
                }`}
              >
                <DynIcon name={dashboard.icon || 'layout-dashboard'} className="w-3.5 h-3.5 shrink-0" />
                {dashboard.name}
              </button>
              {/* Pencil — visible on hover for inactive, always for active */}
              <button
                onClick={() => openDialog({ type: 'edit-dashboard', dashboard })}
                className={`p-1 rounded transition-colors shrink-0 ${
                  isActive
                    ? 'ml-0.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/8'
                    : 'ml-0.5 text-transparent group-hover:text-[var(--text-muted)] hover:!text-[var(--text)] hover:bg-white/8'
                }`}
                title="Edit dashboard"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )
        })}

        {/* Add dashboard */}
        <button
          onClick={() => openDialog({ type: 'add-dashboard' })}
          className="h-9 px-2.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 rounded-t-lg transition-colors shrink-0"
          title="New dashboard"
        >
          <Plus className="w-4 h-4" />
        </button>
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        <AnimatePresence>
          {editMode && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden' }}
            >
              <Button
                variant="primary"
                size="sm"
                onClick={() => openDialog({ type: 'add-widget' })}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                <span className="whitespace-nowrap pr-0.5">Add Widget</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={toggleEditMode}
          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium transition-colors ${
            editMode
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/8'
          }`}
          title={editMode ? 'Exit edit mode' : 'Edit layout'}
        >
          {editMode ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          <span className="hidden sm:block">{editMode ? 'Done' : 'Edit'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/8 transition-colors"
          title="Toggle theme"
        >
          {settings?.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => openDialog({ type: 'settings' })}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/8 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={toggleHeader}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/8 transition-colors"
          title="Collapse header"
        >
          <ChevronsUp className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
