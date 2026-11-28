import { BOOKING_WINDOW_DAYS, TZ } from '../config/rules'

/**
 * Returns today's date in YYYY-MM-DD format strictly in Asia/Kolkata (IST).
 * Never relies on local machine/device timezone.
 */
export function todayIST(now: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = dtf.formatToParts(now)
  const year = parts.find((p) => p.type === 'year')?.value ?? ''
  const month = parts.find((p) => p.type === 'month')?.value ?? ''
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  return `${year}-${month}-${day}`
}

/**
 * Returns the YYYY-MM-DD date shifted by N days ahead or behind.
 */
export function getNextDate(dateStr: string, daysAhead = 1): string {
  const parts = dateStr.split('-').map(Number)
  const y = parts[0] ?? 2026
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const dt = new Date(Date.UTC(y, m - 1, d + daysAhead))
  return dt.toISOString().slice(0, 10)
}

/**
 * Checks whether a given YYYY-MM-DD date falls within the booking window [today, today + BOOKING_WINDOW_DAYS].
 * All comparisons are evaluated in IST.
 */
export function isDateInWindow(
  date: string,
  referenceTodayIST: string = todayIST(),
  maxWindowDays: number = BOOKING_WINDOW_DAYS
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false
  }

  const [refY, refM, refD] = referenceTodayIST.split('-').map(Number)
  const [targetY, targetM, targetD] = date.split('-').map(Number)

  if (!refY || !refM || !refD || !targetY || !targetM || !targetD) {
    return false
  }

  const refUtc = Date.UTC(refY, refM - 1, refD)
  const targetUtc = Date.UTC(targetY, targetM - 1, targetD)

  const diffDays = Math.round((targetUtc - refUtc) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= maxWindowDays
}

/**
 * Constructs a Date object representing the exact departure instant in IST (+05:30).
 * Accepts time as HH:mm ("06:00") or HHmm ("0600").
 */
export function departureInstant(date: string, time: string): Date {
  const cleanTime = time.includes(':')
    ? time
    : `${time.slice(0, 2)}:${time.slice(2, 4)}`

  const [hh, mm] = cleanTime.split(':')
  const paddedHh = hh?.padStart(2, '0') ?? '00'
  const paddedMm = mm?.padStart(2, '0') ?? '00'

  // IST is fixed at UTC+05:30 with no daylight saving time
  const isoString = `${date}T${paddedHh}:${paddedMm}:00+05:30`
  return new Date(isoString)
}

/**
 * Formats a Date instant into an ISO string with +05:30 offset representation.
 */
export function toISTIsoString(date: Date): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = dtf.formatToParts(date)
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const second = parts.find((p) => p.type === 'second')?.value ?? '00'

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`
}

/**
 * Returns formatted weekday and date label in IST, e.g. "Sat, 14 Nov".
 */
export function weekdayLabel(date: string): string {
  const instant = departureInstant(date, '12:00')
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const parts = dtf.formatToParts(instant)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  const month = parts.find((p) => p.type === 'month')?.value ?? ''

  return `${weekday}, ${day} ${month}`
}

/**
 * Formats an instant into HH:mm in IST.
 */
export function formatTimeIST(date: Date): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = dtf.formatToParts(date)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}
