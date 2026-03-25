import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const widget = await prisma.widget.findUnique({ where: { id } })
    if (!widget) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      ...widget,
      config: (() => { try { return JSON.parse(widget.config) } catch { return {} } })(),
      createdAt: widget.createdAt.toISOString(),
      updatedAt: widget.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch widget' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { title, config, colSpan, rowSpan, posX, posY, order } = body

    const widget = await prisma.widget.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(config !== undefined && { config: JSON.stringify(config) }),
        ...(colSpan !== undefined && { colSpan: Number(colSpan) }),
        ...(rowSpan !== undefined && { rowSpan: Number(rowSpan) }),
        ...(posX !== undefined && { posX: Number(posX) }),
        ...(posY !== undefined && { posY: Number(posY) }),
        ...(order !== undefined && { order: Number(order) }),
      },
    })

    return NextResponse.json({
      ...widget,
      config: (() => { try { return JSON.parse(widget.config) } catch { return {} } })(),
      createdAt: widget.createdAt.toISOString(),
      updatedAt: widget.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update widget' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.widget.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 })
  }
}
