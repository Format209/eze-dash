import { NextResponse } from 'next/server'
import os from 'os'
import type { SystemMetrics } from '@/types'

function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const cpus1 = os.cpus()
    setTimeout(() => {
      const cpus2 = os.cpus()
      let totalIdle = 0
      let totalTick = 0
      for (let i = 0; i < cpus1.length; i++) {
        const cpu1 = cpus1[i].times
        const cpu2 = cpus2[i].times
        const idle = cpu2.idle - cpu1.idle
        const total =
          (cpu2.user - cpu1.user) +
          (cpu2.nice - cpu1.nice) +
          (cpu2.sys - cpu1.sys) +
          (cpu2.idle - cpu1.idle) +
          (cpu2.irq - cpu1.irq)
        totalIdle += idle
        totalTick += total
      }
      const usage = 100 - (100 * totalIdle) / totalTick
      resolve(Math.max(0, Math.min(100, usage)))
    }, 200)
  })
}

export async function GET() {
  try {
    const [cpuUsage] = await Promise.all([getCpuUsage()])

    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    // Get disk info via systeminformation
    let diskData: SystemMetrics['disk'] = []
    try {
      const si = await import('systeminformation')
      const fsData = await si.fsSize()
      diskData = fsData
        .filter((d) => d.size > 0)
        .slice(0, 3)
        .map((d) => ({
          path: d.mount,
          total: d.size,
          used: d.used,
          free: d.available,
          usagePercent: d.use,
        }))
    } catch {
      diskData = []
    }

    const metrics: SystemMetrics = {
      cpu: {
        usage: Math.round(cpuUsage * 10) / 10,
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: Math.round((usedMem / totalMem) * 1000) / 10,
      },
      disk: diskData,
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('GET /api/metrics', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
