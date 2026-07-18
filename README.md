# Map Hub Texas

Unified Texas map for **TxBizFinder Intelligence** — all suite layers on one interactive MapLibre map with filter toggles.

- Domain: `map.txbizfinder.com`
- Layers: FINDER · RADAR · CHANNEL · SENTINEL · FLOOD · POWER

## Stack

Nuxt 4 · Vue 3 · TypeScript · Tailwind v4 · MapLibre · EN/ES · demo APIs

## Dev

```bash
cd frontend
npm install
npm run dev -- --port 3015 --host 127.0.0.1
```

Deep-link: `?layers=flood,power,radar`

## Data model

Map Hub **does not invent layer data**. Server-side it calls each full app:

| Layer | Full-app API | Deep-link |
|-------|--------------|-----------|
| FINDER | `GET {finderApi}/api/leads` (+ `X-API-Key`) | TxBizFinder `/app?q=` |
| RADAR | `GET {radarApi}/api/permits?limit=` | PermitRadar `/permit/:id` |
| CHANNEL | `GET /api/monitors` + `/api/events` | ChannelWatch |
| SENTINEL | `GET {sentinelApi}/v1/facilities` | Sentinel `/facilities/:id` |
| FLOOD | `GET /api/risk/zones` | FloodGuard `?zip=` |
| POWER | `GET /api/grid/regions` | PowerPulse `?region=` |

If an upstream is offline, that layer falls back to a small demo set and is labeled **DEMO** in the UI.

## Hub API

| Route | Purpose |
|-------|---------|
| `GET /api/layers/all?layers=flood,power` | Aggregated points from suite backends |

## Env (server)

```
MAPHUB_FINDER_API=http://127.0.0.1:8000
MAPHUB_FINDER_API_KEY=admin-dev-key-change-me
MAPHUB_RADAR_API=http://127.0.0.1:3010
MAPHUB_CHANNEL_API=http://127.0.0.1:3011
MAPHUB_SENTINEL_API=http://127.0.0.1:8001
MAPHUB_FLOOD_API=http://127.0.0.1:3013
MAPHUB_POWER_API=http://127.0.0.1:3014
```
