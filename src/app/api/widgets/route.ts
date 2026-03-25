import { prisma } from '@/lib/prisma'
import { getWidgetDef } from '@/lib/widgets'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, title, config, colSpan, rowSpan, posX, posY, dashboardId } = body

    if (!type || !dashboardId) {
      return NextResponse.json({ error: 'type and dashboardId are required' }, { status: 400 })
    }

    const def = getWidgetDef(type)
    if (!def) {
      return NextResponse.json({ error: 'Unknown widget type' }, { status: 400 })
    }

    const count = await prisma.widget.count({ where: { dashboardId } })
    const mergedConfig = { ...def.defaultConfig, ...(config || {}) }

    const widget = await prisma.widget.create({
      data: {
        type,
        title: (title || def.label).trim(),
        config: JSON.stringify(mergedConfig),
        colSpan: colSpan ?? def.defaultColSpan,
        rowSpan: rowSpan ?? def.defaultRowSpan,
        posX: posX ?? 0,
        posY: posY ?? 0,
        order: count,
        dashboardId,
      },
    })

    return NextResponse.json({
      ...widget,
      config: mergedConfig,
      createdAt: widget.createdAt.toISOString(),
      updatedAt: widget.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/widgets', error)
    return NextResponse.json({ error: 'Failed to create widget' }, { status: 500 })
  }
}
