import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// PUT /api/widgets/reorder  { dashboardId, orderedIds: string[] }
export async function PUT(request: Request) {
  try {
    const { dashboardId, orderedIds } = await request.json()
    if (!dashboardId || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'dashboardId and orderedIds required' }, { status: 400 })
    }

    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        prisma.widget.update({ where: { id }, data: { order: index } })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to reorder widgets' }, { status: 500 })
  }
}
