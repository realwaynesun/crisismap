# World Monitor vs CrisisMap — Competitive Analysis

> Research date: 2026-03-01
> Source: https://github.com/koala73/worldmonitor

---

## 1. Positioning

| | **World Monitor** | **CrisisMap** |
|---|---|---|
| Positioning | Full-spectrum global OSINT platform | Focused Middle East geopolitical crisis monitor |
| Complexity | Enterprise-grade, feature-rich | Minimal, zero-config-first |
| Deployment | Tauri desktop + PWA + Web | Next.js SSR Web only |
| Data scale | 150+ RSS, 40+ layers, 220+ military bases | 10 data sources, ~5 layers |
| Target users | OSINT analysts, intelligence professionals | Individual situational awareness |

---

## 2. Tech Stack

| Dimension | **World Monitor** | **CrisisMap** |
|---|---|---|
| Framework | Vite + React + TypeScript | Next.js 15 App Router + TypeScript |
| Map | deck.gl + MapLibre (WebGL 3D globe, 60fps) | react-map-gl + MapLibre (2D) |
| State | localStorage + IndexedDB + Redis (Upstash) | Zustand (in-memory only) |
| API layer | 60+ Edge Functions + Protocol Buffers | 4 API Routes (pure REST) |
| AI/ML | Transformers.js (browser) + Ollama/Groq/OpenRouter | Gemini Flash (translation only) |
| Desktop | Tauri (macOS/Win/Linux) with OS keychain | None |
| Caching | Redis + Service Worker offline | In-memory Map with TTL |
| Localization | 16 languages + RTL support | 2 languages (en, zh-TW) |
| Testing | Playwright E2E + custom map harness | None configured |

---

## 3. Data Sources

### 3.1 News & Media

| Source type | **World Monitor** | **CrisisMap** |
|---|---|---|
| RSS feeds | 150+ across geopolitics, defense, energy, tech, finance | 5 (Reuters, AP, BBC, NHK, Al Jazeera) |
| Live video | 8+ default + 30+ additional livestreams (Bloomberg, Sky News, Al Jazeera, etc.) | None |
| Webcams | 22 geopolitical hotspot cams across 5 regions | None |
| Social media | Telegram 27 OSINT channels (Aurora Intel, BNO, OSINTdefender, etc.) | X API v2 → Grok fallback chain |
| Premium news | Not mentioned | WSJ + Nikkei digest (local JSON) |

### 3.2 Conflict & Security

| Source type | **World Monitor** | **CrisisMap** |
|---|---|---|
| Armed conflict | ACLED + UCDP (dual-sourced, Haversine-deduplicated) | ACLED |
| Cyber threats | APT group attribution + IOC geolocation | None |
| Israel alerts | OREF Home Front Command (rockets/missiles/drones) | None |
| GPS jamming | ADS-B analysis → H3 hex grid | None |
| Travel advisories | US State + AU DFAT + UK FCDO + NZ MFAT | None |

### 3.3 Natural Events

| Source type | **World Monitor** | **CrisisMap** |
|---|---|---|
| Earthquakes | USGS + GDACS + NASA EONET | USGS only |
| Satellite fire | NASA FIRMS VIIRS | NASA FIRMS VIIRS |
| Climate | 15 conflict zones vs ERA5 30-day baselines | None |
| Population exposure | WorldPop density within event radii | None |

### 3.4 Military & Strategic

| Source type | **World Monitor** | **CrisisMap** |
|---|---|---|
| Military bases | 220+ across 9 operators | None |
| Flight tracking | ADS-B live military aircraft | None |
| Naval tracking | AIS with 8 strategic chokepoint detection | None |
| Nuclear facilities | Power plants, labs, enrichment sites | None |
| Spaceports | Launch facilities tracked | None |

### 3.5 Infrastructure

