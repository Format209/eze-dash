import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Called once on first app load to seed default data
export async function POST() {
  try {
    // Ensure settings exist
    await prisma.settings.upsert({
      where: { id: 'settings' },
      create: { id: 'settings', theme: 'dark', accentColor: '#6366f1' },
      update: {},
    })

    // Create default dashboard if none exist
    const existing = await prisma.dashboard.count()
    if (existing > 0) {
      return NextResponse.json({ seeded: false, message: 'Data already exists' })
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        name: 'Home',
        slug: 'home',
        icon: 'home',
        description: 'Your personal dashboard',
        columns: 4,
        isDefault: true,
        order: 0,
      },
    })

    // Create default widgets
    const defaultWidgets = [
      {
        type: 'greeting',
        title: 'Welcome',
        config: JSON.stringify({ name: '', showDate: true }),
        colSpan: 4,
        rowSpan: 1,
        order: 0,
        dashboardId: dashboard.id,
      },
      {
        type: 'clock',
        title: 'Clock',
        config: JSON.stringify({ format: '24h', showDate: true, showSeconds: true }),
        colSpan: 2,
        rowSpan: 1,
        order: 1,
        dashboardId: dashboard.id,
      },
      {
        type: 'search',
        title: 'Search',
        config: JSON.stringify({ engine: 'duckduckgo', placeholder: 'Search...', openInNewTab: true }),
        colSpan: 2,
        rowSpan: 1,
        order: 2,
        dashboardId: dashboard.id,
      },
      {
        type: 'weather',
        title: 'Weather',
        config: JSON.stringify({
          latitude: 40.7128,
          longitude: -74.006,
          locationName: 'New York',
          units: 'celsius',
          showForecast: true,
          forecastDays: 3,
        }),
        colSpan: 2,
        rowSpan: 2,
        order: 3,
        dashboardId: dashboard.id,
      },
      {
        type: 'system',
        title: 'System',
        config: JSON.stringify({ showCPU: true, showRAM: true, showDisk: true, showUptime: true }),
        colSpan: 2,
        rowSpan: 2,
        order: 4,
        dashboardId: dashboard.id,
      },
    ]

    await prisma.widget.createMany({ data: defaultWidgets })

    return NextResponse.json({ seeded: true, dashboardId: dashboard.id })
  } catch (error) {
    console.error('POST /api/init', error)
    return NextResponse.json({ error: 'Failed to initialize' }, { status: 500 })
  }
}

