# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Next.js dev server on port 3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint via next lint
```

No test framework is configured yet (no vitest/jest/playwright).

## Architecture

Real-time geopolitical crisis intelligence dashboard. Next.js 15 App Router + MapLibre GL map + Zustand state + SWR polling + Zod validation + Tailwind CSS v4.

### Data Pipeline

```
12 DataSources → aggregator.ts (Promise.allSettled, 10s timeout per source)
    → deduplicate by event ID → sort by timestamp → cache 30s
    → API routes (/api/events, /api/markets, /api/actors, /api/indicators)
    → SWR hooks (auto-poll) → Zustand stores → React components
```

### DataSource Interface

Every source in `src/lib/sources/` implements:

```typescript
interface DataSource {
  id: string
  name: string
  tier: 'public' | 'private'
  fetch(options?: FetchOptions): Promise<CrisisEvent[]>
  healthCheck(): Promise<boolean>
}
```

To add a source: create `src/lib/sources/your-source.ts`, register it in `src/lib/sources/registry.ts`. The aggregator picks it up automatically.

### Key Modules

- **`src/lib/aggregator.ts`** — Orchestrates all sources with fault isolation. A failing source returns `[]`, never blocks others.
- **`src/lib/sources/registry.ts`** — Source registry. Public sources (no keys needed) vs private (API keys required).
- **`src/lib/scorer.ts`** — Keyword-based threat level classification (critical/high/medium/low/info) with category boosts.
- **`src/lib/translate.ts`** — Gemini Flash batch translation for zh-TW locale. 10-minute cache per string.
- **`src/lib/geocoder.ts`** — Hardcoded location name → lat/lng mapping (100+ geopolitical locations).
- **`src/lib/cache.ts`** — Simple in-memory Map-based cache with TTL.
- **`src/lib/regions.ts`** — Geographic region filtering for map/feed.
- **`src/types/index.ts`** — All Zod schemas and TypeScript types. `CrisisEvent` is the core data type.

### State Management

- **`src/stores/event-store.ts`** — Filter state (categories, threat levels, sources, search text), selected event.
- **`src/stores/map-store.ts`** — Map viewport (center, zoom, bounds).

### Routing

Locale-based routing via `src/middleware.ts`: `/{locale}/` where locale is `en` or `zh-TW`. Bilingual with timezone awareness (UTC vs Asia/Taipei).

## Environment Variables

All optional. Public sources work with zero config.

| Variable | Purpose |
|----------|---------|
| `FIRMS_MAP_KEY` | NASA FIRMS satellite fire data |
| `ACLED_API_KEY` + `ACLED_EMAIL` | Armed conflict events |
| `X_BEARER_TOKEN` | X API v2 direct search (preferred) |
| `XAI_API_KEY` | Grok API fallback for X data |
| `GOOGLE_API_KEY` | Gemini Flash for zh-TW translation |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Notifications |

## API Response Convention

All API routes return: `{ success: boolean, data?: T, error?: string }`

## Source Tiers

- **Public** (8 sources): USGS, GDELT, RSS (Reuters/AP/BBC/NHK/Al Jazeera), ACLED, Polymarket, Yahoo Finance, NASA FIRMS, Safe Airspace
- **Private** (2 sources): X/Grok (with X API v2 → Grok fallback chain), Digest (WSJ/Nikkei)

## Key Patterns

- Sources use fallback chains when primary API fails (e.g., Binance → CoinGecko for BTC, X API v2 → Grok for social media)
- `fast-xml-parser` is configured as a server external package in `next.config.ts` (used by RSS source)
- Map uses Carto Dark Matter basemap (free, no token required)