| Source type | **World Monitor** | **CrisisMap** |
|---|---|---|
| Undersea cables | 55 routes + repair ship tracking | None |
| Pipelines | 88 oil/gas pipelines | None |
| AI datacenters | 111 major clusters (10k+ GPUs each) | None |
| Ports | 83 strategic ports with throughput rankings | None |
| Internet outages | Cloudflare Radar | None |
| Airspace | ADS-B based | Safe Airspace (HTML scraping) |
| Trade routes | 19 global routes with chokepoint arcs | None |

### 3.6 Markets & Finance

| Source type | **World Monitor** | **CrisisMap** |
|---|---|---|
| Stock exchanges | 92 global exchanges | None |
| Market data | BTC ETF flows, stablecoin peg health, Fear & Greed Index | Yahoo Finance (Oil, Gold, VIX, S&P, BTC) |
| Prediction markets | Polymarket (3-tier JA3 bypass) | Polymarket (direct API) |
| Central banks | 13 central banks + BIS data | None |
| Commodities | 10 commodity hubs | WTI Oil, Gold via Yahoo Finance |
| Trade policy | WTO restrictions, tariffs, SPS/TBT barriers | None |
| Crypto | BTC, ETH, SOL, XRP via CoinGecko | BTC via Binance → CoinGecko fallback |

---

## 4. World Monitor Unique Features

### 4.1 Pizza Index (PizzINT)
Monitors late-night foot traffic at restaurants near the Pentagon, CIA Langley, and other facilities. Activity spikes serve as unconventional crisis indicators.

### 4.2 Country Instability Index (CII)
0-100 scoring system for 23 tier-1 nations with:
- News velocity analysis
- Z-score baseline deviation
- Contextual event multipliers
- 15-minute warmup learning mode

### 4.3 Browser-Side ML
Transformers.js running NER + sentiment analysis entirely in-browser via Web Worker. No server needed. Toggle controls ONNX model loading.

### 4.4 AIS Naval Intelligence
- 8 strategic strait chokepoint monitoring
- Dark ship detection (AIS transponder analysis)
- MMSI prefix classification
- 30-minute density grid aggregation (2x2 degrees)

### 4.5 Historical Playback
IndexedDB dashboard snapshots with time slider. Live updates pause during playback mode.

### 4.6 Desktop Application (Tauri)
- macOS Keychain / Windows Credential Manager integration
- Local LLM support (Ollama, LM Studio)
- Consolidated keychain vault (single JSON blob)
- Auto-update with variant-aware asset routing

### 4.7 Signal Fusion & Anomaly Detection
- Welford's online algorithm for streaming mean/variance
- Z-score thresholds (1.5/2.0/3.0) flag deviations
- Regional convergence: multi-signal clustering in same geographic area
- Temporal baseline anomalies stored in Redis

### 4.8 Command Palette (Cmd+K)
Fuzzy search across 20+ result types, 250 ISO countries, layer toggles, presets. Scoring: exact (3pts), prefix (2pts), substring (1pt).

### 4.9 Dynamic OG Images
SVG-generated 1200x630px social sharing cards per country with CII gauge arc, threat-level coloring, signal chips.

### 4.10 GPS/GNSS Jamming Detection
ADS-B data analyzed for interference patterns, classified on H3 hex grid with interference percentage.

---

## 5. CrisisMap Advantages

