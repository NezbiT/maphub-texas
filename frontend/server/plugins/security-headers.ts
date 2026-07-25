/**
 * Baseline security headers for public map apps (defense in depth).
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    const h = response.headers || (response.headers = {})
    const set = (k: string, v: string) => {
      if (!h[k] && !h[k.toLowerCase()]) h[k] = v
    }
    set('X-Content-Type-Options', 'nosniff')
    set('X-Frame-Options', 'SAMEORIGIN')
    set('Referrer-Policy', 'strict-origin-when-cross-origin')
    set('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()')
    set('Cross-Origin-Opener-Policy', 'same-origin')
  })
})
