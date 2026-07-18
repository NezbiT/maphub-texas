/**
 * Resolve a 5-digit US ZIP to lat/lon (Texas preferred).
 * Same approach as ChannelWatch — Zippopotam + Census fallback.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const zip = String(q.zip || '')
    .replace(/\D/g, '')
    .slice(0, 5)
  if (zip.length !== 5) {
    throw createError({ statusCode: 400, statusMessage: 'ZIP must be 5 digits' })
  }

  try {
    const data = await $fetch<{
      places?: Array<{
        'place name'?: string
        longitude?: string
        latitude?: string
        'state abbreviation'?: string
      }>
    }>(`https://api.zippopotam.us/us/${zip}`, {
      headers: { Accept: 'application/json' },
      timeout: 10_000,
    })

    const place = data?.places?.[0]
    if (!place?.latitude || !place?.longitude) {
      throw createError({ statusCode: 404, statusMessage: 'ZIP not found' })
    }

    const state = place['state abbreviation'] || ''
    const city = place['place name'] || null
    const lat = Number(place.latitude)
    const lon = Number(place.longitude)
    const label = city ? `${city}, ${state} ${zip}` : `${state} ${zip}`

    if (state && state !== 'TX') {
      throw createError({
        statusCode: 422,
        statusMessage: 'ZIP is outside Texas',
      })
    }

    return {
      zip,
      lat,
      lon,
      city,
      state: state || 'TX',
      label,
      source: 'zippopotam',
    }
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode
    if (status === 404 || status === 422 || status === 400) throw e

    // Census one-line geocoder fallback
    try {
      const census = await $fetch<{
        result?: {
          addressMatches?: Array<{
            coordinates?: { x: number; y: number }
            addressComponents?: { city?: string; state?: string; zip?: string }
          }>
        }
      }>('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress', {
        query: {
          address: `${zip}, TX`,
          benchmark: 'Public_AR_Current',
          format: 'json',
        },
        timeout: 12_000,
      })

      const match = census?.result?.addressMatches?.[0]
      const x = match?.coordinates?.x
      const y = match?.coordinates?.y
      if (x == null || y == null) {
        throw createError({ statusCode: 404, statusMessage: 'ZIP not found' })
      }
      const city = match?.addressComponents?.city || null
      const state = match?.addressComponents?.state || 'TX'
      if (state && state !== 'TX') {
        throw createError({ statusCode: 422, statusMessage: 'ZIP is outside Texas' })
      }
      return {
        zip,
        lat: y,
        lon: x,
        city,
        state: 'TX',
        label: city ? `${city}, TX ${zip}` : `TX ${zip}`,
        source: 'census',
      }
    } catch (e2: unknown) {
      const st = (e2 as { statusCode?: number })?.statusCode
      if (st === 404 || st === 422 || st === 400) throw e2
      throw createError({ statusCode: 502, statusMessage: 'ZIP lookup failed' })
    }
  }
})
