import type { LayerPoint } from './types'

/**
 * Last-resort pins if an upstream full-app is offline.
 * Prefer live fetches from fetchLayers.ts.
 */
export const DEMO_POINTS: LayerPoint[] = [
  {
    id: 'f-1',
    layer: 'finder',
    name: 'Rio Grande Cantina',
    lat: 29.424,
    lon: -98.494,
    summary: 'Demo fallback · San Antonio',
    score: 'A',
    appUrl: 'http://127.0.0.1:5173/app',
    source: 'demo',
  },
  {
    id: 'r-1',
    layer: 'radar',
    name: 'Commercial remodel · 77002',
    lat: 29.758,
    lon: -95.365,
    summary: 'Demo fallback · Houston permit',
    score: 'permit',
    appUrl: 'http://127.0.0.1:3010',
    source: 'demo',
  },
  {
    id: 'c-1',
    layer: 'channel',
    name: 'Houston Ship Channel monitor',
    lat: 29.72,
    lon: -95.25,
    summary: 'Demo fallback · air',
    score: 'AQI 62',
    appUrl: 'http://127.0.0.1:3011',
    source: 'demo',
  },
  {
    id: 's-1',
    layer: 'sentinel',
    name: 'Gulf Coast facility',
    lat: 29.55,
    lon: -95.05,
    summary: 'Demo fallback · emissions',
    score: 'facility',
    appUrl: 'http://127.0.0.1:3012/facilities',
    source: 'demo',
  },
  {
    id: 'fl-1',
    layer: 'flood',
    name: 'Downtown Houston',
    lat: 29.7604,
    lon: -95.3698,
    summary: 'Demo fallback · high risk',
    score: 78,
    appUrl: 'http://127.0.0.1:3013?zip=77002',
    source: 'demo',
  },
  {
    id: 'p-1',
    layer: 'power',
    name: 'Houston / Coast',
    lat: 29.76,
    lon: -95.37,
    summary: 'Demo fallback · elevated',
    score: 'elevated',
    appUrl: 'http://127.0.0.1:3014?region=houston',
    source: 'demo',
  },
]
