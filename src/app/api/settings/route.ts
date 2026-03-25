import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 'settings' } })
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 'settings', theme: 'dark', accentColor: '#6366f1' },
      })
    }
    return NextResponse.json(settings)
  } catch (error) {
    console.error('GET /api/settings', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { theme, accentColor, gridColumns, background, customCSS, siteTitle, faviconUrl } = body

    const settings = await prisma.settings.upsert({
      where: { id: 'settings' },
      create: {
        id: 'settings',
        theme: theme || 'dark',
        accentColor: accentColor || '#6366f1',
        gridColumns: gridColumns || 4,
        background: background || null,
        customCSS: customCSS || null,
        siteTitle: siteTitle || 'EzeDash',
        faviconUrl: faviconUrl || null,
      },
      update: {
        ...(theme !== undefined && { theme }),
        ...(accentColor !== undefined && { accentColor }),
        ...(gridColumns !== undefined && { gridColumns: Number(gridColumns) }),
        ...(background !== undefined && { background }),
        ...(customCSS !== undefined && { customCSS }),
        ...(siteTitle !== undefined && { siteTitle }),
        ...(faviconUrl !== undefined && { faviconUrl }),
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('PUT /api/settings', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
