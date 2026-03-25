'use client'

import { useAppStore } from '@/store/appStore'
import type { Widget } from '@/types'
import { cn } from '@/lib/cn'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GripVertical,
  Pencil,
  Trash2,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState, useCallback, useEffect, useRef, type HTMLAttributes } from 'react'

// Display-focused widgets that benefit from uniform scale-to-fit.
// refW: natural layout width. fillWidth: scale to fill width (ignores height ratio).
const SCALE_TO_FIT: Record<string, { refW: number; fillWidth?: boolean }> = {
  clock:    { refW: 375 },
  greeting: { refW: 320, fillWidth: true },
  weather:  { refW: 240 },
  system:   { refW: 260 },
}

// Renders children at refW in a hidden pass to measure their natural height,
// then scales the whole thing (text, icons, gaps — everything) to fill the card.
function ScaleToFit({ children, refW, fillWidth }: { children: React.ReactNode; refW: number; fillWidth?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef  = useRef<HTMLDivElement>(null)
  const [refH,  setRefH]  = useState<number | null>(null)
  const [scale, setScale] = useState(1)

  // Phase 1 — track natural content height at refW
  useEffect(() => {
    const el = measureRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const h = el.scrollHeight
      if (h > 20) setRefH(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [refW])

  // Phase 2 — recompute scale whenever container or content dims change
  useEffect(() => {
    const container = containerRef.current
    if (!container || refH === null) return
    const update = () => {
      const s = fillWidth
        ? (container.clientWidth  - 12) / refW
        : Math.min(
            (container.clientWidth  - 12) / refW,
            (container.clientHeight - 12) / refH,
          )
      setScale(Math.max(0.05, s))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    return () => ro.disconnect()
  }, [refW, refH, fillWidth])

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{ padding: '6px' }}>
      {/* Hidden measurement pass — rendered at refW, unconstrained height */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{ position: 'absolute', width: refW, top: 0, left: 0, visibility: 'hidden', pointerEvents: 'none' }}
      >
        {children}
      </div>
      {/* Visible scaled pass */}
      {refH !== null && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: refW,
          height: refH,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
          overflow: 'hidden',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

// Widget type renderers
import { ClockWidget } from '@/components/widgets/ClockWidget'
import { SearchWidget } from '@/components/widgets/SearchWidget'
import { ServiceWidget } from '@/components/widgets/ServiceWidget'
import { BookmarkWidget } from '@/components/widgets/BookmarkWidget'
import { SystemWidget } from '@/components/widgets/SystemWidget'
import { WeatherWidget } from '@/components/widgets/WeatherWidget'
import { NoteWidget } from '@/components/widgets/NoteWidget'
import { RSSWidget } from '@/components/widgets/RSSWidget'
import { DockerWidget } from '@/components/widgets/DockerWidget'
import { CustomAPIWidget } from '@/components/widgets/CustomAPIWidget'
import { IframeWidget } from '@/components/widgets/IframeWidget'
import { GreetingWidget } from '@/components/widgets/GreetingWidget'
import { IntegrationWidget } from '@/components/widgets/IntegrationWidget'

function WidgetRenderer({ widget, onRefresh }: { widget: Widget; onRefresh?: () => void }) {
  const config = widget.config as Record<string, unknown>

  switch (widget.type) {
    case 'clock': return <ClockWidget config={config} />
    case 'greeting': return <GreetingWidget config={config} />
    case 'search': return <SearchWidget config={config} />
    case 'service': return <ServiceWidget config={config} />
    case 'bookmark': return <BookmarkWidget config={config} />
    case 'system': return <SystemWidget config={config} onRefresh={onRefresh} />
    case 'weather': return <WeatherWidget config={config} />
    case 'note': return <NoteWidget widget={widget} />
    case 'rss': return <RSSWidget config={config} />
    case 'docker': return <DockerWidget config={config} />
    case 'custom_api': return <CustomAPIWidget config={config} />
    case 'iframe': return <IframeWidget config={config} />
    case 'integration': return <IntegrationWidget config={config} />
    default: return (
      <div className="p-4 text-[var(--text-muted)] text-sm text-center">
        Unknown widget type: {widget.type}
      </div>
    )
  }
}

interface WidgetCardProps {
  widget: Widget
  editMode: boolean
  dragHandleProps?: HTMLAttributes<HTMLElement>
}

export function WidgetCard({ widget, editMode, dragHandleProps = {} }: WidgetCardProps) {
  const { openDialog, removeWidgetFromDashboard } = useAppStore()
  const [refreshKey, setRefreshKey] = useState(0)
  const [isExpanded, setExpanded] = useState(false)

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const handleDelete = useCallback(async () => {
    openDialog({ type: 'delete-widget', widgetId: widget.id })
  }, [openDialog, widget.id])

  // Show header when title is set; empty title = no header (works for all widget types)
  const showHeader = !!(widget.title?.trim())

  return (
    <div
      className={cn(
        'group relative border transition-all duration-200 widget-card',
        'border-[var(--border)]',
        'hover:border-[var(--accent)]/30',
        'h-full flex flex-col',
        editMode && 'ring-1 ring-[var(--accent)]/20 hover:ring-[var(--accent)]/40',
        isExpanded ? 'fixed inset-4 z-50 overflow-auto' : 'overflow-hidden'
      )}
      style={{
        borderRadius: 'var(--widget-radius, 1rem)',
        backgroundColor: 'color-mix(in srgb, var(--surface) var(--widget-bg-alpha, 100%), transparent)',
        boxShadow: 'var(--widget-box-shadow, none)',
      }}
    >
      {/* Edit mode overlay toolbar */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-1 right-2 z-20 flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-lg px-1.5 py-1"
          >
            {/* Drag handle */}
            <span
              {...dragHandleProps}
              className="drag-handle p-0.5 rounded cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>

            {/* Edit */}
            <button
              onClick={() => openDialog({ type: 'edit-widget', widget })}
              className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              title="Edit widget"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="p-0.5 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors"
              title="Delete widget"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider truncate">
            {widget.title}
          </h3>
          <div className="flex items-center gap-1 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleRefresh}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/8 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Widget content */}
      <div key={refreshKey} className="flex-1 min-h-0 overflow-hidden">
        {widget.type in SCALE_TO_FIT ? (
          <ScaleToFit refW={SCALE_TO_FIT[widget.type].refW} fillWidth={SCALE_TO_FIT[widget.type].fillWidth}>
            <WidgetRenderer widget={widget} onRefresh={handleRefresh} />
          </ScaleToFit>
        ) : (
          <WidgetRenderer widget={widget} onRefresh={handleRefresh} />
        )}
      </div>
    </div>
  )
}
