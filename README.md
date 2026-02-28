# CrisisMap

Real-time geopolitical crisis intelligence dashboard. 10+ live data sources on one screen — conflict events, satellite fire detection, airspace risk zones, financial market impact, and prediction market odds.

**Live demo**: [crisismap.vercel.app](https://crisismap.vercel.app)

## Features

- **Live crisis map** — Dark-themed MapLibre map with color-coded threat markers
- **Multi-source aggregation** — GDELT, Reuters, BBC, Al Jazeera, NHK, AP via RSS
- **Satellite fire detection** — NASA FIRMS VIIRS near-real-time hotspots
- **Airspace risk zones** — Safe Airspace no-fly zone alerts
- **Earthquake monitoring** — USGS M2.5+ global seismic data
- **Armed conflict data** — ACLED political violence events
- **Financial market impact** — VIX, WTI crude oil, gold, Nikkei 225 via Yahoo Finance
- **Prediction markets** — Polymarket geopolitical contract odds
- **Key actor tracking** — Statements and activity from heads of state, military leaders
- **Bilingual** — English + Traditional Chinese (zh-TW) with Taipei timezone

## Architecture

```
Next.js 15 (App Router)
├── MapLibre GL + Carto Dark Matter (free, no token)
├── Zustand (state management)
├── SWR (auto-polling data fetching)
├── Zod (type validation)
└── Tailwind CSS (styling)
```

All data sources implement a common `DataSource` interface:

```typescript
interface DataSource {
  id: string
  name: string
  tier: 'public' | 'private'
  fetch(options?: FetchOptions): Promise<CrisisEvent[]>
  healthCheck(): Promise<boolean>
}
```

Sources are fault-isolated — if one fails, others continue via `Promise.allSettled` with a 10-second per-source timeout.

## Data Sources

### Public (no API key needed)

| Source | Data | Update Interval |
|--------|------|-----------------|
| [GDELT](https://www.gdeltproject.org/) | Global events, geo-coded | 15 min |
| RSS (5 feeds) | Reuters, AP, BBC, NHK, Al Jazeera | 5 min |
| [USGS](https://earthquake.usgs.gov/) | Earthquakes M2.5+ | 15 min |
| [Polymarket](https://polymarket.com/) | Prediction market odds | 5 min |
| [Yahoo Finance](https://finance.yahoo.com/) | VIX, Oil, Gold, Nikkei | 5 min |
| [Safe Airspace](https://safeairspace.net/) | No-fly zone risk levels | 30 min |

### Optional (free API key)

| Source | Data | Key |
|--------|------|-----|
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Satellite fire hotspots | `FIRMS_MAP_KEY` (free) |
| [ACLED](https://acleddata.com/) | Armed conflict events | `ACLED_API_KEY` (free) |

### Private (paid)

| Source | Data | Key |
|--------|------|-----|
| X/Grok | Real-time social media via xAI | `XAI_API_KEY` |

## Quick Start

```bash
git clone https://github.com/realwaynesun/crisismap.git
cd crisismap
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Works immediately with zero configuration — public sources need no API keys.

### Add optional sources

```bash
cp .env.example .env.local
```

Edit `.env.local` to add any keys you have:

```env
# Free — register at firms.modaps.eosdis.nasa.gov/api/map_key/
FIRMS_MAP_KEY=your_key

# Free — register at developer.acleddata.com
ACLED_API_KEY=your_key
ACLED_EMAIL=your_email
```

## Deploy

One-click deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/realwaynesun/crisismap)

Or manually:

```bash
npm run build
npm start
```

## Adding a Data Source

1. Create `src/lib/sources/your-source.ts` implementing `DataSource`
2. Register it in `src/lib/sources/registry.ts`
3. Done — the aggregator picks it up automatically

## License

[MIT](LICENSE)
