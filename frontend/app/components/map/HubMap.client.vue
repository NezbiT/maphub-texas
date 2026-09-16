<script setup lang="ts">
/**
 * Fast MapLibre hub map: circle GeoJSON layers (GPU) instead of 100s of DOM markers.
 */
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LAYER_META, type LayerId } from '~/lib/utils'

export type HubPoint = {
  id: string
  layer: LayerId
  name: string
  lat: number
  lon: number
  summary: string
  score?: number | string
  appUrl?: string
  source?: 'live' | 'demo' | 'error'
  meta?: Record<string, string | number | boolean | null | undefined>
}

const props = withDefaults(
  defineProps<{
    points?: HubPoint[]
    activeLayers?: LayerId[]
    selectedId?: string | null
    height?: string
    /** Fly-to target from ZIP search */
    focus?: { lat: number; lon: number; zoom?: number; label?: string } | null
  }>(),
  {
    points: () => [],
    activeLayers: () => [],
    height: 'min(70vh, 640px)',
    focus: null,
  },
)

const emit = defineEmits<{
  select: [point: HubPoint]
}>()

const config = useRuntimeConfig()
const mapEl = ref<HTMLElement | null>(null)
const mapReady = ref(false)
const mapError = ref<string | null>(null)

let map: maplibregl.Map | null = null
let ro: ResizeObserver | null = null
let zipMarker: maplibregl.Marker | null = null
const onViewport = () => map?.resize()
const pointIndex = new Map<string, HubPoint>()

const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

const visiblePoints = computed(() => {
  const active = new Set(props.activeLayers)
  return (props.points || []).filter((p) => active.has(p.layer))
})

/** Normalize score for heatmap weight (0–100). Flood scores, stress, density. */
function heatScore(p: HubPoint): number {
  if (typeof p.score === 'number' && Number.isFinite(p.score)) {
    return Math.max(0, Math.min(100, p.score))
  }
  if (typeof p.score === 'string') {
    const n = Number(p.score)
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, n))
    const s = p.score.toLowerCase()
    if (s.includes('critical') || s.includes('extreme')) return 92
    if (s.includes('elevated') || s.includes('high')) return 75
    if (s.includes('watch') || s.includes('moderate')) return 50
    if (s.includes('normal') || s.includes('low')) return 22
  }
  const stress = String(p.meta?.stress || p.meta?.level || '').toLowerCase()
  if (stress.includes('critical') || stress.includes('extreme')) return 92
  if (stress.includes('elevated') || stress.includes('high')) return 75
  if (stress.includes('watch') || stress.includes('moderate')) return 50
  if (stress.includes('normal') || stress.includes('low')) return 22
  // Layer defaults so every pin contributes heat
  const layerBoost: Record<string, number> = {
    flood: 70,
    power: 55,
    radar: 45,
    channel: 50,
    sentinel: 60,
    finder: 40,
  }
  return layerBoost[p.layer] ?? 45
}

function toGeoJSON(list: HubPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: list
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lon, p.lat] as [number, number],
        },
        properties: {
          id: p.id,
          layer: p.layer,
          name: p.name,
          summary: p.summary,
          color: LAYER_META[p.layer]?.color || '#f97316',
          score: heatScore(p),
          selected: p.id === props.selectedId ? 1 : 0,
        },
      })),
  }
}

function rebuildIndex(list: HubPoint[]) {
  pointIndex.clear()
  for (const p of list) pointIndex.set(p.id, p)
}

function setData() {
  if (!map || !mapReady.value) return
  const list = visiblePoints.value
  rebuildIndex(list)
  const data = toGeoJSON(list) as any
  const src = map.getSource('hub-points') as maplibregl.GeoJSONSource | undefined
  if (src) {
    src.setData(data)
  } else {
    map.addSource('hub-points', { type: 'geojson', data, cluster: false })
  }
  ensureLayers()
}

