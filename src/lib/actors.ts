import type { CrisisEvent, ActorStatus } from '@/types'

const KNOWN_ACTORS: Record<string, { flag: string; role: string }> = {
  'Biden': { flag: '🇺🇸', role: 'US President' },
  'Trump': { flag: '🇺🇸', role: 'US President' },
  'Netanyahu': { flag: '🇮🇱', role: 'Israeli PM' },
  'Khamenei': { flag: '🇮🇷', role: 'Supreme Leader' },
  'IRGC': { flag: '🇮🇷', role: 'Islamic Revolutionary Guard' },
  'Raisi': { flag: '🇮🇷', role: 'Iranian President' },
  'Pezeshkian': { flag: '🇮🇷', role: 'Iranian President' },
  'Guterres': { flag: '🇺🇳', role: 'UN Secretary-General' },
  'Zelenskyy': { flag: '🇺🇦', role: 'Ukrainian President' },
  'Putin': { flag: '🇷🇺', role: 'Russian President' },
  'Xi Jinping': { flag: '🇨🇳', role: 'Chinese President' },
  'Macron': { flag: '🇫🇷', role: 'French President' },
  'Erdogan': { flag: '🇹🇷', role: 'Turkish President' },
  'MBS': { flag: '🇸🇦', role: 'Saudi Crown Prince' },
  'Hezbollah': { flag: '🇱🇧', role: 'Lebanese Militia' },
  'Hamas': { flag: '🇵🇸', role: 'Palestinian Militant Group' },
  'Houthis': { flag: '🇾🇪', role: 'Yemeni Armed Group' },
  'IDF': { flag: '🇮🇱', role: 'Israel Defense Forces' },
  'Pentagon': { flag: '🇺🇸', role: 'US Dept of Defense' },
  'NATO': { flag: '🏳️', role: 'North Atlantic Treaty Org' },
}

export function extractActors(events: CrisisEvent[]): ActorStatus[] {
  const actorMap = new Map<string, ActorStatus>()

  for (const event of events) {
    const text = `${event.title} ${event.summary}`
    for (const [name, meta] of Object.entries(KNOWN_ACTORS)) {
      if (!text.includes(name)) continue
      const existing = actorMap.get(name)
      const isStatement = event.category === 'statement'
      if (!existing) {
        actorMap.set(name, {
          name,
          flag: meta.flag,
          role: meta.role,
          lastStatement: isStatement ? event.title : undefined,
          lastStatementTime: isStatement ? event.timestamp : undefined,
          eventCount: 1,
        })
      } else {
        actorMap.set(name, {
          ...existing,
          eventCount: existing.eventCount + 1,
          lastStatement: isStatement ? event.title : existing.lastStatement,
          lastStatementTime: isStatement ? event.timestamp : existing.lastStatementTime,
        })
      }
    }
  }

  return Array.from(actorMap.values())
    .sort((a, b) => b.eventCount - a.eventCount)
}
