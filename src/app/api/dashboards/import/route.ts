import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/widgets'
import { NextResponse } from 'next/server'

interface ImportWidget {
  type: string
  title: string
  config: Record<string, unknown>
  colSpan?: number
  rowSpan?: number
  posX?: number
  posY?: number
  order?: number
}

interface ImportDashboard {
  name: string
  icon?: string
  description?: string | null
  columns?: number
  background?: string | null
  theme?: string | null
  widgets?: ImportWidget[]
}

interface ImportPayload {
  version?: string
  dashboards: ImportDashboard[]
}

export async function POST(request: Request) {
  let payload: ImportPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(payload?.dashboards) || payload.dashboards.length === 0) {
    return NextResponse.json({ error: 'Payload must contain a dashboards array' }, { status: 400 })
  }

  const created: Array<{ id: string; name: string; widgetCount: number }> = []

  try {
    const baseOrder = await prisma.dashboard.count()

    for (let i = 0; i < payload.dashboards.length; i++) {
      const d = payload.dashboards[i]
      if (!d.name?.trim()) continue

      const slug = generateSlug(d.name)

      const dashboard = await prisma.dashboard.create({
        data: {
          name: d.name.trim(),
          slug,
          icon: d.icon || 'layout-dashboard',
          description: d.description ?? null,
          columns: d.columns ?? 4,
          background: d.background ?? null,
          theme: d.theme ?? null,
          isDefault: false,
          order: baseOrder + i,
        },
      })

      const widgets = (d.widgets ?? []).map((w, idx) => ({
        type: w.type,
        title: w.title ?? '',
        config: JSON.stringify(w.config ?? {}),
        colSpan: w.colSpan ?? 2,
        rowSpan: w.rowSpan ?? 15,
        posX: w.posX ?? 0,
        posY: w.posY ?? 0,
        order: w.order ?? idx,
        dashboardId: dashboard.id,
      }))

      if (widgets.length > 0) {
        await prisma.widget.createMany({ data: widgets })
      }

      created.push({ id: dashboard.id, name: dashboard.name, widgetCount: widgets.length })
    }

    return NextResponse.json({ imported: created.length, dashboards: created }, { status: 201 })
  } catch (error) {
    console.error('POST /api/dashboards/import', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
