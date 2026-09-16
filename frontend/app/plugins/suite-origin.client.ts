/**
 * On www.txbizfinder.com/map the Worker serves this app's HTML at /map
 * but /api would hit Finder. Send our API calls to the Vercel origin.
 */
export default defineNuxtPlugin({
  name: 'suite-origin',
  enforce: 'pre',
  setup() {
    const origin = String(useRuntimeConfig().public.cdnOrigin || '')
    if (!origin || typeof location === 'undefined') return
    const path = location.pathname
    if (path !== '/map' && !path.startsWith('/map/')) return

    const raw = globalThis.$fetch
    const proxied = ((request: Parameters<typeof $fetch>[0], opts?: Parameters<typeof $fetch>[1]) => {
      const url = typeof request === 'string' ? request : ''
      if (url.startsWith('/api') || url.startsWith('/_nuxt')) {
        return raw(origin + url, opts)
      }
      return raw(request, opts)
    }) as typeof $fetch
    Object.assign(proxied, raw)
    globalThis.$fetch = proxied
  },
})
