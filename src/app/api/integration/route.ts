import { NextResponse } from 'next/server'

interface IntegrationStat {
  label: string
  value: string | number
  color?: 'default' | 'green' | 'red' | 'yellow' | 'blue'
}

interface IntegrationData {
  service: string
  status: 'ok' | 'error'
  error?: string
  stats: IntegrationStat[]
  blocking?: boolean   // Pi-hole: current blocking state
}

function validateUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    if (!['http:', 'https:'].includes(u.protocol)) return null
    return raw.replace(/\/$/, '')
  } catch {
    return null
  }
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB'
  return bytes + ' B'
}

function fmtSpeed(bps: number): string {
  return fmtBytes(bps) + '/s'
}

// ---- Pi-hole helpers ----
// SID cache: keyed by `${base}::${apiKey}`, value is { sid, expiresAt }
// Pi-hole v6 default session TTL is 5 hours; we cache for 4.5 h to stay safe.
const piholeSessionCache = new Map<string, { sid: string; expiresAt: number }>()
const PIHOLE_SESSION_TTL_MS = 4.5 * 60 * 60 * 1000

async function piholeV6Login(
  base: string,
  apiKey: string,
  forceRefresh = false,
): Promise<string | null> {
  const cacheKey = `${base}::${apiKey}`

  if (!forceRefresh) {
    const cached = piholeSessionCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.sid
    }
  }

  const authRes = await fetch(`${base}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: apiKey }),
    signal: AbortSignal.timeout(8000),
  })
  if (authRes.ok) {
    const d = await authRes.json()
    const sid: string = d?.session?.sid ?? ''
    if (sid) {
      piholeSessionCache.set(cacheKey, { sid, expiresAt: Date.now() + PIHOLE_SESSION_TTL_MS })
    }
    return sid || null
  }
  if (authRes.status === 404) return null // v5 — no /api/ prefix
  throw new Error(`Auth failed: HTTP ${authRes.status}`)
}

// ---- Pi-hole (v6 with v5 fallback) ----
async function fetchPihole(base: string, apiKey: string): Promise<IntegrationData> {
  const sid = await piholeV6Login(base, apiKey)

  if (sid !== null) {
    const h = { 'X-FTL-SID': sid }
    const [sRes, bRes] = await Promise.all([
      fetch(`${base}/api/stats/summary`, { headers: h, signal: AbortSignal.timeout(8000) }),
      fetch(`${base}/api/dns/blocking`,  { headers: h, signal: AbortSignal.timeout(8000) }),
    ])

    // 401 means the cached SID expired early — re-auth once and retry
    if (sRes.status === 401) {
      const freshSid = await piholeV6Login(base, apiKey, true)
      if (!freshSid) throw new Error('Re-authentication failed')
      const hf = { 'X-FTL-SID': freshSid }
      const [sRes2, bRes2] = await Promise.all([
        fetch(`${base}/api/stats/summary`, { headers: hf, signal: AbortSignal.timeout(8000) }),
        fetch(`${base}/api/dns/blocking`,  { headers: hf, signal: AbortSignal.timeout(8000) }),
      ])
      if (!sRes2.ok) throw new Error(`HTTP ${sRes2.status}`)
      return buildPiholeV6Result(await sRes2.json(), bRes2.ok ? await bRes2.json() : null)
    }

    if (!sRes.ok) throw new Error(`HTTP ${sRes.status}`)
    return buildPiholeV6Result(await sRes.json(), bRes.ok ? await bRes.json() : null)
  }

  // Fallback: Pi-hole v5 /admin/api.php
  const res = await fetch(
    `${base}/admin/api.php?summaryRaw&auth=${encodeURIComponent(apiKey)}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const d = await res.json()
  if (d.error) throw new Error(d.error)
  const pct = Number(d.ads_percentage_today ?? 0).toFixed(1)
  return {
    service: 'pihole', status: 'ok',
    blocking: d.status === 'enabled',
    stats: [
      { label: 'DNS Queries', value: fmt(Number(d.dns_queries_today ?? 0)) },
      { label: 'Blocked', value: `${fmt(Number(d.ads_blocked_today ?? 0))} (${pct}%)`, color: 'red' },
      { label: 'Block-listed', value: fmt(Number(d.domains_being_blocked ?? 0)) },
      { label: 'Clients', value: Number(d.unique_clients ?? 0) },
    ],
  }
}

