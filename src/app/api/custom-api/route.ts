import { NextResponse } from 'next/server'

const ALLOWED_PROTOCOLS = ['http:', 'https:']
const ALLOWED_METHODS   = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

function getByPath(obj: unknown, path: string): unknown {
  if (!path || !obj) return obj
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current === 'object') {
      const arrMatch = part.match(/^(.+)\[(\d+)\]$/)
      if (arrMatch) {
        const key = arrMatch[1]
        const idx = parseInt(arrMatch[2])
        const obj2 = current as Record<string, unknown>
        current = Array.isArray(obj2[key]) ? (obj2[key] as unknown[])[idx] : undefined
      } else {
        current = (current as Record<string, unknown>)[part]
      }
    } else {
      return undefined
    }
  }
  return current
}

function applyAuth(
  headers: Record<string, string>,
  url: string,
  authType: string,
  authValue: string,
  authHeader: string,
  authQuery: string,
): { headers: Record<string, string>; url: string } {
  const h = { ...headers }
  let u = url
  if (authType === 'bearer') {
    h['Authorization'] = `Bearer ${authValue}`
  } else if (authType === 'basic') {
    h['Authorization'] = `Basic ${authValue}`
  } else if (authType === 'api-header') {
    h[authHeader || 'X-API-Key'] = authValue
  } else if (authType === 'api-query') {
    const parsed = new URL(url)
    parsed.searchParams.set(authQuery || 'api_key', authValue)
    u = parsed.toString()
  }
  return { headers: h, url: u }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const apiUrl     = searchParams.get('url')
  const jsonPath   = searchParams.get('path')    || ''
  const authType   = searchParams.get('auth')    || 'none'
  const authValue  = searchParams.get('authv')   || ''
  const authHeader = searchParams.get('authh')   || 'Authorization'
  const authQuery  = searchParams.get('authq')   || 'api_key'
  const headerKeys = searchParams.getAll('hk')
  const headerVals = searchParams.getAll('hv')

  if (!apiUrl) return NextResponse.json({ error: 'url parameter required' }, { status: 400 })

  let parsedUrl: URL
  try { parsedUrl = new URL(apiUrl) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 })
  }

  try {
    const baseHeaders: Record<string, string> = {}
    headerKeys.forEach((key, i) => { if (key && headerVals[i]) baseHeaders[key] = headerVals[i] })
    const { headers, url } = applyAuth(baseHeaders, apiUrl, authType, authValue, authHeader, authQuery)

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000), next: { revalidate: 30 } })
    if (!res.ok) throw new Error(`API returned ${res.status}`)

    const data = await res.json()
    const value = jsonPath ? getByPath(data, jsonPath) : data
    return NextResponse.json({ value, raw: typeof value === 'object' ? value : undefined })
  } catch (error) {
    console.error('GET /api/custom-api', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>
  try { payload = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    url: apiUrl,
    method      = 'POST',
    headers:    extraHeaders = {},
    body:       reqBody,
    bodyType    = 'json',
    authType    = 'none',
    authValue   = '',
    authHeader  = 'X-API-Key',
    authQuery   = 'api_key',
    jsonPath    = '',
  } = payload

  if (!apiUrl || typeof apiUrl !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let parsedUrl: URL
  try { parsedUrl = new URL(apiUrl) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 })
  }

  const methodStr = String(method).toUpperCase()
  if (!ALLOWED_METHODS.includes(methodStr)) {
    return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
  }

  try {
    const { headers, url } = applyAuth(
      extraHeaders as Record<string, string>,
      apiUrl,
      String(authType), String(authValue), String(authHeader), String(authQuery),
    )

    let fetchBody: string | undefined
    const fetchHeaders = { ...headers }

    if (reqBody !== undefined && methodStr !== 'GET' && methodStr !== 'DELETE') {
      if (bodyType === 'json') {
        fetchBody = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody)
        fetchHeaders['Content-Type'] = 'application/json'
      } else if (bodyType === 'form') {
        const formData = typeof reqBody === 'string' ? reqBody : new URLSearchParams(
          Object.entries(reqBody as Record<string, unknown>).map(([k, v]) => [k, String(v)])
        ).toString()
        fetchBody = String(formData)
        fetchHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
      } else {
        fetchBody = String(reqBody)
        fetchHeaders['Content-Type'] = 'text/plain'
      }
    }

    const res = await fetch(url, {
      method: methodStr,
      headers: fetchHeaders,
      body: fetchBody,
      signal: AbortSignal.timeout(10000),
    })

    const text = await res.text()
    let value: unknown = text
    try {
      const parsed = JSON.parse(text)
      value = jsonPath ? getByPath(parsed, String(jsonPath)) : parsed
    } catch { /* not JSON — keep raw text */ }

    return NextResponse.json({ value, status: res.status, ok: res.ok })
  } catch (error) {
    console.error('POST /api/custom-api', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 500 })
  }
}
