export const PRODUCT_ID = 'maphub-texas' as const
export const PRODUCT_NAME = 'Map Hub Texas'
export const PRODUCT_DOMAIN = 'map.txbizfinder.com'
export const API_VERSION = '1.1.0'

export type SuiteTier = 'free' | 'contractor' | 'pro' | 'enterprise'

export function suiteMeta(extra: Record<string, unknown> = {}) {
  return {
    suite: 'txbizfinder-intelligence',
    product: PRODUCT_ID,
    productName: PRODUCT_NAME,
    domain: PRODUCT_DOMAIN,
    apiVersion: API_VERSION,
    role: 'command-center',
    tiers: {
      free: 'Multi-layer map, ZIP focus, demo fallbacks',
      contractor: 'Saved layer presets, higher refresh, CSV of pins',
      pro: 'Cross-layer risk scores, API + webhooks, time ranges',
      enterprise: 'Private overlays, SSO, white-label hub',
    } satisfies Record<SuiteTier, string>,
    inspiredBy: 'worldmonitor-style multi-layer situational awareness (Texas domain)',
    ...extra,
  }
}
