import type { DataSource } from '@/types'
import { usgs } from './usgs'
import { gdeltSource } from './gdelt'
import { rssSource } from './rss'
import { acledSource } from './acled'
import { polymarket } from './polymarket'
import { yahooFinance } from './yahoo-finance'
import { firmsSource } from './firms'
import { safeAirspaceSource } from './safe-airspace'
import { xGrokSource } from './x-grok'
import { digestSource } from './digest'

const publicSources: DataSource[] = [
  usgs,
  gdeltSource,
  rssSource,
  acledSource,
  polymarket,
  yahooFinance,
  firmsSource,
  safeAirspaceSource,
]

const privateSources: DataSource[] = [
  xGrokSource,
  digestSource,
]

export function getSources(): DataSource[] {
  return [...publicSources, ...privateSources]
}

export function getPublicSources(): DataSource[] {
  return publicSources
}
