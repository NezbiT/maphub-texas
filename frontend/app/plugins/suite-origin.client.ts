/**
 * On www.txbizfinder.com/map the Worker serves this app's HTML at /map
 * but same-origin /api, /_nuxt and i18n fetches would hit Finder.
 * Send those to the Vercel origin instead.
 */
export default defineNuxtPlugin({
  name: 'suite-origin',
  enforce: 'pre',
  setup() {
    const origin = String(useRuntimeConfig().public.cdnOrigin || '').replace(/\/$/, '')
    if (!origin || typeof location === 'undefined') return
    const path = location.pathname
    if (path !== '/map' && !path.startsWith('/map/')) return

    const rewrite = (url: string) => {
      if (url.startsWith('/') && !url.startsWith('//')) return origin + url
      if (url.startsWith(location.origin + '/')) return origin + url.slice(location.origin.length)
      return url
    }

    const rawFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string') return rawFetch(rewrite(input), init)
      if (input instanceof URL) return rawFetch(rewrite(input.toString()), init)
      if (input instanceof Request) {
        const next = rewrite(input.url)
        if (next !== input.url) return rawFetch(new Request(next, input), init)
      }
      return rawFetch(input, init)
    }

    const raw = globalThis.$fetch
    const proxied = ((request: Parameters<typeof $fetch>[0], opts?: Parameters<typeof $fetch>[1]) => {
      const url = typeof request === 'string' ? rewrite(request) : request
      return raw(url, opts)
    }) as typeof $fetch
    Object.assign(proxied, raw)
    globalThis.$fetch = proxied

    const i18n = useNuxtApp().$i18n as { locale?: { value: string }; setLocale?: (code: string) => void } | undefined
    const code = i18n?.locale?.value
    if (code && code !== 'en' && code !== 'es') {
      i18n?.setLocale?.('en')
    }
  },
})
