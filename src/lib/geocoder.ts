import type { Location } from '@/types'

const LOCATIONS: Record<string, { lat: number; lng: number; country?: string }> = {
  // Iran
  'Iran': { lat: 32.43, lng: 53.69, country: 'Iran' },
  'Tehran': { lat: 35.69, lng: 51.39, country: 'Iran' },
  'Isfahan': { lat: 32.65, lng: 51.67, country: 'Iran' },
  'Natanz': { lat: 33.51, lng: 51.92, country: 'Iran' },
  'Bushehr': { lat: 28.96, lng: 50.83, country: 'Iran' },
  'Fordow': { lat: 34.88, lng: 51.59, country: 'Iran' },
  'Arak': { lat: 34.09, lng: 49.68, country: 'Iran' },
  'Bandar Abbas': { lat: 27.18, lng: 56.27, country: 'Iran' },
  'Kharg Island': { lat: 29.24, lng: 50.31, country: 'Iran' },
  'Chabahar': { lat: 25.29, lng: 60.64, country: 'Iran' },
  'Tabriz': { lat: 38.08, lng: 46.29, country: 'Iran' },
  // Strait
  'Strait of Hormuz': { lat: 26.59, lng: 56.47, country: 'Iran' },
  'Hormuz': { lat: 26.59, lng: 56.47, country: 'Iran' },
  'Persian Gulf': { lat: 26.0, lng: 52.0 },
  // Israel / Palestine
  'Israel': { lat: 31.05, lng: 34.85, country: 'Israel' },
  'Tel Aviv': { lat: 32.08, lng: 34.78, country: 'Israel' },
  'Jerusalem': { lat: 31.77, lng: 35.23, country: 'Israel' },
  'Haifa': { lat: 32.79, lng: 34.99, country: 'Israel' },
  'Gaza': { lat: 31.50, lng: 34.47, country: 'Palestine' },
  'Rafah': { lat: 31.28, lng: 34.25, country: 'Palestine' },
  'West Bank': { lat: 31.95, lng: 35.20, country: 'Palestine' },
  'Golan Heights': { lat: 33.15, lng: 35.77, country: 'Israel' },
  // Lebanon / Syria
  'Lebanon': { lat: 33.85, lng: 35.86, country: 'Lebanon' },
  'Beirut': { lat: 33.89, lng: 35.50, country: 'Lebanon' },
  'Syria': { lat: 34.80, lng: 38.99, country: 'Syria' },
  'Damascus': { lat: 33.51, lng: 36.29, country: 'Syria' },
  'Aleppo': { lat: 36.20, lng: 37.15, country: 'Syria' },
  // Iraq
  'Iraq': { lat: 33.22, lng: 43.68, country: 'Iraq' },
  'Baghdad': { lat: 33.31, lng: 44.37, country: 'Iraq' },
  'Erbil': { lat: 36.19, lng: 44.01, country: 'Iraq' },
  'Basra': { lat: 30.51, lng: 47.81, country: 'Iraq' },
  // Yemen / Red Sea
  'Yemen': { lat: 15.55, lng: 48.52, country: 'Yemen' },
  'Sanaa': { lat: 15.37, lng: 44.19, country: 'Yemen' },
  'Aden': { lat: 12.79, lng: 45.03, country: 'Yemen' },
  'Red Sea': { lat: 20.0, lng: 38.0 },
  'Bab el-Mandeb': { lat: 12.58, lng: 43.32 },
  // Saudi Arabia
  'Riyadh': { lat: 24.71, lng: 46.67, country: 'Saudi Arabia' },
  'Jeddah': { lat: 21.49, lng: 39.19, country: 'Saudi Arabia' },
  // Turkey
  'Ankara': { lat: 39.93, lng: 32.85, country: 'Turkey' },
  'Istanbul': { lat: 41.01, lng: 28.98, country: 'Turkey' },
  // Egypt
  'Cairo': { lat: 30.04, lng: 31.24, country: 'Egypt' },
  'Suez Canal': { lat: 30.46, lng: 32.35, country: 'Egypt' },
  // Russia / Ukraine
  'Ukraine': { lat: 48.38, lng: 31.17, country: 'Ukraine' },
  'Russia': { lat: 55.75, lng: 37.62, country: 'Russia' },
  'Kyiv': { lat: 50.45, lng: 30.52, country: 'Ukraine' },
  'Moscow': { lat: 55.75, lng: 37.62, country: 'Russia' },
  'Kharkiv': { lat: 49.99, lng: 36.23, country: 'Ukraine' },
  'Crimea': { lat: 44.95, lng: 34.10, country: 'Ukraine' },
  'Donbas': { lat: 48.00, lng: 38.00, country: 'Ukraine' },
  // East Asia
  'Taiwan': { lat: 23.70, lng: 120.96, country: 'Taiwan' },
  'Taipei': { lat: 25.03, lng: 121.56, country: 'Taiwan' },
  'Taiwan Strait': { lat: 24.50, lng: 119.50 },
  'Pyongyang': { lat: 39.02, lng: 125.75, country: 'North Korea' },
  'Seoul': { lat: 37.57, lng: 126.98, country: 'South Korea' },
  'Tokyo': { lat: 35.68, lng: 139.69, country: 'Japan' },
  'Beijing': { lat: 39.90, lng: 116.40, country: 'China' },
  'South China Sea': { lat: 15.0, lng: 115.0 },
  // Major capitals
  'Washington': { lat: 38.91, lng: -77.04, country: 'USA' },
  'Washington DC': { lat: 38.91, lng: -77.04, country: 'USA' },
  'London': { lat: 51.51, lng: -0.13, country: 'UK' },
  'Paris': { lat: 48.86, lng: 2.35, country: 'France' },
  'Berlin': { lat: 52.52, lng: 13.41, country: 'Germany' },
  'Brussels': { lat: 50.85, lng: 4.35, country: 'Belgium' },
  'New York': { lat: 40.71, lng: -74.01, country: 'USA' },
  // Africa
  'Sudan': { lat: 12.86, lng: 30.22, country: 'Sudan' },
  'Khartoum': { lat: 15.50, lng: 32.56, country: 'Sudan' },
  'Somalia': { lat: 5.15, lng: 46.20, country: 'Somalia' },
  'Mogadishu': { lat: 2.05, lng: 45.32, country: 'Somalia' },
  'Libya': { lat: 26.34, lng: 17.23, country: 'Libya' },
  'Ethiopia': { lat: 9.15, lng: 40.49, country: 'Ethiopia' },
  // South Asia
  'Afghanistan': { lat: 33.94, lng: 67.71, country: 'Afghanistan' },
  'Kabul': { lat: 34.53, lng: 69.17, country: 'Afghanistan' },
  'Pakistan': { lat: 30.38, lng: 69.35, country: 'Pakistan' },
  'Islamabad': { lat: 33.69, lng: 73.04, country: 'Pakistan' },
  'India': { lat: 20.59, lng: 78.96, country: 'India' },
  'New Delhi': { lat: 28.61, lng: 77.21, country: 'India' },
  'China': { lat: 35.86, lng: 104.20, country: 'China' },
  'North Korea': { lat: 40.34, lng: 127.51, country: 'North Korea' },
  'South Korea': { lat: 35.91, lng: 127.77, country: 'South Korea' },
  'Japan': { lat: 36.20, lng: 138.25, country: 'Japan' },
  // Organizations / UN
  'United Nations': { lat: 40.75, lng: -73.97, country: 'USA' },
  'NATO': { lat: 50.88, lng: 4.43, country: 'Belgium' },
  'Pentagon': { lat: 38.87, lng: -77.06, country: 'USA' },
}

// Sort by name length descending so "Tehran" matches before "Iran"
const SORTED_ENTRIES = Object.entries(LOCATIONS)
  .sort((a, b) => b[0].length - a[0].length)

export function geocode(text: string): Location | undefined {
  const normalized = text.toLowerCase()
  for (const [name, coords] of SORTED_ENTRIES) {
    if (normalized.includes(name.toLowerCase())) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        name,
        country: coords.country,
      }
    }
  }
  return undefined
}
