import { NextResponse } from 'next/server'
import type { ServiceStatus } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 })
  }

  // Validate URL to prevent SSRF
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Only allow HTTP/HTTPS
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 })
  }

  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    })

    const responseTime = Date.now() - start
    const status: ServiceStatus = {
      online: res.ok || res.status < 500,
      statusCode: res.status,
      responseTime,
      checkedAt: new Date().toISOString(),
    }
    return NextResponse.json(status)
  } catch (err: unknown) {
    const responseTime = Date.now() - start
    const error = err instanceof Error ? err.message : 'Unknown error'
    const status: ServiceStatus = {
      online: false,
      responseTime,
      error: error.includes('timeout') ? 'Timeout' : 'Unreachable',
      checkedAt: new Date().toISOString(),
    }
    return NextResponse.json(status)
  }
}