function buildPiholeV6Result(d: Record<string, unknown>, blockData: Record<string, unknown> | null): IntegrationData {
  const queries = d.queries as Record<string, unknown> | undefined
  const gravity = d.gravity as Record<string, unknown> | undefined
  const clients = d.clients as Record<string, unknown> | undefined
  const total = Number(queries?.total ?? 0)
  const blocked = Number(queries?.blocked ?? 0)
  const pct = total > 0 ? ((blocked / total) * 100).toFixed(1) : '0'
  return {
    service: 'pihole', status: 'ok',
    // Pi-hole v6 returns boolean true/false; some builds return 'enabled'/'disabled'
    blocking: blockData == null
      ? true
      : blockData.blocking === true || blockData.blocking === 'enabled',
    stats: [
      { label: 'DNS Queries', value: fmt(total) },
      { label: 'Blocked', value: `${fmt(blocked)} (${pct}%)`, color: 'red' },
      { label: 'Block-listed', value: fmt(Number(gravity?.domains_being_blocked ?? 0)) },
      { label: 'Clients', value: Number(clients?.active ?? 0) },
    ],
  }
}

// ---- Pi-hole toggle blocking ----
async function togglePiholeBlocking(base: string, apiKey: string, enable: boolean): Promise<void> {
  const sid = await piholeV6Login(base, apiKey)
  if (sid !== null) {
    // v6: POST /api/dns/blocking — try cached SID first, re-auth on 401
    const doToggle = async (s: string) =>
      fetch(`${base}/api/dns/blocking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-FTL-SID': s },
        body: JSON.stringify({ blocking: enable }),
        signal: AbortSignal.timeout(8000),
      })
    let res = await doToggle(sid)
    if (res.status === 401) {
      const freshSid = await piholeV6Login(base, apiKey, true)
      if (!freshSid) throw new Error('Re-authentication failed')
      res = await doToggle(freshSid)
    }
    if (!res.ok) throw new Error(`Toggle failed: HTTP ${res.status}`)
    return
  }
  // v5: GET /admin/api.php?enable / ?disable
  const action = enable ? 'enable' : 'disable'
  const res = await fetch(
    `${base}/admin/api.php?${action}&auth=${encodeURIComponent(apiKey)}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`Toggle failed: HTTP ${res.status}`)
}

// ---- AdGuard Home ----
async function fetchAdguard(base: string, user: string, pass: string): Promise<IntegrationData> {
  const auth = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
  const [sRes, stRes] = await Promise.all([
    fetch(`${base}/control/stats`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(8000) }),
    fetch(`${base}/control/status`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(8000) }),
  ])
  if (!sRes.ok) throw new Error(`HTTP ${sRes.status}`)
  const d = await sRes.json()
  const st = stRes.ok ? await stRes.json() : null
  const pct = d.num_dns_queries > 0
    ? ((d.num_blocked_filtering / d.num_dns_queries) * 100).toFixed(1) : '0'
  return {
    service: 'adguard', status: 'ok',
    stats: [
      { label: 'DNS Queries', value: fmt(d.num_dns_queries ?? 0) },
      { label: 'Filtered', value: `${fmt(d.num_blocked_filtering ?? 0)} (${pct}%)`, color: 'red' },
      { label: 'Safebrowsing', value: fmt((d.num_replaced_safebrowsing ?? 0) + (d.num_replaced_parental ?? 0)) },
      ...(st ? [{ label: 'Status', value: st.running ? 'Running' : 'Stopped', color: (st.running ? 'green' : 'red') as 'green' | 'red' }] : []),
    ],
  }
}

