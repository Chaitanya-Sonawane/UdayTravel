/**
 * Shared Date/Time & Cancellation Timeline Utilities for Uday Travels.
 *
 * Core rule: All formatting is strictly evaluated in Asia/Kolkata (IST).
 * Ensures identical timings across ticket details, cancellation modal/screen,
 * notifications (SMS & Email), and API responses.
 */

export const TIMEZONE_IST = 'Asia/Kolkata'
export const CANCELLATION_CUTOFF_HOURS = 2

/**
 * Formats a YYYY-MM-DD string or Date into "Weekday, DD Mon YYYY" in IST.
 * e.g. "2026-11-21" -> "Saturday, 21 Nov 2026" (or "Friday, 20 Nov 2026")
 */
export function formatDateWithDay(dateInput: string | Date): string {
  let d: Date
  if (typeof dateInput === 'string') {
    const cleanDate = dateInput.trim().slice(0, 10)
    d = new Date(`${cleanDate}T12:00:00+05:30`)
  } else {
    d = dateInput
  }

  const dtf = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE_IST,
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return dtf.format(d)
}

/**
 * Formats a 24-hour time string ("06:30", "18:45", "22:30:00") or Date
 * into 12-hour format with AM/PM in IST.
 * e.g. "06:30" -> "06:30 AM", "22:30" -> "10:30 PM"
 */
export function formatTime12h(timeInput: string | Date, referenceDate?: string): string {
  if (timeInput instanceof Date) {
    const ttf = new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE_IST,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    return ttf.format(timeInput).toUpperCase()
  }

  const clean = timeInput.trim()
  if (!clean) return '12:00 AM'

  // If already contains AM/PM
  if (/am|pm/i.test(clean)) {
    return clean.toUpperCase()
  }

  const parts = clean.split(':')
  const hours = parseInt(parts[0] || '0', 10)
  const minutes = parseInt(parts[1] || '0', 10)

  const refDate = referenceDate || '2026-01-01'
  const iso = `${refDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:30`
  const d = new Date(iso)

  const ttf = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE_IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return ttf.format(d).toUpperCase()
}

/**
 * Combines a travel date and departure time into "Weekday, DD Mon YYYY, HH:MM AM/PM" in IST.
 * e.g. ("2026-11-20", "22:30") -> "Friday, 20 Nov 2026, 10:30 PM"
 */
export function formatDateTimeCombined(travelDate: string, departureTime: string): string {
  const dateFormatted = formatDateWithDay(travelDate)
  const timeFormatted = formatTime12h(departureTime, travelDate)
  return `${dateFormatted}, ${timeFormatted}`
}

/**
 * Constructs the exact departure instant in IST.
 */
export function parseDepartureInstantIST(travelDate: string, departureTime: string): Date {
  const isPm = /pm/i.test(departureTime)
  const isAm = /am/i.test(departureTime)
  const numericOnly = departureTime.replace(/[^0-9:]/g, '').trim()

  const cleanTime = numericOnly.includes(':')
    ? numericOnly
    : `${numericOnly.slice(0, 2)}:${numericOnly.slice(2, 4)}`

  const [rawHh, rawMm] = cleanTime.split(':')
  let hours = parseInt(rawHh || '6', 10)
  const minutes = parseInt(rawMm || '0', 10)

  if (isPm && hours < 12) {
    hours += 12
  } else if (isAm && hours === 12) {
    hours = 0
  }

  const paddedHh = String(hours).padStart(2, '0')
  const paddedMm = String(minutes).padStart(2, '0')

  return new Date(`${travelDate}T${paddedHh}:${paddedMm}:00+05:30`)
}

export interface CancellationTimeline {
  departureDate: Date
  cutoffDate: Date
  departureTime12h: string
  cutoffTime12h: string
  allowedUntilFormatted: string
  isClosed: boolean
  isUnderOneHourAfterCutoff: boolean
  secondsLeft: number
  countdownText: string
}

/**
 * Calculates live cancellation timeline and countdown in IST.
 * Cutoff = departure - cutoffHours (default 2 hours).
 */
export function calculateCancellationTimeline(params: {
  travelDate: string
  departureTime: string
  cutoffHours?: number
  now?: Date
}): CancellationTimeline {
  const {
    travelDate,
    departureTime,
    cutoffHours = CANCELLATION_CUTOFF_HOURS,
    now = new Date(),
  } = params

  const departureDate = parseDepartureInstantIST(travelDate, departureTime)
  const cutoffMillis = departureDate.getTime() - cutoffHours * 60 * 60 * 1000
  const cutoffDate = new Date(cutoffMillis)

  const millisLeft = cutoffMillis - now.getTime()
  const secondsLeft = Math.max(0, Math.floor(millisLeft / 1000))
  const isClosed = millisLeft <= 0

  // Warning state if window is closed or departure is under 1 hour after cutoff
  const millisPastCutoff = now.getTime() - cutoffMillis
  const isUnderOneHourAfterCutoff = isClosed || (millisPastCutoff >= 0 && millisPastCutoff <= 60 * 60 * 1000)

  const departureTime12h = formatTime12h(departureDate)
  const cutoffTime12h = formatTime12h(cutoffDate)
  const allowedUntilFormatted = `${cutoffTime12h}, ${formatDateWithDay(cutoffDate)}`

  let countdownText = ''
  if (isClosed) {
    countdownText = `Cancellation closed. Bus departs at ${departureTime12h}`
  } else {
    const hours = Math.floor(secondsLeft / 3600)
    const minutes = Math.floor((secondsLeft % 3600) / 60)
    const seconds = secondsLeft % 60
    countdownText = `Time left to cancel: ${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }

  return {
    departureDate,
    cutoffDate,
    departureTime12h,
    cutoffTime12h,
    allowedUntilFormatted,
    isClosed,
    isUnderOneHourAfterCutoff,
    secondsLeft,
    countdownText,
  }
}

export interface RefundSplit2575 {
  totalPaidPaise: number
  sourceRefundPaise: number
  walletCreditPaise: number
  totalPaidFormatted: string
  sourceRefundFormatted: string
  walletCreditFormatted: string
}

/**
 * Computes 25% original payment method refund & 75% Uday Travels wallet store credit.
 */
export function compute2575Refund(totalPaidPaise: number): RefundSplit2575 {
  const sourceRefundPaise = Math.round(totalPaidPaise * 0.25)
  const walletCreditPaise = Math.max(0, totalPaidPaise - sourceRefundPaise)

  return {
    totalPaidPaise,
    sourceRefundPaise,
    walletCreditPaise,
    totalPaidFormatted: `₹${(totalPaidPaise / 100).toFixed(2)}`,
    sourceRefundFormatted: `₹${(sourceRefundPaise / 100).toFixed(2)}`,
    walletCreditFormatted: `₹${(walletCreditPaise / 100).toFixed(2)}`,
  }
}
