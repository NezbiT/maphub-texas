<script setup lang="ts">
import { ALL_LAYERS, LAYER_META, type LayerId } from '~/lib/utils'
import type { HubPoint } from '~/components/map/HubMap.client.vue'
import { ExternalLink, Layers, MapPin, RefreshCw, Search, X } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

/** ~15 miles in degrees (rough) for “near this ZIP” filtering */
const ZIP_RADIUS_DEG = 0.22

function parseLayersFromQuery(): LayerId[] {
  const q = route.query.layers
  // Explicit empty query → none. Missing query → all off by default.
  if (q === '' || q === undefined || q === null) return []
  if (typeof q === 'string' && q.trim()) {
    return q
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is LayerId => ALL_LAYERS.includes(s as LayerId))
  }
  return []
}

/** Layers currently shown on the map (all off by default). */
const activeLayers = ref<LayerId[]>(parseLayersFromQuery())
const selectedId = ref<string | null>(null)

const zipInput = ref(
  typeof route.query.zip === 'string' ? route.query.zip.replace(/\D/g, '').slice(0, 5) : '',
)
const zipFocus = ref<{
  zip: string
  lat: number
  lon: number
  label: string
  city?: string | null
} | null>(null)
const zipPending = ref(false)
const zipError = ref<string | null>(null)
const filterNearZip = ref(true)

/** Cached points per layer — fetch only when a layer is first turned on. */
const layerCache = ref<Partial<Record<LayerId, HubPoint[]>>>({})
const layerMetaCache = ref<
  Partial<Record<LayerId, { source: string; count: number; error?: string | null }>>
>({})
const loadingLayers = ref<Set<LayerId>>(new Set())
const fetchError = ref(false)

const pending = computed(() => loadingLayers.value.size > 0)

/** Suite intelligence pulse (WorldMonitor-style overview) */
const {
  data: overview,
  pending: overviewPending,
  refresh: refreshOverview,
} = await useFetch('/api/suite/overview', {
  server: false,
  query: computed(() => ({
    timeRange: typeof route.query.timeRange === 'string' ? route.query.timeRange : '7d',
    zip: zipFocus.value?.zip || '',
  })),
  watch: false,
})

const pulseLevel = computed(() => overview.value?.pulse?.level || 'calm')
const pulseScore = computed(() => overview.value?.pulse?.score ?? null)

const allLoadedPoints = computed<HubPoint[]>(() => {
  const out: HubPoint[] = []
  for (const id of ALL_LAYERS) {
    const list = layerCache.value[id]
    if (list?.length) out.push(...list)
  }
  return out
})

function nearZip(p: HubPoint): boolean {
  if (!zipFocus.value || !filterNearZip.value) return true
  // Exact ZIP match in meta when present
  const z = zipFocus.value.zip
  const metaZip = p.meta?.zip != null ? String(p.meta.zip).slice(0, 5) : ''
  if (metaZip && metaZip === z) return true
  // Distance filter
  const dLat = Math.abs(p.lat - zipFocus.value.lat)
  const dLon = Math.abs(p.lon - zipFocus.value.lon)
  return dLat <= ZIP_RADIUS_DEG && dLon <= ZIP_RADIUS_DEG
}

/** Points for the map (optional near-ZIP filter). Layer chips still filter in HubMap. */
const mapPoints = computed<HubPoint[]>(() => {
  if (!zipFocus.value || !filterNearZip.value) return allLoadedPoints.value
  return allLoadedPoints.value.filter(nearZip)
})

const counts = computed(() => {
  const out: Record<string, number> = {}
  for (const id of ALL_LAYERS) {
    const list = layerCache.value[id] || []
    out[id] =
      zipFocus.value && filterNearZip.value ? list.filter(nearZip).length : list.length
  }
  return out
})

const selected = computed(() => allLoadedPoints.value.find((p) => p.id === selectedId.value) || null)

const visibleCount = computed(
  () =>
    mapPoints.value.filter((p) => activeLayers.value.includes(p.layer)).length,
)

const liveLayerCount = computed(
  () => ALL_LAYERS.filter((id) => layerMetaCache.value[id]?.source === 'live').length,
)

function layerLive(id: LayerId): boolean {
  return layerMetaCache.value[id]?.source === 'live'
}

function layerLoading(id: LayerId): boolean {
  return loadingLayers.value.has(id)
}

