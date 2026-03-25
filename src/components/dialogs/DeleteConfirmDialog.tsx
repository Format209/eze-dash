'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store/appStore'
import { Trash2, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export function DeleteConfirmDialog() {
  const { dialog, closeDialog, currentDashboard, removeWidgetFromDashboard, setDashboards, setCurrentDashboard, dashboards } = useAppStore()

  const isDeleteWidget = dialog.type === 'delete-widget'
  const isDeleteDashboard = dialog.type === 'delete-dashboard'
  const open = isDeleteWidget || isDeleteDashboard

  const widgetId = isDeleteWidget ? (dialog as { type: 'delete-widget'; widgetId: string }).widgetId : null
  const dashboardId = isDeleteDashboard ? (dialog as { type: 'delete-dashboard'; dashboardId: string }).dashboardId : null

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const widgetTitle = widgetId ? currentDashboard?.widgets?.find((w) => w.id === widgetId)?.title : null
  const dashboardName = dashboardId ? dashboards.find((d) => d.id === dashboardId)?.name : null

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    try {
      if (isDeleteWidget && widgetId) {
        const res = await fetch(`/api/widgets/${widgetId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete widget')
        removeWidgetFromDashboard(widgetId)
      } else if (isDeleteDashboard && dashboardId) {
        const res = await fetch(`/api/dashboards/${dashboardId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete dashboard')
        const remaining = dashboards.filter((d) => d.id !== dashboardId)
        setDashboards(remaining)
        if (currentDashboard?.id === dashboardId) {
          setCurrentDashboard(remaining[0] || null)
        }
      }
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={closeDialog} title="Confirm Delete" size="sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-[var(--text)] text-sm">
              {isDeleteWidget
                ? <>Are you sure you want to delete the <strong>&quot;{widgetTitle}&quot;</strong> widget? This cannot be undone.</>
                : <>Are you sure you want to delete the <strong>&quot;{dashboardName}&quot;</strong> dashboard and all its widgets? This cannot be undone.</>
              }
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
          <Button
            variant="danger"
            loading={loading}
            icon={<Trash2 className="w-4 h-4" />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}