// Seeds a rich demo dashboard  idempotent (skips if a "Demo" dashboard already exists)
export async function PUT() {
  try {
    await prisma.settings.upsert({
      where: { id: 'settings' },
      create: { id: 'settings', theme: 'dark', accentColor: '#6366f1' },
      update: {},
    })

    const exists = await prisma.dashboard.findFirst({ where: { slug: 'demo' } })
    if (exists) {
      return NextResponse.json({ seeded: false, message: 'Demo dashboard already exists', dashboardId: exists.id })
    }

    const count = await prisma.dashboard.count()

    const accentColor = '#6366f1'
    const theme = JSON.stringify({
      accentColor,
      textColor: '#e2e8f0',
      widgetRadius: 16,
      widgetOpacity: 85,
      glowEnabled: true,
      glowIntensity: 0.5,
      bgColor: '#0f172a',
    })

    const dash = await prisma.dashboard.create({
      data: {
        name: 'Demo',
        slug: 'demo',
        icon: 'sparkles',
        description: 'A showcase of all available widget types',
        columns: 8,
        isDefault: count === 0,
        order: count,
        theme,
      },
    })
    const id = dash.id

    // 8-column x 100-row grid  6 horizontal bands that tile the full viewport
    //
    //  y=0..8   [ Greeting 8                                             ]
    //  y=8..28  [ Clock2 ][ Clock2 ][ Clock2 ][ Clock2  ]
    //  y=28..36 [ Search 4              ][ Quote 4                      ]
    //  y=36..64 [ Weather 4             ][ System 4                     ]
    //  y=64..82 [ Notes 4               ][ RSS 4                        ]
    //  y=82..100[ Bookmarks3 ][ Services2 ][ Live Map 3               ]

    const widgets: Array<{
      type: string; title: string; config: string
      colSpan: number; rowSpan: number; posX: number; posY: number; order: number; dashboardId: string
    }> = [
      // Band 1  y=0 h=8  full-width greeting
      {
        type: 'greeting', title: '',
        config: JSON.stringify({
          name: 'Explorer',
          showDate: true, showTime: false, showEmoji: true,
          customMessage: 'Welcome to eze-dash  every widget, one perfect canvas.',
          align: 'center', greetingSize: 'lg',
        }),
        colSpan: 8, rowSpan: 8, posX: 0, posY: 0, order: 0, dashboardId: id,
      },

      // Band 2  y=8 h=20  four clock styles side-by-side
      {
        type: 'clock', title: 'Digital',
        config: JSON.stringify({ timezone: 'local', format: '24h', showDate: true, showSeconds: true, clockStyle: 'digital' }),
        colSpan: 2, rowSpan: 20, posX: 0, posY: 8, order: 1, dashboardId: id,
      },
      {
        type: 'clock', title: 'Analog',
        config: JSON.stringify({ timezone: 'local', format: '12h', showDate: false, showSeconds: true, clockStyle: 'analog' }),
        colSpan: 2, rowSpan: 20, posX: 2, posY: 8, order: 2, dashboardId: id,
      },
      {
        type: 'clock', title: 'World Clocks',
        config: JSON.stringify({
          timezone: 'America/New_York', format: '12h', showDate: false, showSeconds: false,
          clockStyle: 'minimal', multiLayout: 'list',
          additionalTimezones: [
            { timezone: 'Europe/London', label: 'London' },
            { timezone: 'Europe/Paris', label: 'Paris' },
            { timezone: 'Asia/Tokyo', label: 'Tokyo' },
            { timezone: 'Australia/Sydney', label: 'Sydney' },
          ],
        }),
        colSpan: 2, rowSpan: 20, posX: 4, posY: 8, order: 3, dashboardId: id,
      },
      {
        type: 'clock', title: 'Flip Clock',
        config: JSON.stringify({ timezone: 'local', format: '24h', showDate: true, showSeconds: true, clockStyle: 'flip' }),
        colSpan: 2, rowSpan: 20, posX: 6, posY: 8, order: 4, dashboardId: id,
      },

      // Band 3  y=28 h=8  search bar + live quote
      {
        type: 'search', title: '',
        config: JSON.stringify({ engine: 'duckduckgo', placeholder: 'Search anything...', openInNewTab: true }),
        colSpan: 4, rowSpan: 8, posX: 0, posY: 28, order: 5, dashboardId: id,
      },
      {
        type: 'custom_api', title: 'Random Quote',
        config: JSON.stringify({
          url: 'https://api.quotable.io/random',
          method: 'GET', headers: {},
          jsonPath: 'content',
          label: 'Quote of the moment',
          displayType: 'text',
          refreshInterval: 60,
        }),
        colSpan: 4, rowSpan: 8, posX: 4, posY: 28, order: 6, dashboardId: id,
      },

      // Band 4  y=36 h=28  weather + system monitor
      {
        type: 'weather', title: 'Weather',
        config: JSON.stringify({
          latitude: 51.5074, longitude: -0.1278,
          locationName: 'London',
          units: 'celsius', showForecast: true, forecastDays: 4,
          refreshInterval: 20,
        }),
        colSpan: 4, rowSpan: 28, posX: 0, posY: 36, order: 7, dashboardId: id,
      },
      {
        type: 'system', title: 'System',
        config: JSON.stringify({ showCPU: true, showRAM: true, showDisk: true, showNetwork: true, showUptime: true, refreshInterval: 5 }),
        colSpan: 4, rowSpan: 28, posX: 4, posY: 36, order: 8, dashboardId: id,
      },

      // Band 5  y=64 h=18  notes + RSS feed
      {
        type: 'note', title: 'Notes',
        config: JSON.stringify({
          content: '# eze-dash Features\n\n- **12 widget types**  clocks, weather, RSS, bookmarks and more\n- **Drag & drop** layout with resizable widgets\n- **Per-dashboard theming**  accent colors, gradients, glows\n- **Integration widgets**  Pi-hole, Sonarr, Jellyfin, Portainer\n- **Collapsible header**  maximise canvas space\n- **Edit mode**  add, remove, reorder any widget',
          background: 'default', fontSize: 'sm',
        }),
        colSpan: 4, rowSpan: 18, posX: 0, posY: 64, order: 9, dashboardId: id,
      },
      {
        type: 'rss', title: 'Tech News',
        config: JSON.stringify({
          url: 'https://feeds.arstechnica.com/arstechnica/index',
          maxItems: 6, showDescription: false, showDate: true, openInNewTab: true,
          refreshInterval: 15,
        }),
        colSpan: 4, rowSpan: 18, posX: 4, posY: 64, order: 10, dashboardId: id,
      },

      // Band 6  y=82 h=18  bookmarks | services | live map
      {
        type: 'bookmark', title: 'Quick Links',
        config: JSON.stringify({
          layout: 'grid', openInNewTab: true,
          bookmarks: [
            { url: 'https://github.com', label: 'GitHub', icon: 'github', description: 'Code hosting' },
            { url: 'https://vercel.com', label: 'Vercel', icon: 'triangle', description: 'Deployments' },
            { url: 'https://nextjs.org', label: 'Next.js', icon: 'zap', description: 'Framework docs' },
            { url: 'https://tailwindcss.com', label: 'Tailwind', icon: 'wind', description: 'CSS framework' },
            { url: 'https://prisma.io', label: 'Prisma', icon: 'database', description: 'ORM docs' },
            { url: 'https://lucide.dev', label: 'Lucide', icon: 'shapes', description: 'Icon set' },
          ],
        }),
        colSpan: 3, rowSpan: 18, posX: 0, posY: 82, order: 11, dashboardId: id,
      },
      {
        type: 'service', title: 'Services',
        config: JSON.stringify({
          services: [
            { url: 'https://github.com', label: 'GitHub', description: 'Code hosting' },
            { url: 'https://cloudflare.com', label: 'Cloudflare', description: 'CDN & DNS' },
            { url: 'https://1.1.1.1', label: 'Cloudflare DNS', description: '1.1.1.1' },
          ],
          showStatus: true, showResponseTime: true, checkInterval: 30,
        }),
        colSpan: 2, rowSpan: 18, posX: 3, posY: 82, order: 12, dashboardId: id,
      },
      {
        type: 'iframe', title: 'Live Wind Map',
        config: JSON.stringify({
          url: 'https://earth.nullschool.net/#current/wind/surface/level/orthographic=-10,45,400',
          allowFullscreen: true, sandbox: false,
        }),
        colSpan: 3, rowSpan: 18, posX: 5, posY: 82, order: 13, dashboardId: id,
      },
    ]

    await prisma.widget.createMany({ data: widgets })

    return NextResponse.json({ seeded: true, dashboardId: id, widgetCount: widgets.length })
  } catch (error) {
    console.error('PUT /api/init', error)
    return NextResponse.json({ error: 'Failed to create demo dashboard' }, { status: 500 })
  }
}
