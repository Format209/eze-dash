'use client'

import { useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'
import { EmptyDashboard } from '@/components/dashboard/EmptyDashboard'
import type { Dashboard } from '@/types'

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

interface DashboardViewProps {
  dashboard: Dashboard
}

export function DashboardView({ dashboard }: DashboardViewProps) {
  const { setCurrentDashboard, currentDashboard } = useAppStore()

  // Sync prop with store
  useEffect(() => {
    if (!currentDashboard || currentDashboard.id !== dashboard.id) {
      setCurrentDashboard(dashboard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard.id])

  const widgets = (currentDashboard?.id === dashboard.id
    ? currentDashboard?.widgets
    : dashboard.widgets) ?? []

  const activeDashboard = currentDashboard?.id === dashboard.id ? currentDashboard : dashboard

  const theme = useMemo<DashboardTheme>(() => {
    try { return activeDashboard.theme ? JSON.parse(activeDashboard.theme) : {} }
    catch { return {} }
  }, [activeDashboard.theme])

  const cssVars: React.CSSProperties = {}
  if (theme.accentColor) (cssVars as Record<string, string>)['--accent'] = theme.accentColor
  if (theme.textColor) {
    (cssVars as Record<string, string>)['--text'] = theme.textColor
    ;(cssVars as Record<string, string>)['--text-muted'] = `color-mix(in srgb, ${theme.textColor} 55%, transparent)`
  }
  if (theme.widgetRadius !== undefined) (cssVars as Record<string, string>)['--widget-radius'] = `${theme.widgetRadius}px`
  if (theme.widgetOpacity !== undefined && theme.widgetOpacity !== 100)
    (cssVars as Record<string, string>)['--widget-bg-alpha'] = `${theme.widgetOpacity}%`
  if (theme.glowEnabled) {
    const intensity = theme.glowIntensity ?? 40
    const blur = Math.round(intensity * 0.4)
    const spread = Math.round(intensity * 0.06)
    ;(cssVars as Record<string, string>)['--widget-box-shadow'] =
      `0 0 ${blur}px ${spread}px color-mix(in srgb, var(--accent) ${intensity}%, transparent)`
  }

  return (
    <div className="flex-1 overflow-y-auto relative" style={cssVars}>
      {/* Background color layer (no image) */}
      {!theme.bgImage && theme.bgColor && (
        <div className="absolute inset-0 z-0" style={{ background: theme.bgColor }} />
      )}
      {/* Background image layer */}
      {theme.bgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
            style={{
              backgroundImage: `url(${theme.bgImage})`,
              filter: theme.bgBlur ? `blur(${theme.bgBlur}px)` : undefined,
              transform: theme.bgBlur ? 'scale(1.05)' : undefined,
            }}
          />
          {(theme.bgOverlayOpacity ?? 0) > 0 && (
            <div
              className="absolute inset-0 z-0 bg-black"
              style={{ opacity: (theme.bgOverlayOpacity ?? 0) / 100 }}
            />
          )}
        </>
      )}
      <div style={{ minHeight: '100%' }} className="relative z-10">
        {widgets.length === 0 ? (
          <EmptyDashboard />
        ) : (
          <DashboardGrid
            widgets={widgets}
            gridColumns={activeDashboard.columns || 4}
          />
        )}
      </div>
    </div>
  )
}
