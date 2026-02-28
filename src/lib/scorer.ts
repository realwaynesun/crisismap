import type { ThreatLevel, EventCategory } from '@/types'

const CRITICAL_KEYWORDS = [
  'nuclear', 'airstrike', 'invasion', 'war declared', 'missile launch',
  'chemical weapon', 'biological weapon', 'nuke', 'wmd',
]

const HIGH_KEYWORDS = [
  'strike', 'attack', 'casualties', 'killed', 'bombing', 'explosion',
  'military operation', 'retaliation', 'troops deployed', 'sanctions',
  'blockade', 'no-fly zone', 'martial law',
]

const MEDIUM_KEYWORDS = [
  'tensions', 'escalation', 'threat', 'warning', 'mobilization',
  'protest', 'embargo', 'diplomatic crisis', 'cyber attack',
  'oil price', 'market crash',
]

const CATEGORY_BOOST: Partial<Record<EventCategory, number>> = {
  conflict: 2,
  military: 2,
  terrorism: 2,
  disaster: 1,
  statement: 0,
  diplomatic: 0,
  economic: 0,
  prediction: -1,
}

export function scoreThreatLevel(
  title: string,
  summary: string,
  category: EventCategory,
): ThreatLevel {
  const text = `${title} ${summary}`.toLowerCase()
  let score = CATEGORY_BOOST[category] ?? 0

  for (const kw of CRITICAL_KEYWORDS) {
    if (text.includes(kw)) return 'critical'
  }
  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) score += 2
  }
  for (const kw of MEDIUM_KEYWORDS) {
    if (text.includes(kw)) score += 1
  }

  if (score >= 4) return 'high'
  if (score >= 2) return 'medium'
  if (score >= 1) return 'low'
  return 'info'
}
