/** Tiny HTTP helpers shared by layer adapters — keep fetchLayers thin. */

export function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

export function parseCoords(coords: unknown): { lat: number; lon: number } | null {
  if (Array.isArray(coords) && coords.length >= 2) {
    const lon = num(coords[0])
    const lat = num(coords[1])
    if (lat != null && lon != null) return { lat, lon }
  }
  if (typeof coords === 'string') {
    const parts = coords.trim().split(/[\s,]+/).map(Number)
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      if (Math.abs(parts[0]) > 30) return { lon: parts[0], lat: parts[1] }
      return { lat: parts[0], lon: parts[1] }
    }
  }
  return null
}

export function stripSlash(url: string) {
  return url.replace(/\/+$/, '')
}

export function joinUrl(base: string, path: string) {
  const b = stripSlash(base)
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

export async function safeFetch<T>(
  url: string,
  opts: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await $fetch<T>(url, {
      headers: opts.headers,
      timeout: opts.timeoutMs ?? 12_000,
    })
    return { ok: true, data }
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || String(e)
    return { ok: false, error: msg }
  }
}
