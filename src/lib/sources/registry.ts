import type { DataSource } from '@/types'
import { usgs } from './usgs'
import { gdeltSource } from './gdelt'
import { rssSource } from './rss'
import { acledSource } from './acled'
import { polymarket } from './polymarket'
import { yahooFinance } from './yahoo-finance'
import { xGrokSource } from './x-grok'

const publicSources: DataSource[] = [
  usgs,
  gdeltSource,
  rssSource,
  acledSource,
  polymarket,
  yahooFinance,
]

const privateSources: DataSource[] = [
  xGrokSource,
]

export function getSources(): DataSource[] {
  return [...publicSources, ...privateSources]
}

export function getPublicSources(): DataSource[] {
  return publicSources
}