// ---- Arr apps: Sonarr / Radarr / Lidarr / Readarr / Prowlarr ----
async function fetchArr(service: string, base: string, apiKey: string): Promise<IntegrationData> {
  const h = { 'X-Api-Key': apiKey }
  const v = (service === 'lidarr' || service === 'readarr' || service === 'prowlarr') ? 'v1' : 'v3'
  const api = `/api/${v}`

  const countPath: Record<string, string> = {
    sonarr: `${api}/series`, radarr: `${api}/movie`,
    lidarr: `${api}/artist`, readarr: `${api}/book`, prowlarr: `${api}/indexer`,
  }
  const countLabel: Record<string, string> = {
    sonarr: 'Series', radarr: 'Movies', lidarr: 'Artists', readarr: 'Books', prowlarr: 'Indexers',
  }
  const missingPath = service === 'prowlarr'
    ? `${api}/history?page=1&pageSize=1`
    : `${api}/wanted/missing?page=1&pageSize=1`

  const [qRes, cRes, mRes] = await Promise.allSettled([
    fetch(`${base}${api}/queue/status`, { headers: h, signal: AbortSignal.timeout(8000) }),
    fetch(`${base}${countPath[service]}`, { headers: h, signal: AbortSignal.timeout(8000) }),
    fetch(`${base}${missingPath}`, { headers: h, signal: AbortSignal.timeout(8000) }),
  ])

  const stats: IntegrationStat[] = []

  if (cRes.status === 'fulfilled' && cRes.value.ok) {
    const data = await cRes.value.json()
    stats.push({ label: countLabel[service] ?? 'Items', value: Array.isArray(data) ? data.length : 0 })
  }
  if (qRes.status === 'fulfilled' && qRes.value.ok) {
    const q = await qRes.value.json()
    const n = q.totalCount ?? q.count ?? 0
    stats.push({ label: 'Queue', value: n, color: n > 0 ? 'yellow' : 'default' })
  }
  if (mRes.status === 'fulfilled' && mRes.value.ok) {
    const m = await mRes.value.json()
    const n = m.totalRecords ?? 0
    const isHistory = service === 'prowlarr'
    stats.push({ label: isHistory ? 'Recent Grabs' : 'Missing', value: n, color: !isHistory && n > 0 ? 'red' : 'default' })
  }

  if (stats.length === 0) throw new Error('No data — check URL and API key')
  return { service, status: 'ok', stats }
}