| Advantage | Detail |
|---|---|
| **Zero-config** | 8/10 sources work without any API key |
| **Minimal architecture** | Clear project structure, easy to understand and maintain |
| **Next.js SSR** | SEO-friendly, stale-while-revalidate caching |
| **Gemini translation** | Real-time batch zh-TW translation (simpler than WM's multi-provider approach) |
| **Fault isolation** | Each source runs in independent Promise.race + 10s timeout |
| **Prediction markets** | Polymarket as first-class data source with dedicated panel |
| **Actor intelligence** | 21 geopolitical actors auto-tracked from event text |
| **Fast startup** | Lightweight, loads in seconds vs WM's heavy layer initialization |
| **Fallback chains** | X API v2 → Grok, Binance → CoinGecko — graceful degradation |

---

## 6. Actionable Opportunities

Features to borrow from World Monitor, ranked by priority:

### P0 — Low effort, high value

| Feature | Effort | Notes |
|---|---|---|
| Telegram OSINT channels | Low | Existing bot infrastructure; add 10-15 key OSINT channels as a data source |
| Cloudflare Radar internet outages | Low | Free API, maps directly to CrisisEvent schema |
| More RSS feeds | Low | Expand from 5 to 30+ feeds; add defense, energy, regional sources |
| Fear & Greed Index | Low | Single API call, fits existing MarketStrip |

### P1 — Medium effort, high value

| Feature | Effort | Notes |
|---|---|---|
| Cmd+K search palette | Medium | Major UX improvement; search events, locations, actors |
| OREF Israel alerts | Low-Medium | Critical for Middle East focus; real-time rocket/missile data |
| GDACS disaster alerts | Low | Complements USGS; adds floods, cyclones, volcanoes |
| Travel advisories layer | Medium | US State Dept API; overlay on map |

### P2 — Medium effort, strategic value

| Feature | Effort | Notes |
|---|---|---|
| Country Instability Index | Medium | Differentiated feature; could build simplified version with existing data |
| Historical snapshots | Medium | IndexedDB-based; enables temporal analysis |
| Anomaly detection (Z-score) | Medium | Welford's algorithm on event frequency per region/type |
| Dynamic OG images for sharing | Medium | SVG generation in API route; improves social sharing |

### P3 — High effort, nice to have

| Feature | Effort | Notes |
|---|---|---|
| AIS naval tracking | High | Requires commercial data source or AISStream WebSocket |
| deck.gl 3D globe | High | Visual upgrade but significant engineering; current 2D works well |
| Browser-side ML (NER) | High | Transformers.js integration; value unclear for focused use case |
| Tauri desktop app | High | PWA may be sufficient alternative |
| Live video streams | Medium | YouTube embed + HLS; bandwidth and legal considerations |

---

## 7. Architecture Comparison Diagram

```
WORLD MONITOR                          CRISISMAP
============                          =========

150+ RSS ──┐                           5 RSS ──────┐
27 Telegram ┤                          USGS ───────┤
ACLED+UCDP ─┤                          GDELT ──────┤
USGS+GDACS ─┤   60+ Edge Functions     ACLED ──────┤   aggregator.ts
AIS Stream ─┤──→ + Proto-first API     X/Grok ─────┤──→ (Promise.allSettled
OpenSky ────┤   + Redis cache          Polymarket ──┤    + 10s timeout)
FIRMS ──────┤   + Circuit breakers     Yahoo Fin ───┤   + 30s memory cache
Cloudflare ─┤                          FIRMS ──────┤
WTO/BIS ────┤     ↓                    SafeAir ────┤     ↓
92 Exchanges┤                          Digest ─────┘
...more ────┘   Vite + deck.gl                      Next.js + MapLibre
                + Transformers.js                   + Zustand + SWR
                + Tauri desktop                     + Gemini translation
                + 16 languages                      + 2 languages (en/zh-TW)
                + 40+ map layers                    + 4 API routes
```

---

## 8. Summary

**World Monitor** is an ambitious full-spectrum OSINT platform with 40+ layers, 60+ API endpoints, desktop support, and browser-side ML. Its breadth is impressive but comes with high complexity (Proto-first API + Redis + Service Workers + IndexedDB).

**CrisisMap** excels in simplicity and focus — 10 curated data sources, 4 APIs, zero-config startup. This architecture is easier to maintain, iterate, and understand.

**Recommended strategy**: Preserve CrisisMap's minimal philosophy. Selectively adopt high-value, low-complexity features from World Monitor (Telegram OSINT, Cloudflare Radar, expanded RSS, Cmd+K search) rather than pursuing feature parity. The goal is a sharp scalpel, not a Swiss Army knife.
