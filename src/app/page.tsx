import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function RootPage() {
  // Seed on first visit if DB is empty
  const count = await prisma.dashboard.count().catch(() => 0)
  if (count === 0) {
    // Create default dashboard directly
    const dashboard = await prisma.dashboard.create({
      data: {
        name: 'Home',
        slug: 'home',
        icon: 'layout-dashboard',
        isDefault: true,
        order: 0,
        columns: 4,
      },
    }).catch(() => null)
    if (dashboard) {
      redirect(`/dashboard/home`)
    }
  }

  // Find the default (or first) dashboard
  const dashboard =
    (await prisma.dashboard.findFirst({ where: { isDefault: true }, orderBy: { order: 'asc' } }).catch(() => null)) ??
    (await prisma.dashboard.findFirst({ orderBy: { order: 'asc' } }).catch(() => null))

  if (dashboard) {
    redirect(`/dashboard/${dashboard.slug}`)
  }

  redirect('/dashboard/home')
}
