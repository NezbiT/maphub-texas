import { DEMO_POINTS } from './demo'
import { getSources, joinUrl, safeFetch, stripSlash } from './sources'
import type { LayerFetchResult, LayerId, LayerPoint } from './types'

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

function parseCoords(coords: unknown): { lat: number; lon: number } | null {
  if (Array.isArray(coords) && coords.length >= 2) {
    const lon = num(coords[0])
    const lat = num(coords[1])
    if (lat != null && lon != null) return { lat, lon }
  }
  // Some serializers return "lng lat" strings
  if (typeof coords === 'string') {
    const parts = coords.trim().split(/[\s,]+/).map(Number)
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      // Prefer GeoJSON order lon,lat when first abs > 30 (Texas lon ~ -100)
      if (Math.abs(parts[0]) > 30) return { lon: parts[0], lat: parts[1] }
      return { lat: parts[0], lon: parts[1] }
    }
  }
  return null
}

function demoFor(layer: LayerId, appBase: string): LayerPoint[] {
  return DEMO_POINTS.filter((p) => p.layer === layer).map((p) => ({
    ...p,
    appUrl: p.appUrl || stripSlash(appBase),
    source: 'demo' as const,
  }))
}

/** FINDER — TxBizFinder FastAPI /api/leads (same store as full app). */
async function fetchFinder(): Promise<LayerFetchResult> {
  const s = getSources()
  // Cap for hub map speed (full app still has full search)
  const url = joinUrl(s.finderApi, '/api/leads?limit=80&offset=0&qualified_only=true&small_business_only=false')
  const res = await safeFetch<{ items?: any[] }>(url, {
    headers: { 'X-API-Key': s.finderApiKey },
  })
  if (!res.ok) {
    return {
      layer: 'finder',
      source: 'error',
      count: 0,
      points: demoFor('finder', s.finderApp),
      error: res.error,
    }
  }
  const items = res.data.items || []
  const points: LayerPoint[] = []
  for (const lead of items) {
    const lat = num(lead.latitude)
    const lon = num(lead.longitude)
    if (lat == null || lon == null) continue
    const id = String(lead.id)
    const q = lead.name ? encodeURIComponent(String(lead.name).slice(0, 80)) : ''
    const zip = lead.zip_code ? String(lead.zip_code) : ''
    points.push({
      id: `finder-${id}`,
      layer: 'finder',
      name: lead.name || `Lead #${id}`,
      lat,
      lon,
      summary: [lead.city, lead.zip_code, lead.industry, lead.is_qualified ? 'qualified' : null]
        .filter(Boolean)
        .join(' · '),
      score: lead.qualification_score != null ? Math.round(Number(lead.qualification_score)) : undefined,
      appUrl: `${stripSlash(s.finderApp)}${q ? `?q=${q}` : ''}${zip && !q ? `?zip=${zip}` : ''}`,
      source: 'live',
      meta: {
        city: lead.city,
        zip: lead.zip_code,
        score: lead.qualification_score,
      },
    })
  }
  // If nothing geocoded, still fall back so map isn't empty
  if (!points.length) {
    return {
      layer: 'finder',
      source: 'demo',
      count: 0,
      points: demoFor('finder', s.finderApp),
      error: 'No geocoded leads from full app; showing demo pins',
    }
  }
  return { layer: 'finder', source: 'live', count: points.length, points }
}

/** RADAR — PermitRadar /api/permits GeoJSON (same map source as full app). */
async function fetchRadar(): Promise<LayerFetchResult> {
  const s = getSources()
  // Keep radar light for Map Hub (DOM/GL perf). Full app map uses higher limits.
  const url = joinUrl(s.radarApi, '/api/permits?limit=250')
  const res = await safeFetch<{
    features?: Array<{ geometry?: { coordinates?: unknown }; properties?: any }>
    meta?: { total?: number }
  }>(url)
  if (!res.ok) {
    return {
      layer: 'radar',
      source: 'error',
      count: 0,
      points: demoFor('radar', s.radarApp),
      error: res.error,
    }
  }
  const points: LayerPoint[] = []
  for (const f of res.data.features || []) {
    const c = parseCoords(f.geometry?.coordinates)
    if (!c) continue
    const props = f.properties || {}
    const id = String(props.id ?? `${c.lat},${c.lon}`)
    const type = props.t || props.permit_type || 'Permit'
    const zip = props.z || props.zip || ''
    const date = props.d || props.permit_date || ''
    points.push({
      id: `radar-${id}`,
      layer: 'radar',
      name: `${type}${zip ? ` · ${zip}` : ''}`,
      lat: c.lat,
      lon: c.lon,
      summary: [type, zip && `ZIP ${zip}`, date].filter(Boolean).join(' · '),
      score: type,
      appUrl: `${stripSlash(s.radarApp)}/permit/${id}`,
      source: 'live',
      meta: { permitId: id, zip, date, type },
    })
  }
  return {
    layer: 'radar',
    source: 'live',
    count: points.length,
    points,
  }
}

