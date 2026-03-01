export function formatEventTime(
  date: Date | string,
  timezone: string,
  locale: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const dateLocale = locale === 'zh-TW' ? 'zh-TW' : 'en-US'
  try {
    return d.toLocaleString(dateLocale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ')
  }
}

export function getTimezoneOffsetLabel(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    return offset.replace('GMT', 'UTC')
  } catch {
    return timezone
  }
}
