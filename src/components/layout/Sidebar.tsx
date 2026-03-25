'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  LayoutDashboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  PanelLeft,
  Zap,
} from 'lucide-react'

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>
  const pascalName = name
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
  const Icon = icons[pascalName] || LayoutDashboard
  return <Icon className={className} />
}

interface SidebarProps {
  dashboards?: never
}

export function Sidebar(_props: SidebarProps = {}) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar, openDialog, dashboards } = useAppStore()

  const currentSlug = pathname.split('/dashboard/')[1]?.split('/')[0]

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col h-full bg-[var(--surface)] border-r border-[var(--border)] overflow-hidden shrink-0 z-20"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--accent)]/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-bold text-[var(--text)] text-base tracking-tight whitespace-nowrap"
              >
                EzeDash
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Dashboard list */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-2 mb-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest"
            >
              Dashboards
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-0.5">
          {dashboards.map((dash) => {
            const isActive = currentSlug === dash.slug
            return (
              <Link
                key={dash.id}
                href={`/dashboard/${dash.slug}`}
                title={sidebarCollapsed ? dash.name : undefined}
                className={cn(
                  'group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 min-w-0',
                  isActive
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
                )}
              >
                <span className={cn('shrink-0', isActive ? 'text-[var(--accent)]' : '')}>
                  <DynamicIcon name={dash.icon || 'layout-dashboard'} className="w-4 h-4" />
                </span>
                <AnimatePresence mode="wait">
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="truncate text-sm font-medium"
                    >
                      {dash.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </div>

        {/* Add dashboard */}
        <div className="mt-2">
          <button
            onClick={() => openDialog({ type: 'add-dashboard' })}
            title={sidebarCollapsed ? 'Add dashboard' : undefined}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150',
              'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5',
              'border border-dashed border-[var(--border)] hover:border-[var(--accent)]/40'
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <AnimatePresence mode="wait">
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm"
                >
                  New Dashboard
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--border)] flex flex-col gap-0.5 shrink-0">
        <button
          onClick={() => openDialog({ type: 'settings' })}
          title={sidebarCollapsed ? 'Settings' : undefined}
          className={cn(
            'flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 w-full',
            'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 w-full"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronLeft className="w-4 h-4 shrink-0" />
          )}
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
