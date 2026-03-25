import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/widgets'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const dashboards = await prisma.dashboard.findMany({
      orderBy: { order: 'asc' },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    })
    // Parse widget configs from JSON strings
    const parsed = dashboards.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      widgets: d.widgets.map((w) => ({
        ...w,
        config: (() => {
          try { return JSON.parse(w.config) } catch { return {} }
        })(),
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
    }))
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('GET /api/dashboards', error)
    return NextResponse.json({ error: 'Failed to fetch dashboards' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, icon, description, columns, background, theme } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const count = await prisma.dashboard.count()
    const slug = generateSlug(name)

    const dashboard = await prisma.dashboard.create({
      data: {
        name: name.trim(),
        slug,
        icon: icon || 'layout-dashboard',
        description: description || null,
        columns: columns || 4,
        background: background || null,
        theme: theme || null,
        isDefault: count === 0,
        order: count,
      },
      include: {
        widgets: true,
      },
    })

    return NextResponse.json({
      ...dashboard,
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
      widgets: [],
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/dashboards', error)
    return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 })
  }
}
