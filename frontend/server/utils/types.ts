export type LayerId = 'finder' | 'radar' | 'channel' | 'sentinel' | 'flood' | 'power'

export type LayerPoint = {
  id: string
  layer: LayerId
  name: string
  lat: number
  lon: number
  summary: string
  score?: number | string
  /** Deep-link into the full product app (same entity when possible). */
  appUrl: string
  source: 'live' | 'demo' | 'error'
  meta?: Record<string, string | number | boolean | null | undefined>
}

export type LayerFetchResult = {
  layer: LayerId
  source: 'live' | 'demo' | 'error'
  count: number
  points: LayerPoint[]
  error?: string
}
