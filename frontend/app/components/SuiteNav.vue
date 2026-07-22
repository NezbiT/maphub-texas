<script setup lang="ts">
/**
 * Cross-product suite switcher — one control for industrial navigation.
 */
const cfg = useRuntimeConfig()
const suite = (cfg.public as any).suite || {}

const products = computed(() => [
  { id: 'maphub', label: 'Map', href: '/', internal: true },
  { id: 'flood', label: 'Flood', href: suite.flood || 'http://127.0.0.1:3013' },
  { id: 'power', label: 'Power', href: suite.power || 'http://127.0.0.1:3014' },
  { id: 'radar', label: 'Radar', href: suite.radar || 'http://127.0.0.1:3010' },
  { id: 'channel', label: 'Channel', href: suite.channel || 'http://127.0.0.1:3011' },
  { id: 'sentinel', label: 'Sentinel', href: suite.sentinel || 'http://127.0.0.1:3012' },
  { id: 'finder', label: 'Finder', href: suite.finder || 'http://127.0.0.1:5173/app' },
])
</script>

<template>
  <div class="flex flex-wrap items-center gap-1">
    <span class="mr-1 hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">Suite</span>
    <template v-for="p in products" :key="p.id">
      <NuxtLink
        v-if="p.internal"
        :to="p.href"
        class="rounded-md px-2 py-0.5 text-[11px] font-semibold text-primary bg-primary/10"
      >
        {{ p.label }}
      </NuxtLink>
      <a
        v-else
        :href="p.href"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        {{ p.label }}
      </a>
    </template>
  </div>
</template>