function ensureLayers() {
  if (!map) return

  // Heatmap under circles — weight by score (flood/stress index)
  if (!map.getLayer('hub-heat')) {
    map.addLayer({
      id: 'hub-heat',
      type: 'heatmap',
      source: 'hub-points',
      maxzoom: 12,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'score'],
          0,
          0.15,
          50,
          0.55,
          100,
          1,
        ],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.65, 8, 1.2],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(22,163,74,0)',
          0.2,
          'rgba(22,163,74,0.35)',
          0.4,
          'rgba(202,138,4,0.55)',
          0.6,
          'rgba(234,88,12,0.7)',
          0.8,
          'rgba(185,28,28,0.85)',
          1,
          'rgba(127,29,29,0.95)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 3, 22, 6, 36, 10, 52],
        'heatmap-opacity': 0.82,
      },
    })
  }

  // Soft glow by score
  if (!map.getLayer('hub-glow')) {
    map.addLayer({
      id: 'hub-glow',
      type: 'circle',
      source: 'hub-points',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0, 12, 100, 28],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'score'],
          0,
          '#16a34a',
          40,
          '#ca8a04',
          65,
          '#ea580c',
          90,
          '#b91c1c',
        ],
        'circle-opacity': 0.22,
        'circle-blur': 0.55,
      },
    })
  }

  if (map.getLayer('hub-circles')) return

  map.addLayer({
    id: 'hub-circles',
    type: 'circle',
    source: 'hub-points',
    paint: {
      'circle-radius': [
        'case',
        ['==', ['get', 'selected'], 1],
        9,
        5.5,
      ],
      // Prefer score heat color; fallback to layer brand color
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'score'],
        0,
        '#16a34a',
        40,
        '#ca8a04',
        65,
        '#ea580c',
        90,
        '#b91c1c',
      ],
      'circle-opacity': 0.92,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffffff',
    },
  })

  map.addLayer({
    id: 'hub-hit',
    type: 'circle',
    source: 'hub-points',
    paint: {
      'circle-radius': 14,
      'circle-opacity': 0,
    },
  })

  map.on('click', 'hub-hit', (e) => {
    const f = e.features?.[0]
    const id = f?.properties?.id as string | undefined
    if (!id) return
    const pt = pointIndex.get(id)
    if (pt) emit('select', pt)
  })

  map.on('mouseenter', 'hub-hit', () => {
    if (map) map.getCanvas().style.cursor = 'pointer'
  })
  map.on('mouseleave', 'hub-hit', () => {
    if (map) map.getCanvas().style.cursor = ''
  })
}

function initMap() {
  if (!import.meta.client || !mapEl.value || map) return
  if (!mapEl.value.clientWidth || !mapEl.value.clientHeight) {
    requestAnimationFrame(initMap)
    return
  }

  const c = config.public.mapCenter as { lat?: number; lon?: number }
  const center: [number, number] = [
    Number.isFinite(Number(c?.lon)) ? Number(c.lon) : -99.5,
    Number.isFinite(Number(c?.lat)) ? Number(c.lat) : 31.0,
  ]

  try {
    map = new maplibregl.Map({
      container: mapEl.value,
      style: (config.public.mapStyleUrl as string) || FALLBACK_STYLE,
      center,
      zoom: Number(config.public.mapZoom) || 5.5,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      fadeDuration: 0,
      maxTileCacheSize: 50,
    })
  } catch (e) {
    mapError.value = e instanceof Error ? e.message : 'Map failed'
    return
  }

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), 'bottom-left')

  map.on('load', () => {
    mapReady.value = true
    map?.resize()
    setData()
  })

  let usedFallback = false
  map.on('error', (ev) => {
    const msg = String((ev as any)?.error?.message || '')
    if (map && msg && !usedFallback) {
      usedFallback = true
      map.once('style.load', () => {
        mapReady.value = true
        map?.resize()
        // re-add after style swap
        setData()
      })
      try {
        map.setStyle(FALLBACK_STYLE)
      } catch {
        mapError.value = 'Map tiles unavailable'
      }
    }
  })

  ro = new ResizeObserver(() => map?.resize())
  ro.observe(mapEl.value)
  window.visualViewport?.addEventListener('resize', onViewport)
  window.addEventListener('orientationchange', onViewport)
  setTimeout(() => map?.resize(), 250)
}

