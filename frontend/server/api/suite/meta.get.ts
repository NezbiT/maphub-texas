import { suiteMeta } from '../../utils/suite'
import { getSources } from '../../utils/sources'

export default defineEventHandler(() => {
  const s = getSources()
  return suiteMeta({
    mapHubLayer: 'all',
    defaultPort: 3015,
    upstreams: {
      finder: s.finderApi,
      radar: s.radarApi,
      channel: s.channelApi,
      sentinel: s.sentinelApi,
      flood: s.floodApi,
      power: s.powerApi,
    },
    layers: ['finder', 'radar', 'channel', 'sentinel', 'flood', 'power'],
  })
})
