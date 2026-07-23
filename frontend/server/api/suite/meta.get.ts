import { suiteMeta } from '../../utils/suite'
import { getSources } from '../../utils/sources'

/** MapHub proxies suite APIs — does not invent data (roadmap §6). */
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
    dataSources: [
      {
        id: 'proxy-suite',
        name: 'Suite product APIs',
        url: null,
        auth: 'upstream',
        use: 'Compose layers from Flood/Power/Radar/Channel/Sentinel/Finder',
        status: 'live',
        validation: 'inherits_upstream',
        confidence: 'agency_open_data',
        cadence: 'on_request',
        demo: false,
        notes: 'MapHub never invents business records; offline upstream → labeled demo pins',
      },
      {
        id: 'openfreemap',
        name: 'OpenFreeMap tiles',
        url: 'https://openfreemap.org/',
        auth: 'free',
        use: 'Map basemap style',
        status: 'live',
        validation: 'medium',
        confidence: 'agency_open_data',
        cadence: 'static_tiles',
        demo: false,
      },
      {
        id: 'zip-geocode',
        name: 'Zippopotam / Census',
        url: 'https://api.zippopotam.us/',
        auth: 'free',
        use: 'ZIP geocode focus',
        status: 'live',
        validation: 'medium',
        confidence: 'agency_open_data',
        cadence: 'on_request',
        demo: false,
      },
    ],
    productSourceMap: [
      { product: 'FloodGuard', api: 'FEMA NFHL + NWS + USGS + OpenFEMA', scrape: 'Only missing local layer' },
      { product: 'PowerPulse', api: 'EIA + ERCOT public (ToS) + NOAA heat', scrape: 'ERCOT HTML fallback' },
      { product: 'ChannelWatch', api: 'Open-Meteo + NOAA + AirNow + TCEQ GIS', scrape: 'CAMS/EER HTML' },
      { product: 'Emissions Sentinel', api: 'EIA + CAMPD + OpenAQ + GHGRP/eGRID bulk', scrape: 'Avoid ad-hoc' },
      { product: 'PermitRadar', api: 'SODA/CKAN multi-city + Houston xlsx', scrape: 'Houston xlsx' },
      { product: 'TxBizFinder', api: 'data.texas.gov + TABC Socrata', scrape: 'DDG/Playwright research' },
      { product: 'MapHub', api: 'Proxy suite APIs', scrape: 'N/A' },
    ],
    scrapingPolicy: {
      justified: [],
      possible: [],
      forbidden: ['Inventing layer data without upstream'],
    },
  })
})
