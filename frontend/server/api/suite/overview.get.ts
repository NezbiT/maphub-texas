/**
 * Texas pulse — one number from cross-layer composition.
 * Keeps MapHub as the intelligence surface (WorldMonitor-style, Texas domain).
 */
import { fetchLayers } from '../../utils/fetchLayers'
import { suiteMeta } from '../../utils/suite'
import type { LayerId } from '../../utils/types'

const ALL: LayerId[] = ['finder', 'radar', 'channel', 'sentinel', 'flood', 'power']

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const timeRange = typeof q.timeRange === 'string' ? q.timeRange : '7d'
  const zip = typeof q.zip === 'string' ? q.zip.replace(/\D/g, '').slice(0, 5) : ''
  const t0 = Date.now()

  const layers = await fetchLayers(ALL)
  const probes = layers.layers.map((l) => ({
    id: l.layer,
    ok: l.source !== 'error',
    source: l.source,
    count: l.count,
    error: l.error || null,
  }))

  const live = probes.filter((p) => p.source === 'live').length
  const demo = probes.filter((p) => p.source === 'demo').length
  const err = probes.filter((p) => p.source === 'error').length

  const floodPts = layers.points.filter((p) => p.layer === 'flood')
  const powerPts = layers.points.filter((p) => p.layer === 'power')
  const highFlood = floodPts.filter((p) => {
    const level = String(p.meta?.level || '').toLowerCase()
    return level.includes('high') || level.includes('extreme') || Number(p.meta?.score) >= 65
  }).length
  const stressedGrid = powerPts.filter((p) => {
    const s = String(p.meta?.stress || p.score || '').toLowerCase()
    return s.includes('elevated') || s.includes('critical') || s.includes('watch')
  }).length

  const pulseScore = Math.min(
    100,
    Math.round(
      (highFlood / Math.max(1, floodPts.length)) * 40 +
        (stressedGrid / Math.max(1, powerPts.length)) * 35 +
        (err / ALL.length) * 15 +
        (demo / ALL.length) * 10,
    ),
  )

  let pulse: 'calm' | 'elevated' | 'heightened' | 'critical' = 'calm'
  if (pulseScore >= 70) pulse = 'critical'
  else if (pulseScore >= 45) pulse = 'heightened'
  else if (pulseScore >= 25) pulse = 'elevated'

  setResponseHeader(event, 'Cache-Control', 'public, max-age=20, stale-while-revalidate=40')

  return {
    ...suiteMeta({ timeRange, zip: zip || null, generatedInMs: Date.now() - t0 }),
    pulse: {
      score: pulseScore,
      level: pulse,
      drivers: [
        highFlood ? `${highFlood} elevated flood pins` : null,
        stressedGrid ? `${stressedGrid} grid stress regions` : null,
        err ? `${err} layer(s) offline` : null,
        demo ? `${demo} layer(s) on demo fallback` : null,
      ].filter(Boolean),
    },
    coverage: { live, demo, error: err, totalLayers: ALL.length, totalPoints: layers.points.length },
    probes,
    layers: layers.layers.map((l) => ({
      layer: l.layer,
      source: l.source,
      count: l.count,
      error: l.error || null,
    })),
    deepLink: zip
      ? `?layers=flood,power,radar,channel&zip=${zip}&timeRange=${timeRange}`
      : `?layers=flood,power,radar&timeRange=${timeRange}`,
  }
})
