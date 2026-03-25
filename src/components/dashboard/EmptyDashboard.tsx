'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/ui/Button'
import { LayoutDashboard, Plus } from 'lucide-react'

export function EmptyDashboard() {
  const { openDialog, editMode } = useAppStore()

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 p-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="p-5 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
        <LayoutDashboard className="w-12 h-12 text-[var(--accent)]" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[var(--text)] mb-2">No widgets yet</h2>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">
          Add widgets to this dashboard to get started. You can display system info, bookmarks, weather, and more.
        </p>
      </div>
      {!editMode ? (
        <p className="text-sm text-[var(--text-muted)]">
          Enable <strong>Edit Mode</strong> from the header to add widgets
        </p>
      ) : (
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => openDialog({ type: 'add-widget' })}
          size="lg"
        >
          Add Your First Widget
        </Button>
      )}
    </motion.div>
  )
}