/** CHANNEL — monitors + emission events (same APIs as ChannelWatch). */
async function fetchChannel(): Promise<LayerFetchResult> {
  const s = getSources()
  const [mon, ev] = await Promise.all([
    safeFetch<any[]>(joinUrl(s.channelApi, '/api/monitors')),
    safeFetch<{ events?: any[] }>(joinUrl(s.channelApi, '/api/events?limit=100')),
  ])

  if (!mon.ok && !ev.ok) {
    return {
      layer: 'channel',
      source: 'error',
      count: 0,
      points: demoFor('channel', s.channelApp),
      error: mon.error || ev.error,
    }
  }

  const points: LayerPoint[] = []
  if (mon.ok) {
    for (const m of mon.data || []) {
      const lat = num(m.lat)
      const lon = num(m.lon)
      if (lat == null || lon == null) continue
      const latest = Array.isArray(m.latest) ? m.latest : []
      const pm = latest.find((x: any) => /pm/i.test(String(x.parameter || '')))
      const tip = pm
        ? `${pm.parameter} ${pm.value}${pm.unit ? ' ' + pm.unit : ''}`
        : latest[0]
          ? `${latest[0].parameter} ${latest[0].value}`
          : 'Air monitor'
      points.push({
        id: `channel-m-${m.id}`,
        layer: 'channel',
        name: m.short_name || m.name || `Monitor ${m.id}`,
        lat,
        lon,
        summary: [m.operator, m.community, tip].filter(Boolean).join(' · '),
        score: tip,
        appUrl: stripSlash(s.channelApp),
        source: 'live',
        meta: { kind: 'monitor', cams: m.cams_id },
      })
    }
  }
  if (ev.ok) {
    for (const e of ev.data.events || []) {
      const lat = num(e.lat)
      const lon = num(e.lon)
      if (lat == null || lon == null) continue
      points.push({
        id: `channel-e-${e.event_id || e.id}`,
        layer: 'channel',
        name: e.facility_name || 'Emission event',
        lat,
        lon,
        summary: [e.city, e.county, e.status, e.contaminants].filter(Boolean).join(' · '),
        score: e.status || 'event',
        appUrl: stripSlash(s.channelApp) + '/events',
        source: 'live',
        meta: { kind: 'event', eventId: e.event_id },
      })
    }
  }

  if (!points.length) {
    return {
      layer: 'channel',
      source: 'demo',
      count: 0,
      points: demoFor('channel', s.channelApp),
      error: 'No channel geo points; demo fallback',
    }
  }
  return { layer: 'channel', source: 'live', count: points.length, points }
}

/** SENTINEL — /v1/facilities (+ monitors with lat). */
async function fetchSentinel(): Promise<LayerFetchResult> {
  const s = getSources()
  const fac = await safeFetch<any[]>(joinUrl(s.sentinelApi, '/v1/facilities'))
  if (!fac.ok) {
    return {
      layer: 'sentinel',
      source: 'error',
      count: 0,
      points: demoFor('sentinel', s.sentinelApp),
      error: fac.error,
    }
  }
  const points: LayerPoint[] = []
  for (const f of fac.data || []) {
    const lat = num(f.lat)
    const lon = num(f.lon)
    if (lat == null || lon == null) continue
    const id = String(f.facility_id || f.id)
    points.push({
      id: `sentinel-${id}`,
      layer: 'sentinel',
      name: f.name || id,
      lat,
      lon,
      summary: [f.sector, f.fuel_primary, f.county].filter(Boolean).join(' · '),
      score: f.sector || 'facility',
      appUrl: `${stripSlash(s.sentinelApp)}/facilities/${encodeURIComponent(id)}`,
      source: 'live',
      meta: { facilityId: id, county: f.county, sector: f.sector },
    })
  }
  return { layer: 'sentinel', source: 'live', count: points.length, points }
}