// ---- qBittorrent ----
async function fetchQbittorrent(base: string, user: string, pass: string): Promise<IntegrationData> {
  const loginRes = await fetch(`${base}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: base },
    body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
    signal: AbortSignal.timeout(8000),
  })
  const cookie = loginRes.headers.get('set-cookie') ?? ''
  const sid = cookie.match(/SID=([^;]+)/)?.[1] ?? ''
  const cookieHdr: Record<string, string> = sid ? { Cookie: `SID=${sid}` } : {}

  const [infoRes, torRes] = await Promise.all([
    fetch(`${base}/api/v2/transfer/info`, { headers: cookieHdr, signal: AbortSignal.timeout(8000) }),
    fetch(`${base}/api/v2/torrents/info?filter=active`, { headers: cookieHdr, signal: AbortSignal.timeout(8000) }),
  ])
  if (!infoRes.ok) throw new Error(`HTTP ${infoRes.status}`)
  const info = await infoRes.json()
  const torrents = torRes.ok ? await torRes.json() : []
  return {
    service: 'qbittorrent', status: 'ok',
    stats: [
      { label: '↓ Download', value: fmtSpeed(info.dl_info_speed ?? 0), color: 'green' },
      { label: '↑ Upload', value: fmtSpeed(info.up_info_speed ?? 0), color: 'blue' },
      { label: 'Active', value: Array.isArray(torrents) ? torrents.length : 0 },
      { label: 'Downloaded', value: fmtBytes(info.dl_info_data ?? 0) },
    ],
  }
}

// ---- Transmission ----
async function fetchTransmission(base: string, user: string, pass: string): Promise<IntegrationData> {
  const rpc = `${base}/transmission/rpc`
  const basicAuth = user ? `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` : undefined
  const baseHeaders: Record<string, string> = basicAuth ? { Authorization: basicAuth } : {}

  // Grab CSRF session-id (returns 409)
  const csrf = await fetch(rpc, { headers: baseHeaders, signal: AbortSignal.timeout(5000) }).catch(() => null)
  const sessionId = csrf?.headers.get('x-transmission-session-id') ?? ''

  const res = await fetch(rpc, {
    method: 'POST',
    headers: { ...baseHeaders, 'Content-Type': 'application/json', 'X-Transmission-Session-Id': sessionId },
    body: JSON.stringify({ method: 'session-stats', arguments: {} }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const a = data.arguments ?? {}
  return {
    service: 'transmission', status: 'ok',
    stats: [
      { label: '↓ Download', value: fmtSpeed(a.downloadSpeed ?? 0), color: 'green' },
      { label: '↑ Upload', value: fmtSpeed(a.uploadSpeed ?? 0), color: 'blue' },
      { label: 'Active', value: a.activeTorrentCount ?? 0 },
      { label: 'Total', value: a.torrentCount ?? 0 },
    ],
  }
}

// ---- SABnzbd ----
async function fetchSabnzbd(base: string, apiKey: string): Promise<IntegrationData> {
  const res = await fetch(`${base}/sabnzbd/api?mode=queue&output=json&apikey=${encodeURIComponent(apiKey)}`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const q = data.queue ?? {}
  return {
    service: 'sabnzbd', status: 'ok',
    stats: [
      { label: 'Status', value: q.status ?? 'Unknown', color: q.status === 'Downloading' ? 'green' : 'default' },
      { label: 'Speed', value: q.speed ?? '0 B/s' },
      { label: 'Queue', value: `${q.noofslots_total ?? 0} jobs` },
      { label: 'Remaining', value: q.sizeleft ?? '0 B' },
    ],
  }
}

// ---- Jellyfin / Emby ----
async function fetchJellyfin(base: string, apiKey: string, isEmby: boolean): Promise<IntegrationData> {
  const kp = `?api_key=${encodeURIComponent(apiKey)}`
  const h: Record<string, string> = isEmby ? { 'X-Emby-Token': apiKey } : {}
  const [sRes, cRes] = await Promise.all([
    fetch(`${base}/Sessions${kp}`, { headers: h, signal: AbortSignal.timeout(8000) }),
    fetch(`${base}/Items/Counts${kp}`, { headers: h, signal: AbortSignal.timeout(8000) }),
  ])
  const sessions = sRes.ok ? await sRes.json() : []
  const counts = cRes.ok ? await cRes.json() : {}
  const active = Array.isArray(sessions) ? sessions.filter((s: Record<string, unknown>) => s.NowPlayingItem).length : 0
  return {
    service: isEmby ? 'emby' : 'jellyfin', status: 'ok',
    stats: [
      { label: 'Active Streams', value: active, color: active > 0 ? 'green' : 'default' },
      { label: 'Movies', value: counts.MovieCount ?? 0 },
      { label: 'Series', value: counts.SeriesCount ?? 0 },
      { label: 'Music Albums', value: counts.MusicAlbumCount ?? 0 },
    ],
  }
}

// ---- Portainer ----
async function fetchPortainer(base: string, apiKey: string): Promise<IntegrationData> {
  const res = await fetch(`${base}/api/endpoints`, {
    headers: { 'X-API-Key': apiKey },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const eps = await res.json()
  const running = eps.reduce((a: number, ep: Record<string, unknown>) => {
    const snap = (ep.Snapshots as Array<Record<string, unknown>>)?.[0]
    return a + (Number(snap?.RunningContainerCount) || 0)
  }, 0)
  const stopped = eps.reduce((a: number, ep: Record<string, unknown>) => {
    const snap = (ep.Snapshots as Array<Record<string, unknown>>)?.[0]
    return a + (Number(snap?.StoppedContainerCount) || 0)
  }, 0)
  return {
    service: 'portainer', status: 'ok',
    stats: [
      { label: 'Endpoints', value: Array.isArray(eps) ? eps.length : 0 },
      { label: '▶ Running', value: running, color: 'green' },
      { label: '■ Stopped', value: stopped, color: stopped > 0 ? 'red' : 'default' },
      { label: 'Total', value: running + stopped },
    ],
  }
}

// ---- Nextcloud ----
async function fetchNextcloud(base: string, user: string, pass: string): Promise<IntegrationData> {
  const auth = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
  const res = await fetch(`${base}/ocs/v2.php/apps/serverinfo/api/v1/info?format=json`, {
    headers: { Authorization: auth, 'OCS-APIRequest': 'true' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const storage = data.ocs?.data?.nextcloud?.storage ?? {}
  const active = data.ocs?.data?.activeUsers ?? {}
  return {
    service: 'nextcloud', status: 'ok',
    stats: [
      { label: 'Active Users (24h)', value: active.last24hours ?? 0, color: 'green' },
      { label: 'Total Users', value: storage.num_users ?? 0 },
      { label: 'Files', value: fmt(Number(storage.num_files ?? 0)) },
      { label: 'Storage', value: fmtBytes(Number(storage.num_storages ?? 0)) },
    ],
  }
}

// ---- Gitea ----
async function fetchGitea(base: string, apiKey: string): Promise<IntegrationData> {
  const h = { Authorization: `token ${apiKey}` }
  const [uRes, rRes] = await Promise.all([
    fetch(`${base}/api/v1/user`, { headers: h, signal: AbortSignal.timeout(8000) }),
    fetch(`${base}/api/v1/repos/search?limit=1`, { headers: h, signal: AbortSignal.timeout(8000) }),
  ])
  if (!uRes.ok) throw new Error(`HTTP ${uRes.status}`)
  const user = await uRes.json()
  const repos = rRes.ok ? await rRes.json() : { metadata: { total: 0 } }
  return {
    service: 'gitea', status: 'ok',
    stats: [
      { label: 'Username', value: user.login ?? '' },
      { label: 'Repos', value: repos.metadata?.total ?? 0 },
      { label: 'Following', value: user.following ?? 0 },
      { label: 'Stars', value: user.starred_repos_count ?? 0 },
    ],
  }
}

// ---- Home Assistant ----
async function fetchHomeAssistant(base: string, apiKey: string): Promise<IntegrationData> {
  const h = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  const [cfgRes, statesRes] = await Promise.all([
    fetch(`${base}/api/config`, { headers: h, signal: AbortSignal.timeout(10000) }),
    fetch(`${base}/api/states`, { headers: h, signal: AbortSignal.timeout(10000) }),
  ])
  if (!cfgRes.ok) throw new Error(`HTTP ${cfgRes.status}`)
  const cfg = await cfgRes.json()
  const states: Array<{ entity_id: string; state: string }> = statesRes.ok ? await statesRes.json() : []

  const lights      = states.filter(e => e.entity_id.startsWith('light.'))
  const switches    = states.filter(e => e.entity_id.startsWith('switch.'))
  const automations = states.filter(e => e.entity_id.startsWith('automation.'))
  const persons     = states.filter(e => e.entity_id.startsWith('person.'))

  const lightsOn   = lights.filter(e => e.state === 'on').length
  const switchesOn = switches.filter(e => e.state === 'on').length
  const personsHome = persons.filter(e => e.state === 'home').length

  return {
    service: 'home_assistant', status: 'ok',
    stats: [
      { label: 'Version',     value: cfg.version ?? 'Unknown' },
      { label: 'Location',    value: cfg.location_name ?? 'Home' },
      { label: 'Entities',    value: states.length },
      { label: 'Lights On',   value: `${lightsOn} / ${lights.length}`, color: lightsOn > 0 ? 'yellow' : 'default' },
      { label: 'Switches On', value: `${switchesOn} / ${switches.length}`, color: switchesOn > 0 ? 'blue' : 'default' },
      { label: 'Automations', value: automations.length },
      ...(persons.length > 0
        ? [{ label: 'Home', value: `${personsHome} / ${persons.length} people`, color: personsHome > 0 ? 'green' as const : 'default' as const }]
        : []),
    ],
  }
}

// ---- Proxmox ----
async function fetchProxmox(base: string, apiKey: string): Promise<IntegrationData> {
  const res = await fetch(`${base}/api2/json/nodes`, {
    headers: { Authorization: `PVEAPIToken=${apiKey}` },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const nodes: Array<Record<string, unknown>> = data.data ?? []
  const avgCpu = nodes.reduce((a, n) => a + Number(n.cpu ?? 0), 0) / Math.max(nodes.length, 1)
  const totalMem = nodes.reduce((a, n) => a + Number(n.mem ?? 0), 0)
  const totalMax = nodes.reduce((a, n) => a + Number(n.maxmem ?? 0), 0)
  return {
    service: 'proxmox', status: 'ok',
    stats: [
      { label: 'Nodes', value: nodes.length },
      { label: 'CPU (avg)', value: `${(avgCpu * 100).toFixed(1)}%`, color: avgCpu > 0.8 ? 'red' : avgCpu > 0.5 ? 'yellow' : 'green' },
      { label: 'Memory', value: fmtBytes(totalMem) },
      { label: 'Mem Total', value: fmtBytes(totalMax) },
    ],
  }
}

// ---- Uptime Kuma (public status page) ----
async function fetchUptimeKuma(base: string, slug: string): Promise<IntegrationData> {
  const res = await fetch(`${base}/api/status-page/${slug || 'default'}`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const monitors: Array<Record<string, unknown>> = data.publicGroupList?.flatMap(
    (g: Record<string, unknown>) => (g.monitorList as Array<unknown>) ?? []
  ) ?? []
  const up = monitors.filter((m) => m.currentStatus === 1).length
  const down = monitors.filter((m) => m.currentStatus !== 1).length
  return {
    service: 'uptime_kuma', status: 'ok',
    stats: [
      { label: 'Monitors', value: monitors.length },
      { label: '✓ Up', value: up, color: 'green' },
      { label: '✗ Down', value: down, color: down > 0 ? 'red' : 'default' },
      { label: 'Uptime', value: monitors.length > 0 ? `${((up / monitors.length) * 100).toFixed(1)}%` : '—' },
    ],
  }
}

// ---- NZBGet ----
async function fetchNzbget(base: string, user: string, pass: string): Promise<IntegrationData> {
  const auth = Buffer.from(`${user}:${pass}`).toString('base64')
  const res = await fetch(`${base}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ method: 'status', params: [], id: 1 }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const s = data.result ?? {}
  return {
    service: 'nzbget', status: 'ok',
    stats: [
      { label: 'Status', value: s.ServerStandBy ? 'Idle' : 'Downloading', color: s.ServerStandBy ? 'default' : 'green' },
      { label: 'Speed', value: fmtSpeed((s.DownloadRate ?? 0)) },
      { label: 'Queue', value: fmtBytes(s.RemainingSizeMB ? s.RemainingSizeMB * 1024 * 1024 : 0) },
      { label: 'Downloaded', value: fmtBytes((s.DownloadedSizeMB ?? 0) * 1024 * 1024) },
    ],
  }
}

