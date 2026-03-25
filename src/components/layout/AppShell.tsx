'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import { Header } from '@/components/layout/Header'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { AddWidgetDialog } from '@/components/dialogs/AddWidgetDialog'
import { EditWidgetDialog } from '@/components/dialogs/EditWidgetDialog'
import { DashboardDialog } from '@/components/dialogs/DashboardDialog'
import { SettingsDialog } from '@/components/dialogs/SettingsDialog'
import { DeleteConfirmDialog } from '@/components/dialogs/DeleteConfirmDialog'
import { useAppStore } from '@/store/appStore'
import { Spinner } from '@/components/ui/Spinner'
import { ChevronDown } from 'lucide-react'
import type { Dashboard } from '@/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AppShellProps {
  children: React.ReactNode
  initialDashboards?: Dashboard[]
}

export function AppShell({ children, initialDashboards }: AppShellProps) {
  const { setDashboards, setSettings, dashboards, headerCollapsed, toggleHeader } = useAppStore()

  const { data: dashboardsData, isLoading: dashboardsLoading } = useSWR<Dashboard[]>(
    '/api/dashboards',
    fetcher,
    { fallbackData: initialDashboards, revalidateOnFocus: false }
  )

  const { data: settingsData } = useSWR('/api/settings', fetcher, {
    revalidateOnFocus: false,
  })

  useEffect(() => {
    if (dashboardsData) setDashboards(dashboardsData)
  }, [dashboardsData, setDashboards])

  useEffect(() => {
    if (settingsData) setSettings(settingsData)
  }, [settingsData, setSettings])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Header with collapse animation */}
      <div className="shrink-0">
        <div
          className="overflow-hidden transition-[height] duration-300 ease-in-out"
          style={{ height: headerCollapsed ? 0 : 48 }}
        >
          <Header />
        </div>
        {/* Peek hint strip — shown when header is collapsed */}
        {headerCollapsed && (
          <button
            onClick={toggleHeader}
            title="Expand header"
            className="w-full h-1 hover:h-6 flex items-center justify-center cursor-pointer transition-all duration-200 group"
            style={{ background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 50%, transparent), transparent)' }}
          >
            <ChevronDown className="w-3.5 h-3.5 text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      <main className="flex-1 overflow-hidden flex flex-col">
          {dashboardsLoading && dashboards.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            children
          )}
      </main>

      {/* Global overlays */}
      <CommandPalette />
      <AddWidgetDialog />
      <EditWidgetDialog />
      <DashboardDialog />
      <SettingsDialog />
      <DeleteConfirmDialog />
    </div>
  )
}