/** FLOOD — same /api/risk/zones as FloodGuard. */
async function fetchFlood(): Promise<LayerFetchResult> {
  const s = getSources()
  const res = await safeFetch<{ zones?: any[]; source?: string }>(joinUrl(s.floodApi, '/api/risk/zones'))
  if (!res.ok) {
    return {
      layer: 'flood',
      source: 'error',
      count: 0,
      points: demoFor('flood', s.floodApp),
      error: res.error,
    }
  }
  const points: LayerPoint[] = (res.data.zones || []).map((z) => ({
    id: `flood-${z.id}`,
    layer: 'flood' as const,
    name: z.name || `ZIP ${z.zip}`,
    lat: Number(z.lat),
    lon: Number(z.lon),
    summary: `Flood risk ${z.level} · score ${z.score}${z.zip ? ` · ZIP ${z.zip}` : ''}`,
    score: z.score,
    appUrl: `${stripSlash(s.floodApp)}?zip=${encodeURIComponent(String(z.zip || ''))}`,
    source: 'live' as const,
    meta: { zip: z.zip, level: z.level, score: z.score },
  })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))

  return { layer: 'flood', source: 'live', count: points.length, points }
}

/** POWER — same /api/grid/regions as PowerPulse. */
async function fetchPower(): Promise<LayerFetchResult> {
  const s = getSources()
  const res = await safeFetch<{ regions?: any[] }>(joinUrl(s.powerApi, '/api/grid/regions'))
  if (!res.ok) {
    return {
      layer: 'power',
      source: 'error',
      count: 0,
      points: demoFor('power', s.powerApp),
      error: res.error,
    }
  }
  const points: LayerPoint[] = (res.data.regions || []).map((r) => {
    const util =
      r.capacityMw > 0 ? Math.round((Number(r.loadMw) / Number(r.capacityMw)) * 100) : null
    return {
      id: `power-${r.id}`,
      layer: 'power' as const,
      name: r.name || r.id,
      lat: Number(r.lat),
      lon: Number(r.lon),
      summary: [
        `stress ${r.stress}`,
        r.loadMw != null && r.capacityMw != null
          ? `${Number(r.loadMw).toLocaleString()} / ${Number(r.capacityMw).toLocaleString()} MW`
          : null,
        util != null ? `${util}%` : null,
        r.note,
      ]
        .filter(Boolean)
        .join(' · '),
      score: r.stress,
      appUrl: `${stripSlash(s.powerApp)}?region=${encodeURIComponent(String(r.id))}`,
      source: 'live' as const,
      meta: {
        region: r.id,
        stress: r.stress,
        loadMw: r.loadMw,
        capacityMw: r.capacityMw,
      },
    }
  }).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))

  return { layer: 'power', source: 'live', count: points.length, points }
}

const FETCHERS: Record<LayerId, () => Promise<LayerFetchResult>> = {
  finder: fetchFinder,
  radar: fetchRadar,
  channel: fetchChannel,
  sentinel: fetchSentinel,
  flood: fetchFlood,
  power: fetchPower,
}

export async function fetchLayers(layers: LayerId[] | null): Promise<{
  points: LayerPoint[]
  layers: LayerFetchResult[]
  byLayer: Record<string, number>
  sources: Record<string, string>
}> {
  const wanted = layers?.length
    ? layers
    : (Object.keys(FETCHERS) as LayerId[])

  const results = await Promise.all(wanted.map((id) => FETCHERS[id]()))
  const points = results.flatMap((r) => r.points)
  const byLayer: Record<string, number> = {}
  const sources: Record<string, string> = {}
  for (const r of results) {
    byLayer[r.layer] = r.points.length
    sources[r.layer] = r.error ? `${r.source}:${r.error}` : r.source
  }
  return { points, layers: results, byLayer, sources }
}
