'use client'

import { GridLayout, noCompactor, type LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useAppStore } from '@/store/appStore'
import type { Widget } from '@/types'
import { WidgetCard } from '@/components/widgets/WidgetCard'
import { useCallback, useEffect, useRef, useState } from 'react'

// noCompactor with allowOverlap:true — free placement, no pushing
const freeCompactor = { ...noCompactor, allowOverlap: true }

const TOTAL_ROWS = 100

type RGLLayout = readonly LayoutItem[]

async function persistLayout(items: RGLLayout) {
  await Promise.all(
    items.map((item) =>
      fetch(`/api/widgets/${item.i}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posX: item.x,
          posY: item.y,
          colSpan: item.w,
          rowSpan: item.h,
        }),
      })
    )
  )
}

interface DashboardGridProps {
  widgets: Widget[]
  gridColumns: number
}

export function DashboardGrid({ widgets, gridColumns }: DashboardGridProps) {
  const { editMode, updateWidgetInDashboard } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  // Track container width for column sizing
  const [width, setWidth] = useState(1280)
  // Track viewport height for rowHeight — stays proportional even when grid scrolls
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 900
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0].contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const rowHeight = Math.max(1, viewportHeight / TOTAL_ROWS)

  const layout: LayoutItem[] = widgets.map((w) => ({
    i: w.id,
    x: w.posX ?? 0,
    y: w.posY ?? 0,
    w: Math.min(w.colSpan, gridColumns),
    h: w.rowSpan,
    minW: 1,
    minH: 1,
  }))

  const syncStore = useCallback(
    (newLayout: RGLLayout) => {
      newLayout.forEach((item) => {
        const widget = widgets.find((w) => w.id === item.i)
        if (!widget) return
        if (
          widget.posX !== item.x ||
          widget.posY !== item.y ||
          widget.colSpan !== item.w ||
          widget.rowSpan !== item.h
        ) {
          updateWidgetInDashboard({
            ...widget,
            posX: item.x,
            posY: item.y,
            colSpan: item.w,
            rowSpan: item.h,
          })
        }
      })
    },
    [widgets, updateWidgetInDashboard]
  )

  const handleDragStop = useCallback(
    (newLayout: RGLLayout) => {
      syncStore(newLayout)
      persistLayout(newLayout).catch(console.error)
    },
    [syncStore]
  )

  const handleResizeStop = useCallback(
    (newLayout: RGLLayout) => {
      syncStore(newLayout)
      persistLayout(newLayout).catch(console.error)
    },
    [syncStore]
  )

  return (
    <div ref={containerRef} style={{ minHeight: '100%' }}>
      {width > 0 && (
        <GridLayout
          width={width}
          layout={layout}
          compactor={freeCompactor}
          autoSize
          style={{ minHeight: '100%' }}
          gridConfig={{
            cols: gridColumns,
            rowHeight,
            margin: [0, 0],
          }}
          dragConfig={{ enabled: editMode, handle: '.drag-handle' }}
          resizeConfig={{ enabled: editMode }}
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
        >
          {widgets.map((widget) => (
            <div key={widget.id} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: '4px' }}>
                <WidgetCard widget={widget} editMode={editMode} dragHandleProps={{}} />
              </div>
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  )
}