// ---- Flood ----
async function fetchFlood(base: string, user: string, pass: string): Promise<IntegrationData> {
  // Login first
  const loginRes = await fetch(`${base}/api/auth/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
    signal: AbortSignal.timeout(8000),
  })
  const loginCookie = loginRes.headers.get('set-cookie') ?? ''
  const sessionCookie = loginCookie.match(/jwt=([^;]+)/)?.[1] ?? ''
  const cookieHdr: Record<string, string> = sessionCookie ? { Cookie: `jwt=${sessionCookie}` } : {}

  const torRes = await fetch(`${base}/api/torrents`, { headers: cookieHdr, signal: AbortSignal.timeout(8000) })
  if (!torRes.ok) throw new Error(`HTTP ${torRes.status}`)
  const torData = await torRes.json()
  const torrents: Array<Record<string, unknown>> = Object.values(torData.torrents ?? {})
  const downloading = torrents.filter((t) => t.status === 'downloading').length
  const dlSpeed = torrents.reduce((a, t) => a + Number(t.downRate ?? 0), 0)
  const ulSpeed = torrents.reduce((a, t) => a + Number(t.upRate ?? 0), 0)
  return {
    service: 'flood', status: 'ok',
    stats: [
      { label: '↓ Download', value: fmtSpeed(dlSpeed), color: 'green' },
      { label: '↑ Upload', value: fmtSpeed(ulSpeed), color: 'blue' },
      { label: 'Downloading', value: downloading },
      { label: 'Total', value: torrents.length },
    ],
  }
}

// ---- POST: service actions (e.g. Pi-hole blocking toggle) ----
export async function POST(request: Request) {
  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { service, url: rawUrl, apiKey = '', action } = body
  if (!service || !rawUrl || !action) {
    return NextResponse.json({ error: 'service, url and action required' }, { status: 400 })
  }
  const base = validateUrl(rawUrl)
  if (!base) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    if (service === 'pihole') {
      if (action !== 'enable' && action !== 'disable') {
        return NextResponse.json({ error: 'action must be enable or disable' }, { status: 400 })
      }
      await togglePiholeBlocking(base, apiKey, action === 'enable')
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: `No actions available for service: ${service}` }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed' },
      { status: 502 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const service = searchParams.get('service')
  const rawUrl = searchParams.get('url')
  const apiKey = searchParams.get('apiKey') ?? ''
  const username = searchParams.get('username') ?? ''
  const password = searchParams.get('password') ?? ''
  const slug = searchParams.get('slug') ?? 'default'

  if (!service || !rawUrl) {
    return NextResponse.json({ error: 'service and url required' }, { status: 400 })
  }
  const base = validateUrl(rawUrl)
  if (!base) {
    return NextResponse.json({ error: 'Invalid URL — must be http or https' }, { status: 400 })
  }

  try {
    let data: IntegrationData
    switch (service) {
      case 'pihole':       data = await fetchPihole(base, apiKey); break
      case 'adguard':      data = await fetchAdguard(base, username, password); break
      case 'sonarr':
      case 'radarr':
      case 'lidarr':
      case 'readarr':
      case 'prowlarr':     data = await fetchArr(service, base, apiKey); break
      case 'qbittorrent':  data = await fetchQbittorrent(base, username, password); break
      case 'transmission': data = await fetchTransmission(base, username, password); break
      case 'sabnzbd':      data = await fetchSabnzbd(base, apiKey); break
      case 'nzbget':       data = await fetchNzbget(base, username, password); break
      case 'flood':        data = await fetchFlood(base, username, password); break
      case 'jellyfin':     data = await fetchJellyfin(base, apiKey, false); break
      case 'emby':         data = await fetchJellyfin(base, apiKey, true); break
      case 'portainer':    data = await fetchPortainer(base, apiKey); break
      case 'nextcloud':    data = await fetchNextcloud(base, username, password); break
      case 'gitea':        data = await fetchGitea(base, apiKey); break
      case 'proxmox':      data = await fetchProxmox(base, apiKey); break
      case 'uptime_kuma':      data = await fetchUptimeKuma(base, slug); break
      case 'home_assistant': data = await fetchHomeAssistant(base, apiKey); break
      default:
        return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 400 })
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({
      service,
      status: 'error',
      error: err instanceof Error ? err.message : 'Failed to connect',
      stats: [],
    } as IntegrationData)
  }
}
