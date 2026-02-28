export type Locale = 'en' | 'zh-TW'

export const locales: Locale[] = ['en', 'zh-TW']
export const defaultLocale: Locale = 'en'

export const localeConfig: Record<Locale, { timezone: string; dateLocale: string }> = {
  en: { timezone: 'UTC', dateLocale: 'en-US' },
  'zh-TW': { timezone: 'Asia/Taipei', dateLocale: 'zh-TW' },
}

const en = {
  meta: {
    title: 'CrisisMap \u2014 Real-Time Geopolitical Intelligence',
    description: 'Live geopolitical crisis tracking with multi-source intelligence',
  },
  header: { title: '\u2295 CrisisMap', live: '\u26A1 Live' },
  tabs: { feed: 'Feed', timeline: 'Timeline', intel: 'Intel' },
  filters: { search: 'Search events...' },
  regions: {
    all: 'All', 'middle-east': 'Middle East', europe: 'Europe',
    'east-asia': 'East Asia', africa: 'Africa', americas: 'Americas',
  } as Record<string, string>,
  categories: {
    conflict: 'conflict', military: 'military', diplomatic: 'diplomatic',
    economic: 'economic', terrorism: 'terrorism', disaster: 'disaster',
    earthquake: 'earthquake', statement: 'statement', prediction: 'prediction',
  } as Record<string, string>,
  levels: {
    critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info',
  } as Record<string, string>,
  feed: { error: 'Failed to load events', empty: 'No events match current filters' },
  timeline: { error: 'Failed to load events', empty: 'No events to display' },
  actors: {
    loading: 'Loading actors...',
    error: 'Failed to load actors',
    empty: 'No actor data available',
    noStatements: 'No recent statements',
  },
  markets: { loading: 'Loading markets...', error: 'Market data unavailable' },
  polymarket: { loading: 'Loading prediction markets...', error: 'Prediction markets unavailable' },
  map: { readArticle: 'Read article' },
  time: { now: 'now', mAgo: '{n}m ago', hAgo: '{n}h ago', dAgo: '{n}d ago' },
}

const zhTW: typeof en = {
  meta: {
    title: 'CrisisMap \u2014 \u5373\u6642\u5730\u7DE3\u653F\u6CBB\u60C5\u5831',
    description: '\u591A\u4F86\u6E90\u5373\u6642\u5730\u7DE3\u653F\u6CBB\u5371\u6A5F\u8FFD\u8E64',
  },
  header: { title: '\u2295 CrisisMap', live: '\u26A1 \u5373\u6642' },
  tabs: { feed: '\u52D5\u614B', timeline: '\u6642\u9593\u7DDA', intel: '\u60C5\u5831' },
  filters: { search: '\u641C\u5C0B\u4E8B\u4EF6...' },
  regions: {
    all: '\u5168\u90E8', 'middle-east': '\u4E2D\u6771', europe: '\u6B50\u6D32',
    'east-asia': '\u6771\u4E9E', africa: '\u975E\u6D32', americas: '\u7F8E\u6D32',
  },
  categories: {
    conflict: '\u885D\u7A81', military: '\u8ECD\u4E8B', diplomatic: '\u5916\u4EA4',
    economic: '\u7D93\u6FDF', terrorism: '\u6050\u600E\u653B\u64CA', disaster: '\u707D\u5BB3',
    earthquake: '\u5730\u9707', statement: '\u8072\u660E', prediction: '\u9810\u6E2C',
  },
  levels: {
    critical: '\u5371\u6025', high: '\u9AD8', medium: '\u4E2D', low: '\u4F4E', info: '\u8CC7\u8A0A',
  },
  feed: { error: '\u4E8B\u4EF6\u8F09\u5165\u5931\u6557', empty: '\u6C92\u6709\u7B26\u5408\u7BE9\u9078\u689D\u4EF6\u7684\u4E8B\u4EF6' },
  timeline: { error: '\u4E8B\u4EF6\u8F09\u5165\u5931\u6557', empty: '\u66AB\u7121\u4E8B\u4EF6' },
  actors: {
    loading: '\u8F09\u5165\u4E2D...',
    error: '\u8F09\u5165\u5931\u6557',
    empty: '\u66AB\u7121\u4EBA\u7269\u8CC7\u6599',
    noStatements: '\u5C1A\u7121\u8FD1\u671F\u767C\u8A00',
  },
  markets: { loading: '\u8F09\u5165\u5E02\u5834\u8CC7\u6599...', error: '\u5E02\u5834\u8CC7\u6599\u7121\u6CD5\u53D6\u5F97' },
  polymarket: { loading: '\u8F09\u5165\u9810\u6E2C\u5E02\u5834...', error: '\u9810\u6E2C\u5E02\u5834\u7121\u6CD5\u53D6\u5F97' },
  map: { readArticle: '\u95B1\u8B80\u5168\u6587' },
  time: { now: '\u525B\u525B', mAgo: '{n}\u5206\u9418\u524D', hAgo: '{n}\u5C0F\u6642\u524D', dAgo: '{n}\u5929\u524D' },
}

export type Dict = typeof en

export const dictionaries: Record<Locale, Dict> = { en, 'zh-TW': zhTW }

export function getDict(locale: Locale): Dict {
  return dictionaries[locale] ?? dictionaries.en
}
