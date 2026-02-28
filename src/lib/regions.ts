export type Region = 'all' | 'middle-east' | 'europe' | 'east-asia' | 'africa' | 'americas'

export const regions: Region[] = ['all', 'middle-east', 'europe', 'east-asia', 'africa', 'americas']

const REGION_KEYWORDS: Record<Exclude<Region, 'all'>, string[]> = {
  'middle-east': [
    'iran', 'israel', 'palestine', 'gaza', 'west bank', 'lebanon', 'syria',
    'iraq', 'yemen', 'saudi', 'turkey', 'egypt', 'jordan', 'kuwait', 'uae',
    'bahrain', 'qatar', 'oman', 'tehran', 'isfahan', 'natanz', 'bushehr',
    'tel aviv', 'jerusalem', 'beirut', 'damascus', 'baghdad', 'riyadh',
    'hormuz', 'persian gulf', 'red sea', 'hezbollah', 'houthi', 'irgc',
    'netanyahu', 'khamenei', 'idf', 'middle east', 'mideast', 'suez',
    'golan', 'rafah', 'erbil', 'basra', 'sanaa', 'aden', 'ankara',
    'istanbul', 'cairo', 'fordow', 'arak', 'nuclear',
  ],
  'europe': [
    'ukraine', 'russia', 'kyiv', 'moscow', 'kharkiv', 'crimea', 'donbas',
    'nato', 'london', 'paris', 'berlin', 'brussels', 'uk', 'france',
    'germany', 'poland', 'romania', 'baltic', 'finland', 'sweden',
    'norway', 'europe', 'european',
  ],
  'east-asia': [
    'taiwan', 'china', 'beijing', 'taipei', 'north korea', 'south korea',
    'pyongyang', 'seoul', 'japan', 'tokyo', 'south china sea',
    'taiwan strait', 'okinawa', 'pacific',
  ],
  'africa': [
    'sudan', 'khartoum', 'somalia', 'mogadishu', 'libya', 'ethiopia',
    'nigeria', 'congo', 'sahel', 'mali', 'niger', 'chad', 'burkina',
    'mozambique', 'africa',
  ],
  'americas': [
    'washington', 'pentagon', 'new york', 'united states', 'usa',
    'mexico', 'venezuela', 'colombia', 'brazil', 'canada',
  ],
}

export function matchesRegion(region: Region, text: string, country?: string): boolean {
  if (region === 'all') return true
  const keywords = REGION_KEYWORDS[region]
  const lower = text.toLowerCase()
  const countryLower = country?.toLowerCase() ?? ''
  return keywords.some((kw) => lower.includes(kw) || countryLower.includes(kw))
}