onMounted(() => {
  nextTick(() => requestAnimationFrame(initMap))
})

watch(
  () => [visiblePoints.value, props.selectedId] as const,
  () => {
    if (mapReady.value) setData()
  },
  { deep: true },
)

watch(
  () => props.selectedId,
  (id) => {
    if (!map || !id) return
    const p = pointIndex.get(id) || visiblePoints.value.find((x) => x.id === id)
    if (!p) return
    map.flyTo({
      center: [p.lon, p.lat],
      zoom: Math.max(map.getZoom(), 8),
      essential: true,
      duration: 600,
    })
  },
)

function applyZipFocus() {
  if (!map || !mapReady.value) return
  const f = props.focus
  if (!f || !Number.isFinite(f.lat) || !Number.isFinite(f.lon)) {
    zipMarker?.remove()
    zipMarker = null
    return
  }

  const el = document.createElement('div')
  el.className = 'mh-zip-marker'
  el.style.width = '16px'
  el.style.height = '16px'
  el.style.borderRadius = '9999px'
  el.style.background = '#f97316'
  el.style.border = '3px solid #fff'
  el.style.boxShadow = '0 0 0 2px rgba(249,115,22,0.5), 0 2px 10px rgba(0,0,0,.4)'
  el.title = f.label || 'ZIP'

  zipMarker?.remove()
  zipMarker = new maplibregl.Marker({ element: el })
    .setLngLat([f.lon, f.lat])
    .setPopup(
      new maplibregl.Popup({ offset: 12, closeButton: true }).setText(f.label || 'ZIP location'),
    )
    .addTo(map)

  map.flyTo({
    center: [f.lon, f.lat],
    zoom: f.zoom ?? 11,
    essential: true,
    duration: 900,
  })
}

watch(
  () => [props.focus?.lat, props.focus?.lon, props.focus?.zoom, props.focus?.label] as const,
  () => applyZipFocus(),
)

watch(mapReady, (ready) => {
  if (ready) applyZipFocus()
})

onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener('resize', onViewport)
  window.removeEventListener('orientationchange', onViewport)
  ro?.disconnect()
  zipMarker?.remove()
  zipMarker = null
  map?.remove()
  map = null
})
</script>

<template>
  <div
    class="mh-map-root relative w-full min-h-[280px] touch-none"
    :style="{ height: height, minHeight: height === '100%' ? '280px' : '400px' }"
  >
    <div
      ref="mapEl"
      class="absolute inset-0 h-full w-full touch-none rounded-none border-0 bg-slate-900 sm:rounded-xl sm:border sm:border-border"
    />
    <div
      v-if="mapReady"
      class="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-white/15 bg-slate-950/80 px-2.5 py-2 text-[10px] text-white/90 shadow-lg backdrop-blur"
    >
      <p class="mb-1 font-semibold uppercase tracking-wider text-white/70">Suite heat index</p>
      <div
        class="h-1.5 w-36 rounded-full"
        style="background: linear-gradient(90deg, #16a34a, #ca8a04, #ea580c, #b91c1c)"
      />
      <p class="mt-1 text-white/60">Low → high risk / stress</p>
    </div>
    <div
      v-if="!mapReady && !mapError"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-900/50 text-sm text-white/80"
    >
      Loading map…
    </div>
    <div
      v-if="mapError"
      class="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-950/80 p-4 text-center text-sm text-red-200"
    >
      {{ mapError }}
    </div>
  </div>
</template>
