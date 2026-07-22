/**
 * Upstream product bases — single place for MapHub wiring.
 * Ports match WEB/txbizfinder-suite/suite.config.json
 */
import { joinUrl, safeFetch, stripSlash } from './http'

export type SourceConfig = {
  finderApi: string
  finderApp: string
  finderApiKey: string
  radarApi: string
  radarApp: string
  channelApi: string
  channelApp: string
  sentinelApi: string
  sentinelApp: string
  floodApi: string
  floodApp: string
  powerApi: string
  powerApp: string
}

export function getSources(): SourceConfig {
  const cfg = useRuntimeConfig()
  const s = (cfg as any).sources || {}
  const pub = (cfg.public as any)?.suite || {}

  return {
    finderApi: String(s.finderApi || process.env.MAPHUB_FINDER_API || 'http://127.0.0.1:8000'),
    finderApp: String(pub.finder || process.env.NUXT_PUBLIC_FINDER_URL || 'http://127.0.0.1:5173/app'),
    finderApiKey: String(s.finderApiKey || process.env.MAPHUB_FINDER_API_KEY || 'admin-dev-key-change-me'),
    radarApi: String(s.radarApi || process.env.MAPHUB_RADAR_API || 'http://127.0.0.1:3010'),
    radarApp: String(pub.radar || process.env.NUXT_PUBLIC_RADAR_URL || 'http://127.0.0.1:3010'),
    channelApi: String(s.channelApi || process.env.MAPHUB_CHANNEL_API || 'http://127.0.0.1:3011'),
    channelApp: String(pub.channel || process.env.NUXT_PUBLIC_CHANNEL_URL || 'http://127.0.0.1:3011'),
    sentinelApi: String(s.sentinelApi || process.env.MAPHUB_SENTINEL_API || 'http://127.0.0.1:8001'),
    sentinelApp: String(pub.sentinel || process.env.NUXT_PUBLIC_SENTINEL_URL || 'http://127.0.0.1:3012'),
    floodApi: String(s.floodApi || process.env.MAPHUB_FLOOD_API || 'http://127.0.0.1:3013'),
    floodApp: String(pub.flood || process.env.NUXT_PUBLIC_FLOOD_URL || 'http://127.0.0.1:3013'),
    powerApi: String(s.powerApi || process.env.MAPHUB_POWER_API || 'http://127.0.0.1:3014'),
    powerApp: String(pub.power || process.env.NUXT_PUBLIC_POWER_URL || 'http://127.0.0.1:3014'),
  }
}

export { joinUrl, safeFetch, stripSlash }
