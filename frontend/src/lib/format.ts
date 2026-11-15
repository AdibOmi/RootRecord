/** Display formatting for Bangladesh: BDT, Asia/Dhaka, DD/MM/YYYY, 12-hour time. */

export const CLINIC_TIME_ZONE = 'Asia/Dhaka'

// en-IN gives South Asian lakh grouping (1,23,456), the convention in Bangladesh.
const wholeFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const fractionFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Format an amount stored in minor units (1/100 BDT) as "৳ 1,500" or "৳ 1,500.50". */
export function formatBDT(minor: number): string {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  const formatter = abs % 100 === 0 ? wholeFormatter : fractionFormatter
  return `${sign}৳ ${formatter.format(abs / 100)}`
}

/** Convert a taka amount typed by a user into integer minor units. */
export function takaToMinor(taka: number): number {
  return Math.round(taka * 100)
}

/** A typed taka amount ("1,500" or "1500.50") → minor units; null when blank or invalid. */
export function parseTaka(text: string): number | null {
  const cleaned = text.replace(/[,\s৳]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return takaToMinor(Number(cleaned))
}

/** Minor units → plain taka for an input box ("1500", "1500.5"). */
export function minorToTakaInput(minor: number | null): string {
  return minor == null ? '' : String(minor / 100)
}

/** "48291736" → "4829-1736", the way staff write it on the prescription. */
export function formatPatientCode(code: string): string {
  return /^\d{8}$/.test(code) ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

function parts(value: Date | string, options: Intl.DateTimeFormatOptions) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIME_ZONE, ...options })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value
      return acc
    }, {})
}

/** "25/09/2026" in clinic time. */
export function formatDate(value: Date | string): string {
  const p = parts(value, { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${p.day}/${p.month}/${p.year}`
}

/** "3:30 PM" in clinic time. */
export function formatTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/** "25/09/2026, 3:30 PM" in clinic time. */
export function formatDateTime(value: Date | string): string {
  return `${formatDate(value)}, ${formatTime(value)}`
}

/** "Friday, 25 September 2026" in clinic time. */
export function formatLongDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Current hour (0–23) at the clinic. */
export function clinicHour(now: Date = new Date()): number {
  return Number(parts(now, { hour: '2-digit', hourCycle: 'h23' }).hour)
}

/** "2026-10-08" (a calendar date, no time zone) → "08/10/2026". */
export function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}
