/**
 * Suite composition root — parallel fetch of product adapters.
 * Domain mapping lives in adapters.ts (one file per concern, thin here).
 */
import { FETCHERS } from './adapters'
import type { LayerFetchResult, LayerId, LayerPoint } from './types'

export async function fetchLayers(layers: LayerId[] | null): Promise<{
  points: LayerPoint[]
  layers: LayerFetchResult[]
  byLayer: Record<string, number>
  sources: Record<string, string>
}> {
  const wanted = layers?.length ? layers : (Object.keys(FETCHERS) as LayerId[])
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
