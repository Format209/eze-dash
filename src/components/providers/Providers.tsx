'use client'

import { useEffect, type ReactNode } from 'react'
import { useAppStore } from '@/store/appStore'
import type { Settings } from '@/types'

interface ProvidersProps {
  children: ReactNode
  initialSettings?: Settings | null
}

export function Providers({ children, initialSettings }: ProvidersProps) {
  const { settings, setSettings } = useAppStore()

  // Initialize settings from server
  useEffect(() => {
    if (initialSettings && !settings) {
      setSettings(initialSettings)
    }
  }, [initialSettings, settings, setSettings])

  // Apply theme to html element
  const activeSettings = settings || initialSettings
  useEffect(() => {
    const theme = activeSettings?.theme || 'dark'
    const root = document.documentElement
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }
    if (activeSettings?.accentColor) {
      root.style.setProperty('--accent', activeSettings.accentColor)
    }
    if (activeSettings?.customCSS) {
      let styleEl = document.getElementById('custom-css')
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = 'custom-css'
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = activeSettings.customCSS
    }
  }, [activeSettings?.theme, activeSettings?.accentColor, activeSettings?.customCSS])

  return <>{children}</>
}
