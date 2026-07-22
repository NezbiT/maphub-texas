# Map Hub Texas — Command center (WorldMonitor-style)

Unifies Finder · Radar · Channel · Sentinel · Flood · Power on one MapLibre map.

## Vision

Texas **situational awareness SaaS** for contractors, brokers, and insurers — multi-layer map, cross-signal pulse, deep links into full apps. Inspired by products like [World Monitor](https://www.worldmonitor.app) (layers + time range + intelligence overview), scoped to **Texas public data**.

## APIs

| Endpoint | Role |
|----------|------|
| `GET /api/suite/overview` | Cross-layer pulse + probes |
| `GET /api/layers/all?layers=…&timeRange=7d` | Normalized pins |
| `GET /api/geo/zip` | TX ZIP geocode |
| `GET /api/health` · `/api/suite/meta` | Product metadata |

## Default ports (local suite)

| Product | Port |
|---------|------|
| PermitRadar | 3010 |
| ChannelWatch | 3011 |
| Emissions Sentinel API | 8001 |
| FloodGuard | 3013 |
| PowerPulse | 3014 |
| MapHub | 3015 |
| TxBizFinder API | 8000 |

## SaaS tiers

Free → Contractor → Pro → Enterprise (see `suiteMeta` in code).
