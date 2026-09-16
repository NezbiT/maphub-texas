import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['maplibre-gl'],
    },
  },
  components: [{ path: '~/components', pathPrefix: false }],
  i18n: {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    lazy: false,
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'mh_locale',
      alwaysRedirect: false,
      fallbackLocale: 'en',
    },
  },
  app: {
    head: {
      title: 'Map Hub Texas — all suite layers on one map',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Map Hub Texas — Finder, Radar, Channel, Sentinel, Flood, and Power on one interactive map with layer filters.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  runtimeConfig: {
    // Server-only upstream APIs (same backends as full apps)
    sources: {
      finderApi: process.env.MAPHUB_FINDER_API || 'http://127.0.0.1:8000',
      finderApiKey: process.env.MAPHUB_FINDER_API_KEY || 'admin-dev-key-change-me',
      radarApi: process.env.MAPHUB_RADAR_API || 'http://127.0.0.1:3010',
      channelApi: process.env.MAPHUB_CHANNEL_API || 'http://127.0.0.1:3011',
      sentinelApi: process.env.MAPHUB_SENTINEL_API || 'http://127.0.0.1:8001',
      floodApi: process.env.MAPHUB_FLOOD_API || 'http://127.0.0.1:3013',
      powerApi: process.env.MAPHUB_POWER_API || 'http://127.0.0.1:3014',
    },
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3015',
      demoMode: process.env.NUXT_PUBLIC_DEMO_MODE !== 'false',
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Map Hub Texas',
      mapStyleUrl:
        process.env.NUXT_PUBLIC_MAP_STYLE_URL ||
        'https://tiles.openfreemap.org/styles/liberty',
      mapCenter: { lat: 31.0, lon: -99.5 },
      mapZoom: 5.5,
      // Full product UIs (deep-links from pins)
      suite: {
        finder: process.env.NUXT_PUBLIC_FINDER_URL || 'https://www.txbizfinder.com/app',
        radar: process.env.NUXT_PUBLIC_RADAR_URL || 'https://www.txbizfinder.com/radar',
        channel: process.env.NUXT_PUBLIC_CHANNEL_URL || 'https://www.txbizfinder.com/channel',
        sentinel: process.env.NUXT_PUBLIC_SENTINEL_URL || 'https://www.txbizfinder.com/sentinel',
        flood: process.env.NUXT_PUBLIC_FLOOD_URL || 'https://www.txbizfinder.com/flood',
        power: process.env.NUXT_PUBLIC_POWER_URL || 'https://www.txbizfinder.com/power',
      },
    },
  },
})
