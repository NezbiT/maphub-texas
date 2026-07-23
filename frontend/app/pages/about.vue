<script setup lang="ts">
const { t, locale } = useI18n()
useSeoMeta({
  title: () => `${t('app.name')} — ${t('nav.about')}`,
})

type Confidence = 'official' | 'agency_open_data' | 'best_effort_scrape' | 'modeled_demo'

const productMap = computed(() => [
  {
    product: 'FloodGuard',
    api: 'FEMA NFHL + NWS + USGS + OpenFEMA',
    scrape: locale.value === 'es' ? 'Solo capa local no expuesta' : 'Only if missing local layer',
  },
  {
    product: 'PowerPulse',
    api: 'EIA + ERCOT public (ToS) + NOAA heat',
    scrape: locale.value === 'es' ? 'ERCOT HTML solo fallback' : 'ERCOT HTML fallback only',
  },
  {
    product: 'ChannelWatch',
    api: 'Open-Meteo + NOAA + AirNow + TCEQ GIS',
    scrape: 'CAMS/EER HTML',
  },
  {
    product: 'Emissions Sentinel',
    api: 'EIA + CAMPD + OpenAQ + GHGRP/eGRID bulk',
    scrape: locale.value === 'es' ? 'Evitar scrapes ad-hoc' : 'Avoid ad-hoc scrapes',
  },
  {
    product: 'PermitRadar',
    api: 'SODA/CKAN multi-city + Houston xlsx',
    scrape: 'Houston xlsx',
  },
  {
    product: 'TxBizFinder',
    api: 'data.texas.gov + TABC Socrata',
    scrape: 'DDG/Playwright research',
  },
  {
    product: 'MapHub',
    api: locale.value === 'es' ? 'Proxy a APIs de la suite' : 'Proxy suite APIs (no invented data)',
    scrape: 'N/A',
  },
])

const confidenceLegend: { key: Confidence; labelEn: string; labelEs: string; cls: string }[] = [
  {
    key: 'official',
    labelEn: 'Official',
    labelEs: 'Oficial',
    cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
  },
  {
    key: 'agency_open_data',
    labelEn: 'Agency open data',
    labelEs: 'Open data agencia',
    cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/30',
  },
  {
    key: 'best_effort_scrape',
    labelEn: 'Best-effort scrape',
    labelEs: 'Scrape best-effort',
    cls: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/30',
  },
  {
    key: 'modeled_demo',
    labelEn: 'Modeled / demo',
    labelEs: 'Modelado / demo',
    cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30',
  },
]
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4 py-8 lg:p-8">
    <h1 class="text-2xl font-semibold">{{ t('about.title') }}</h1>
    <p class="leading-relaxed text-muted-foreground">{{ t('about.body') }}</p>
    <p class="text-sm leading-relaxed text-muted-foreground">{{ t('about.layers') }}</p>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">{{ t('about.confidenceTitle') }}</h2>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="c in confidenceLegend"
          :key="c.key"
          class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset"
          :class="c.cls"
        >
          {{ locale === 'es' ? c.labelEs : c.labelEn }}
        </span>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">{{ t('about.productMapTitle') }}</h2>
      <p class="text-xs text-muted-foreground">{{ t('about.productMapHint') }}</p>
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full min-w-[28rem] text-left text-sm">
          <thead class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th class="px-3 py-2 font-medium">{{ t('about.colProduct') }}</th>
              <th class="px-3 py-2 font-medium">{{ t('about.colApi') }}</th>
              <th class="px-3 py-2 font-medium">{{ t('about.colScrape') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in productMap"
              :key="row.product"
              class="border-b border-border/60 last:border-0"
            >
              <td class="px-3 py-2 font-medium">{{ row.product }}</td>
              <td class="px-3 py-2 text-muted-foreground">{{ row.api }}</td>
              <td class="px-3 py-2 text-muted-foreground">{{ row.scrape }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="text-sm leading-relaxed text-muted-foreground">{{ t('about.suite') }}</p>
  </div>
</template>
