import type { DataSource } from '@/types'
import { usgs } from './usgs'
import { gdeltSource } from './gdelt'
import { rssSource } from './rss'
import { acledSource } from './acled'
import { polymarket } from './polymarket'
import { yahooFinance } from './yahoo-finance'

const publicSources: DataSource[] = [
  usgs,
  gdeltSource,
  rssSource,
  acledSource,
  polymarket,
  yahooFinance,
]

async function loadPrivateSources(): Promise<DataSource[]> {
  try {
    const path = ['..', '..', '..', 'private', 'sources', 'index.js'].join('/')
    const m = await import(/* webpackIgnore: true */ path)
    return m.sources ?? []
  } catch {
    return []
  }
}

let allSources: DataSource[] | null = null

export async function getSources(): Promise<DataSource[]> {
  if (allSources) return allSources
  const privateSources = await loadPrivateSources()
  allSources = [...publicSources, ...privateSources]
  return allSources
}

export function getPublicSources(): DataSource[] {
  return publicSources
}
