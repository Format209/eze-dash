import { NextResponse } from 'next/server'
import type { DockerContainer } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const host = searchParams.get('host') || 'http://localhost:2375'
  const showAll = searchParams.get('all') === 'true'
  const filter = searchParams.get('filter') || ''

  // Validate Docker host URL
  let dockerUrl: URL
  try {
    dockerUrl = new URL(host)
  } catch {
    return NextResponse.json({ error: 'Invalid Docker host URL' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(dockerUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP/HTTPS Docker hosts are supported' }, { status: 400 })
  }

  try {
    const allParam = showAll ? '?all=1' : ''
    const res = await fetch(`${host}/containers/json${allParam}`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) throw new Error(`Docker API returned ${res.status}`)

    const raw = await res.json()

    const containers: DockerContainer[] = raw
      .filter((c: Record<string, unknown>) => {
        if (!filter) return true
        const names = (c.Names as string[]).join(' ')
        return names.toLowerCase().includes(filter.toLowerCase())
      })
      .map((c: Record<string, unknown>) => {
        const names = c.Names as string[]
        const name = names[0]?.replace(/^\//, '') || c.Id as string
        const portsRaw = c.Ports as Array<{ IP?: string; PrivatePort?: number; PublicPort?: number; Type?: string }>
        const ports = portsRaw
          .filter((p) => p.PublicPort)
          .map((p) => `${p.PublicPort}:${p.PrivatePort}`)

        return {
          id: (c.Id as string).substring(0, 12),
          name,
          image: c.Image as string,
          status: c.Status as string,
          state: c.State as DockerContainer['state'],
          ports,
          created: new Date((c.Created as number) * 1000).toISOString(),
        }
      })

    return NextResponse.json({ containers, host })
  } catch (error) {
    console.error('GET /api/docker', error)
    const msg = error instanceof Error ? error.message : 'Failed to connect to Docker'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
