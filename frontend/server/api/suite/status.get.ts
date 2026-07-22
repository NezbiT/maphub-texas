/**
 * Control-plane status — same idea as gateway /v1/suite/status but inside MapHub.
 */
import { getSources, joinUrl, safeFetch } from '../../utils/sources'
import { suiteMeta } from '../../utils/suite'

type Probe = { id: string; ok: boolean; latencyMs: number; url: string; error?: string }

async function ping(id: string, url: string): Promise<Probe> {
  const t0 = Date.now()
  const res = await safeFetch<any>(url, { timeoutMs: 3500 })
  return {
    id,
    ok: res.ok,
    latencyMs: Date.now() - t0,
    url,
    error: res.ok ? undefined : res.error,
  }
}

export default defineEventHandler(async (event) => {
  const s = getSources()
  const targets: Array<[string, string]> = [
    ['flood', joinUrl(s.floodApi, '/api/health')],
    ['power', joinUrl(s.powerApi, '/api/health')],
    ['radar', joinUrl(s.radarApi, '/api/health')],
    ['channel', joinUrl(s.channelApi, '/api/health')],
    ['sentinel', joinUrl(s.sentinelApi, '/health')],
    ['finder', joinUrl(s.finderApi, '/health')],
  ]

  const probes = await Promise.all(targets.map(([id, url]) => ping(id, url)))
  const up = probes.filter((p) => p.ok).length

  setResponseHeader(event, 'Cache-Control', 'public, max-age=10, stale-while-revalidate=30')

  return {
    ...suiteMeta({ role: 'command-center' }),
    asOf: new Date().toISOString(),
    summary: { up, total: probes.length, healthy: up === probes.length },
    probes,
    deepLinks: {
      flood: s.floodApp,
      power: s.powerApp,
      radar: s.radarApp,
      channel: s.channelApp,
      sentinel: s.sentinelApp,
      finder: s.finderApp,
    },
  }
})
