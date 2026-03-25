import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id },
      include: { widgets: { orderBy: { order: 'asc' } } },
    })
    if (!dashboard) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      ...dashboard,
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
      widgets: dashboard.widgets.map((w) => ({
        ...w,
        config: (() => { try { return JSON.parse(w.config) } catch { return {} } })(),
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { name, icon, description, columns, background, theme, isDefault } = body

    const dashboard = await prisma.dashboard.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(icon !== undefined && { icon }),
        ...(description !== undefined && { description }),
        ...(columns !== undefined && { columns: Number(columns) }),
        ...(background !== undefined && { background }),
        ...(theme !== undefined && { theme }),
        ...(isDefault !== undefined && { isDefault }),
      },
      include: { widgets: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({
      ...dashboard,
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
      widgets: dashboard.widgets.map((w) => ({
        ...w,
        config: (() => { try { return JSON.parse(w.config) } catch { return {} } })(),
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const count = await prisma.dashboard.count()
    if (count <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last dashboard' }, { status: 400 })
    }
    await prisma.dashboard.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete dashboard' }, { status: 500 })
  }
}