async function ensureLayer(id: LayerId, force = false) {
  if (!force && layerCache.value[id]) return
  if (loadingLayers.value.has(id)) return

  const next = new Set(loadingLayers.value)
  next.add(id)
  loadingLayers.value = next
  fetchError.value = false

  try {
    const data = await $fetch<{
      points?: HubPoint[]
      layers?: Array<{ layer: string; source: string; count: number; error?: string | null }>
    }>('/api/layers/all', {
      query: { layers: id },
    })
    const pts = (data.points || []).filter((p) => p.layer === id)
    layerCache.value = { ...layerCache.value, [id]: pts }
    const meta = data.layers?.find((l) => l.layer === id)
    layerMetaCache.value = {
      ...layerMetaCache.value,
      [id]: {
        source: meta?.source || 'live',
        count: pts.length,
        error: meta?.error ?? null,
      },
    }
  } catch {
    fetchError.value = true
    layerCache.value = { ...layerCache.value, [id]: layerCache.value[id] || [] }
    layerMetaCache.value = {
      ...layerMetaCache.value,
      [id]: { source: 'error', count: 0, error: 'fetch failed' },
    }
  } finally {
    const done = new Set(loadingLayers.value)
    done.delete(id)
    loadingLayers.value = done
  }
}

async function ensureActiveLayers(force = false) {
  await Promise.all(activeLayers.value.map((id) => ensureLayer(id, force)))
}

function syncQuery() {
  const query: Record<string, string> = {}
  query.layers = activeLayers.value.length ? activeLayers.value.join(',') : ''
  if (zipFocus.value?.zip) query.zip = zipFocus.value.zip
  router.replace({ query })
}

async function searchZip() {
  const z = zipInput.value.replace(/\D/g, '').slice(0, 5)
  zipInput.value = z
  zipError.value = null
  if (z.length < 5) {
    zipError.value = t('home.zipInvalid')
    return
  }
  zipPending.value = true
  try {
    const data = await $fetch<{
      zip: string
      lat: number
      lon: number
      label: string
      city?: string | null
    }>('/api/geo/zip', { query: { zip: z } })
    zipFocus.value = {
      zip: data.zip,
      lat: data.lat,
      lon: data.lon,
      label: data.label,
      city: data.city,
    }
    // Helpful defaults: flood + radar often ZIP-centric
    const want: LayerId[] = ['flood', 'radar', 'finder']
    const next = new Set(activeLayers.value)
    for (const id of want) next.add(id)
    activeLayers.value = ALL_LAYERS.filter((l) => next.has(l))
    await ensureActiveLayers()
    // Prefer flood pin for this ZIP if loaded
    const floodHit = (layerCache.value.flood || []).find(
      (p) => String(p.meta?.zip || '').slice(0, 5) === z,
    )
    selectedId.value = floodHit?.id ?? null
    syncQuery()
  } catch (e: any) {
    const msg =
      e?.data?.statusMessage ||
      e?.statusMessage ||
      e?.message ||
      t('home.zipError')
    zipError.value = String(msg)
    zipFocus.value = null
  } finally {
    zipPending.value = false
  }
}

function clearZip() {
  zipInput.value = ''
  zipFocus.value = null
  zipError.value = null
  syncQuery()
}

async function toggleLayer(id: LayerId) {
  const set = new Set(activeLayers.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
    // Load only when turning ON
    void ensureLayer(id)
  }
  activeLayers.value = ALL_LAYERS.filter((l) => set.has(l))
  if (selected.value && !set.has(selected.value.layer)) {
    selectedId.value = null
  }
  syncQuery()
}

async function showAll() {
  activeLayers.value = [...ALL_LAYERS]
  syncQuery()
  await ensureActiveLayers()
}

function clearAll() {
  activeLayers.value = []
  selectedId.value = null
  syncQuery()
}

async function refresh() {
  // Reload only layers that are currently on
  await Promise.all(activeLayers.value.map((id) => ensureLayer(id, true)))
  await refreshOverview()
}

function onSelect(p: HubPoint) {
  selectedId.value = p.id
}

function clearSelect() {
  selectedId.value = null
}

function openFullApp(p: HubPoint) {
  if (p.appUrl) window.open(p.appUrl, '_blank', 'noopener,noreferrer')
}

// If URL has layers / zip, restore them
onMounted(async () => {
  if (activeLayers.value.length) await ensureActiveLayers()
  const z = typeof route.query.zip === 'string' ? route.query.zip.replace(/\D/g, '').slice(0, 5) : ''
  if (z.length === 5) {
    zipInput.value = z
    await searchZip()
  }
})
</script>

