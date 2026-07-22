import { fetchLayers } from '../../utils/fetchLayers'
import type { LayerId } from '../../utils/types'

const VALID: LayerId[] = ['finder', 'radar', 'channel', 'sentinel', 'flood', 'power']

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const raw = typeof q.layers === 'string' ? q.layers : ''
  const wanted = raw
    ? (raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is LayerId => VALID.includes(s as LayerId)) as LayerId[])
    : null

  const result = await fetchLayers(wanted?.length ? wanted : null)

  // Short CDN cache; live apps change more often than weekly ingest
  setResponseHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=60')

  const timeRange = typeof q.timeRange === 'string' ? q.timeRange : '7d'

  return {
    source: 'suite-live',
    timeRange,
    count: result.points.length,
    byLayer: result.byLayer,
    sources: result.sources,
    layers: result.layers.map((l) => ({
      layer: l.layer,
      source: l.source,
      count: l.count,
      error: l.error || null,
    })),
    points: result.points,
    meta: {
      suite: 'txbizfinder-intelligence',
      product: 'maphub-texas',
      asOf: new Date().toISOString(),
      timeRange,
    },
  }
})
