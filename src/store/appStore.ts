'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dashboard, DialogState, Settings, Widget } from '@/types'

interface AppState {
  // UI State
  sidebarCollapsed: boolean
  headerCollapsed: boolean
  editMode: boolean
  commandPaletteOpen: boolean
  dialog: DialogState

  // Data (cached from API)
  dashboards: Dashboard[]
  currentDashboard: Dashboard | null
  settings: Settings | null

  // Actions
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void
  toggleHeader: () => void
  setEditMode: (v: boolean) => void
  toggleEditMode: () => void
  setCommandPaletteOpen: (v: boolean) => void
  openDialog: (dialog: DialogState) => void
  closeDialog: () => void
  setDashboards: (dashboards: Dashboard[]) => void
  setCurrentDashboard: (dashboard: Dashboard | null) => void
  setSettings: (settings: Settings | null) => void
  updateWidgetInDashboard: (widget: Widget) => void
  removeWidgetFromDashboard: (widgetId: string) => void
  addWidgetToDashboard: (widget: Widget) => void
  reorderWidgets: (widgets: Widget[]) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      headerCollapsed: false,
      editMode: false,
      commandPaletteOpen: false,
      dialog: { type: 'none' },
      dashboards: [],
      currentDashboard: null,
      settings: null,

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleHeader: () => set((s) => ({ headerCollapsed: !s.headerCollapsed })),
      setEditMode: (v) => set({ editMode: v }),
      toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
      setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),

      openDialog: (dialog) => set({ dialog }),
      closeDialog: () => set({ dialog: { type: 'none' } }),

      setDashboards: (dashboards) => set({ dashboards }),
      setCurrentDashboard: (dashboard) => set({ currentDashboard: dashboard }),
      setSettings: (settings) => set({ settings }),

      updateWidgetInDashboard: (widget) =>
        set((s) => {
          if (!s.currentDashboard) return {}
          return {
            currentDashboard: {
              ...s.currentDashboard,
              widgets: s.currentDashboard.widgets?.map((w) =>
                w.id === widget.id ? widget : w
              ),
            },
          }
        }),

      removeWidgetFromDashboard: (widgetId) =>
        set((s) => {
          if (!s.currentDashboard) return {}
          return {
            currentDashboard: {
              ...s.currentDashboard,
              widgets: s.currentDashboard.widgets?.filter((w) => w.id !== widgetId),
            },
          }
        }),

      addWidgetToDashboard: (widget) =>
        set((s) => {
          if (!s.currentDashboard) return {}
          return {
            currentDashboard: {
              ...s.currentDashboard,
              widgets: [...(s.currentDashboard.widgets || []), widget],
            },
          }
        }),

      reorderWidgets: (widgets) =>
        set((s) => {
          if (!s.currentDashboard) return {}
          return {
            currentDashboard: {
              ...s.currentDashboard,
              widgets,
            },
          }
        }),
    }),
    {
      name: 'eze-dash-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        headerCollapsed: state.headerCollapsed,
        editMode: false, // don't persist edit mode
      }),
    }
  )
)