<template>
  <div class="flex flex-1 flex-col lg:gap-4 lg:p-6">
    <section class="order-2 space-y-3 p-4 lg:order-1 lg:p-0">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Layers class="size-5" />
          </div>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ t('home.title') }}</h1>
            <p class="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">{{ t('home.subtitle') }}</p>
            <p class="mt-1 text-xs text-muted-foreground">
              <template v-if="activeLayers.length">
                {{ t('home.liveSources', { n: liveLayerCount, total: activeLayers.length }) }}
              </template>
              <template v-else>
                {{ t('home.pickLayers') }}
              </template>
            </p>
            <div
              v-if="pulseScore != null"
              class="mt-2 inline-flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-2.5 py-1 text-xs"
            >
              <span class="font-semibold uppercase tracking-wide text-muted-foreground">{{ t('home.pulse') }}</span>
              <span
                class="rounded-md px-1.5 py-0.5 font-semibold capitalize"
                :class="{
                  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400': pulseLevel === 'calm',
                  'bg-amber-500/15 text-amber-700 dark:text-amber-400': pulseLevel === 'elevated',
                  'bg-orange-500/15 text-orange-700 dark:text-orange-400': pulseLevel === 'heightened',
                  'bg-red-500/15 text-red-600 dark:text-red-400': pulseLevel === 'critical',
                }"
              >
                {{ pulseLevel }} · {{ pulseScore }}
              </span>
              <span v-if="overviewPending" class="text-muted-foreground">…</span>
              <span
                v-for="(d, i) in (overview?.pulse?.drivers || []).slice(0, 2)"
                :key="i"
                class="text-muted-foreground"
              >
                · {{ d }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            class="rounded-xl gap-1.5"
            :disabled="pending || !activeLayers.length"
            @click="refresh"
          >
            <RefreshCw class="size-3.5" :class="{ 'animate-spin': pending }" />
            {{ t('home.refresh') }}
          </Button>
          <Button variant="outline" size="sm" class="rounded-xl" @click="showAll">{{ t('home.all') }}</Button>
          <Button variant="ghost" size="sm" class="rounded-xl" @click="clearAll">{{ t('home.none') }}</Button>
        </div>
      </div>

      <!-- ZIP search -->
      <form class="flex flex-wrap items-end gap-2" @submit.prevent="searchZip">
        <div class="min-w-[10rem] flex-1 sm:max-w-[14rem]">
          <label class="mb-1 block text-xs font-medium text-muted-foreground" for="hub-zip">
            {{ t('home.zipLabel') }}
          </label>
          <div class="relative">
            <MapPin class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="hub-zip"
              v-model="zipInput"
              type="text"
              inputmode="numeric"
              maxlength="5"
              pattern="[0-9]{5}"
              :placeholder="t('home.zipPlaceholder')"
              class="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring transition focus:ring-2"
            />
          </div>
        </div>
        <Button type="submit" class="h-10 gap-2 rounded-xl" :disabled="zipPending || zipInput.replace(/\D/g, '').length < 5">
          <Search class="size-4" :class="{ 'animate-pulse': zipPending }" />
          {{ t('home.zipSearch') }}
        </Button>
        <Button
          v-if="zipFocus"
          type="button"
          variant="ghost"
          size="sm"
          class="h-10 gap-1 rounded-xl"
          @click="clearZip"
        >
          <X class="size-4" />
          {{ t('home.zipClear') }}
        </Button>
        <label
          v-if="zipFocus"
          class="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-xs text-muted-foreground"
        >
          <input v-model="filterNearZip" type="checkbox" class="accent-primary" />
          {{ t('home.zipNearOnly') }}
        </label>
      </form>
      <p v-if="zipError" class="text-xs text-destructive">{{ zipError }}</p>
      <p v-else-if="zipFocus" class="text-xs text-primary">
        {{ t('home.zipActive', { label: zipFocus.label }) }}
      </p>

      <div class="flex flex-wrap gap-2" role="group" :aria-label="t('home.layers')">
        <button
          v-for="id in ALL_LAYERS"
          :key="id"
          type="button"
          class="mh-layer-chip"
          :class="{
            'mh-layer-chip--on': activeLayers.includes(id),
            'opacity-80': layerLoading(id),
          }"
          :style="{ '--chip': LAYER_META[id].color }"
          :aria-pressed="activeLayers.includes(id)"
          :title="layerLive(id) ? t('home.sourceLive') : t('home.sourceDemo')"
          @click="toggleLayer(id)"
        >
          <span class="mh-layer-chip__dot" aria-hidden="true" />
          {{ LAYER_META[id].label }}
          <span v-if="layerLoading(id)" class="tabular-nums opacity-70">…</span>
          <span v-else-if="counts[id]" class="opacity-70 tabular-nums">{{ counts[id] }}</span>
          <span
            v-if="activeLayers.includes(id) && layerMetaCache[id]"
            class="rounded px-1 text-[9px] font-bold uppercase tracking-wide"
            :class="layerLive(id) ? 'bg-emerald-500/25 text-emerald-200' : 'bg-white/10 text-white/70'"
          >
            {{ layerLive(id) ? 'LIVE' : 'DEMO' }}
          </span>
        </button>
      </div>

      <p class="text-xs text-muted-foreground">
        {{ t('home.showing', { n: visibleCount, total: mapPoints.length }) }}
        <span v-if="fetchError" class="text-destructive"> · {{ t('home.fetchError') }}</span>
      </p>
    </section>

    <div class="order-1 grid flex-1 gap-0 lg:order-2 lg:grid-cols-[1fr_300px] lg:gap-4">
      <div class="relative h-[58dvh] min-h-[280px] w-full lg:h-auto lg:min-h-[420px]">
        <ClientOnly>
          <HubMap
            :points="mapPoints"
            :active-layers="activeLayers"
            :selected-id="selectedId"
            :focus="
              zipFocus
                ? { lat: zipFocus.lat, lon: zipFocus.lon, zoom: 11, label: zipFocus.label }
                : null
            "
            height="100%"
            @select="onSelect"
          />
          <template #fallback>
            <div
              class="flex h-full min-h-[280px] items-center justify-center bg-muted/40 text-sm text-muted-foreground lg:rounded-xl lg:border"
            >
              {{ t('common.loading') }}
            </div>
          </template>
        </ClientOnly>
        <p
          v-if="!activeLayers.length"
          class="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center text-sm text-white/90 drop-shadow"
        >
          {{ t('home.pickLayers') }}
        </p>
        <p v-if="pending" class="mt-2 px-4 text-xs text-muted-foreground lg:px-0">{{ t('common.loading') }}</p>
      </div>

      <aside class="space-y-3 p-4 lg:p-0 lg:sticky lg:top-[4.25rem] lg:self-start">
        <Transition name="mh-panel" mode="out-in">
          <div v-if="selected" :key="selected.id" class="rounded-2xl border bg-card p-5 shadow-sm">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p
                  class="text-[11px] font-extrabold uppercase tracking-wider"
                  :style="{ color: LAYER_META[selected.layer].color }"
                >
                  {{ LAYER_META[selected.layer].label }}
                  <span class="ml-1 font-semibold normal-case tracking-normal opacity-70">
                    · {{ selected.source === 'live' ? t('home.sourceLive') : t('home.sourceDemo') }}
                  </span>
                </p>
                <p class="mt-0.5 text-lg font-bold leading-snug">{{ selected.name }}</p>
              </div>
              <Button variant="ghost" size="sm" @click="clearSelect">{{ t('home.clear') }}</Button>
            </div>
            <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{{ selected.summary }}</p>
            <p v-if="selected.score != null" class="mt-2 text-sm font-semibold tabular-nums">
              {{ t('home.signal') }}: {{ selected.score }}
            </p>
            <ul v-if="selected.meta" class="mt-3 space-y-1 text-xs text-muted-foreground">
              <li v-for="(val, key) in selected.meta" :key="String(key)">
                <span class="font-medium text-foreground/80">{{ key }}:</span> {{ val }}
              </li>
            </ul>
            <Button
              class="mt-4 w-full gap-2 rounded-xl"
              :disabled="!selected.appUrl"
              @click="openFullApp(selected)"
            >
              {{ t('home.openApp') }}
              <ExternalLink class="size-4" />
            </Button>
          </div>
          <div
            v-else
            key="hint"
            class="rounded-2xl border border-dashed bg-card/50 p-5 text-sm text-muted-foreground"
          >
            {{ t('home.hint') }}
          </div>
        </Transition>

        <div class="rounded-2xl border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          {{ t('home.disclaimer') }}
        </div>
      </aside>
    </div>
  </div>
</template>
