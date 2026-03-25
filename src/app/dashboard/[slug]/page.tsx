import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardView } from '@/components/dashboard/DashboardView'
import type { Dashboard, Widget } from '@/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const dashboard = await prisma.dashboard.findUnique({ where: { slug } }).catch(() => null)
  return {
    title: dashboard ? `${dashboard.name} — EzeDash` : 'EzeDash',
  }
}

async function getDashboards(): Promise<Dashboard[]> {
  const rows = await prisma.dashboard.findMany({
    orderBy: { order: 'asc' },
  })
  return rows.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    widgets: [],
  }))
}

async function getDashboard(slug: string): Promise<Dashboard | null> {
  const row = await prisma.dashboard.findUnique({
    where: { slug },
    include: { widgets: { orderBy: { order: 'asc' } } },
  })
  if (!row) return null

  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    widgets: row.widgets.map((w) => ({
      ...w,
      type: w.type as Widget['type'],
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      config: (() => { try { return JSON.parse(w.config) } catch { return {} } })(),
    })),
  }
}

export default async function DashboardPage({ params }: PageProps) {
  const { slug } = await params

  const [dashboard, allDashboards] = await Promise.all([
    getDashboard(slug),
    getDashboards(),
  ])

  if (!dashboard) {
    notFound()
  }

  return (
    <AppShell initialDashboards={allDashboards}>
      <DashboardView dashboard={dashboard} />
    </AppShell>
  )
}
