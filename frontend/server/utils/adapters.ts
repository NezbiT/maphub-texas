/**
 * Layer adapters — one function per product.
 * Pattern: try live API → map to LayerPoint[] → demo fallback on failure.
 */
import { DEMO_POINTS } from './demo'
import { getSources } from './sources'
import { joinUrl, num, parseCoords, safeFetch, stripSlash } from './http'
import type { LayerFetchResult, LayerId, LayerPoint } from './types'

function demoFor(layer: LayerId, appBase: string): LayerPoint[] {
  return DEMO_POINTS.filter((p) => p.layer === layer).map((p) => ({
    ...p,
    appUrl: p.appUrl || stripSlash(appBase),
    source: 'demo' as const,
  }))
}

function fail(layer: LayerId, app: string, error: string, asDemo = true): LayerFetchResult {
  return {
    layer,
    source: asDemo ? 'error' : 'error',
    count: 0,
    points: demoFor(layer, app),
    error,
  }
}

function live(layer: LayerId, points: LayerPoint[], error?: string): LayerFetchResult {
  if (!points.length) {
    return { layer, source: 'demo', count: 0, points: [], error: error || 'empty' }
  }
  return { layer, source: 'live', count: points.length, points }
}

export async function fetchFinder(): Promise<LayerFetchResult> {
  const s = getSources()
  const url = joinUrl(s.finderApi, '/api/leads?limit=80&offset=0&qualified_only=true&small_business_only=false')
  const res = await safeFetch<{ items?: any[] }>(url, { headers: { 'X-API-Key': s.finderApiKey } })
  if (!res.ok) return fail('finder', s.finderApp, res.error)

  const points: LayerPoint[] = []
  for (const lead of res.data.items || []) {
    const lat = num(lead.latitude)
    const lon = num(lead.longitude)
    if (lat == null || lon == null) continue
    const id = String(lead.id)
    const q = lead.name ? encodeURIComponent(String(lead.name).slice(0, 80)) : ''
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
      appUrl: `${stripSlash(s.finderApp)}${q ? `?q=${q}` : ''}`,
      source: 'live',
      meta: { city: lead.city, zip: lead.zip_code, score: lead.qualification_score },
    })
  }
  if (!points.length) {
    return { layer: 'finder', source: 'demo', count: 0, points: demoFor('finder', s.finderApp), error: 'No geocoded leads' }
  }
  return live('finder', points)
}

export async function fetchRadar(): Promise<LayerFetchResult> {
  const s = getSources()
  const res = await safeFetch<{ features?: Array<{ geometry?: { coordinates?: unknown }; properties?: any }> }>(
    joinUrl(s.radarApi, '/api/permits?limit=250'),
  )
  if (!res.ok) return fail('radar', s.radarApp, res.error)

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
  return live('radar', points)
}

export async function fetchChannel(): Promise<LayerFetchResult> {
  const s = getSources()
  const [mon, ev] = await Promise.all([
    safeFetch<any[]>(joinUrl(s.channelApi, '/api/monitors')),
    safeFetch<{ events?: any[] }>(joinUrl(s.channelApi, '/api/events?limit=100')),
  ])
  if (!mon.ok && !ev.ok) return fail('channel', s.channelApp, mon.error || ev.error || 'down')

  const points: LayerPoint[] = []
  if (mon.ok) {
    for (const m of mon.data || []) {
      const lat = num(m.lat)
      const lon = num(m.lon)
      if (lat == null || lon == null) continue
      const latest = Array.isArray(m.latest) ? m.latest : []
      const tip = latest[0] ? `${latest[0].parameter} ${latest[0].value}` : 'Air monitor'
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
        summary: [e.city, e.county, e.status].filter(Boolean).join(' · '),
        score: e.status || 'event',
        appUrl: `${stripSlash(s.channelApp)}/events`,
        source: 'live',
        meta: { kind: 'event', eventId: e.event_id },
      })
    }
  }
  if (!points.length) {
    return { layer: 'channel', source: 'demo', count: 0, points: demoFor('channel', s.channelApp), error: 'No geo points' }
  }
  return live('channel', points)
}

export async function fetchSentinel(): Promise<LayerFetchResult> {
  const s = getSources()
  const fac = await safeFetch<any[]>(joinUrl(s.sentinelApi, '/v1/facilities'))
  if (!fac.ok) return fail('sentinel', s.sentinelApp, fac.error)

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
  return live('sentinel', points)
}

export async function fetchFlood(): Promise<LayerFetchResult> {
  const s = getSources()
  const res = await safeFetch<{ zones?: any[] }>(joinUrl(s.floodApi, '/api/risk/zones'))
  if (!res.ok) return fail('flood', s.floodApp, res.error)

  const points: LayerPoint[] = (res.data.zones || [])
    .map((z) => ({
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
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))

  return live('flood', points)
}

export async function fetchPower(): Promise<LayerFetchResult> {
  const s = getSources()
  const res = await safeFetch<{ regions?: any[] }>(joinUrl(s.powerApi, '/api/grid/regions'))
  if (!res.ok) return fail('power', s.powerApp, res.error)

  const points: LayerPoint[] = (res.data.regions || [])
    .map((r) => {
      const util = r.capacityMw > 0 ? Math.round((Number(r.loadMw) / Number(r.capacityMw)) * 100) : null
      return {
        id: `power-${r.id}`,
        layer: 'power' as const,
        name: r.name || r.id,
        lat: Number(r.lat),
        lon: Number(r.lon),
        summary: [
          `stress ${r.stress}`,
          r.loadMw != null ? `${Number(r.loadMw).toLocaleString()} MW` : null,
          util != null ? `${util}%` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        score: r.stress,
        appUrl: `${stripSlash(s.powerApp)}?region=${encodeURIComponent(String(r.id))}`,
        source: 'live' as const,
        meta: { region: r.id, stress: r.stress, loadMw: r.loadMw, capacityMw: r.capacityMw },
      }
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))

  return live('power', points)
}

export const FETCHERS: Record<LayerId, () => Promise<LayerFetchResult>> = {
  finder: fetchFinder,
  radar: fetchRadar,
  channel: fetchChannel,
  sentinel: fetchSentinel,
  flood: fetchFlood,
  power: fetchPower,
}
