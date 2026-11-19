import { AppError, ErrorCodes } from '../errors/app-error'
import { validatePaise } from './index'

export const CANCELLATION_FEE_PER_SEAT_PAISE = 5000 // ₹50.00 in paise

export interface RefundBreakdown {
  totalPaidPaise: number
  feePaise: number
  netRefundPaise: number
  sourceRefundPaise: number
  walletRefundPaise: number
  seatCount: number
}

/**
 * Checks whether cancellation is permissible according to route policy and cutoff window in IST.
 * - Ahilyanagar -> Pune (AHM_PUN): Allowed until 20:00 IST on the day before travel date.
 * - Pune -> Ahilyanagar (PUN_AHM): Allowed until 20:00 IST on the day before travel date;
 *   additionally, cannot be cancelled on the same day if booked on that travel day.
 */
export function isCancellationAllowed(params: {
  routeId: string
  travelDate: string // YYYY-MM-DD
  bookedAtIso?: string
  now?: Date
}): { allowed: boolean; reason?: string } {
  const { routeId, travelDate, bookedAtIso, now = new Date() } = params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
    return { allowed: false, reason: 'Invalid travel date format' }
  }

  // Parse travel date in IST
  // Travel date start: YYYY-MM-DDT00:00:00+05:30
  const travelDateObj = new Date(`${travelDate}T00:00:00+05:30`)
  if (isNaN(travelDateObj.getTime())) {
    return { allowed: false, reason: 'Invalid travel date' }
  }

  // Cutoff is 20:00 IST the day BEFORE travel date
  const cutoffTime = new Date(travelDateObj.getTime() - 24 * 60 * 60 * 1000)
  cutoffTime.setHours(20, 0, 0, 0)

  // Current time check
  if (now.getTime() >= cutoffTime.getTime()) {
    return {
      allowed: false,
      reason: 'Cancellation window is closed (Cutoff is 08:00 PM the day before travel)',
    }
  }

  // Pune -> Ahilyanagar special condition: not allowed on travel day if booked on same day
  if (routeId === 'PUN_AHM' && bookedAtIso) {
    const bookedDatePart = bookedAtIso.slice(0, 10)
    if (bookedDatePart === travelDate) {
      return {
        allowed: false,
        reason: 'Pune to Ahilyanagar journeys booked on travel day cannot be cancelled',
      }
    }
  }

  return { allowed: true }
}

/**
 * Computes deterministic refund breakdown with integer paise arithmetic.
 */
export function computeRefund(params: {
  totalPaidPaise: number
  seatCount: number
  sourcePaidPaise?: number
  walletPaidPaise?: number
}): RefundBreakdown {
  const {
    totalPaidPaise,
    seatCount,
    sourcePaidPaise = 0,
    walletPaidPaise = 0,
  } = params

  validatePaise(totalPaidPaise, 'totalPaidPaise')
  validatePaise(sourcePaidPaise, 'sourcePaidPaise')
  validatePaise(walletPaidPaise, 'walletPaidPaise')

  if (!Number.isSafeInteger(seatCount) || seatCount <= 0) {
    throw new AppError(
      ErrorCodes.INVALID_INPUT,
      `Seat count must be a positive integer, got ${seatCount}`
    )
  }

  if (sourcePaidPaise + walletPaidPaise !== totalPaidPaise) {
    throw new AppError(
      ErrorCodes.AMOUNT_MISMATCH,
      `Sum of sourcePaidPaise (${sourcePaidPaise}) and walletPaidPaise (${walletPaidPaise}) must equal totalPaidPaise (${totalPaidPaise})`
    )
  }

  const feePaise = CANCELLATION_FEE_PER_SEAT_PAISE * seatCount
  const netRefundPaise = Math.max(0, totalPaidPaise - feePaise)

  // Split refund proportionally between source and wallet
  let sourceRefundPaise = 0
  let walletRefundPaise = 0

  if (totalPaidPaise > 0 && netRefundPaise > 0) {
    if (walletPaidPaise === 0) {
      sourceRefundPaise = netRefundPaise
    } else if (sourcePaidPaise === 0) {
      walletRefundPaise = netRefundPaise
    } else {
      // Proportional allocation:
      sourceRefundPaise = Math.round((sourcePaidPaise / totalPaidPaise) * netRefundPaise)
      // Balance to wallet to guarantee exact match
      walletRefundPaise = netRefundPaise - sourceRefundPaise
      if (sourceRefundPaise > sourcePaidPaise) {
        sourceRefundPaise = sourcePaidPaise
        walletRefundPaise = netRefundPaise - sourceRefundPaise
      }
    }
  }

  return {
    totalPaidPaise,
    feePaise,
    netRefundPaise,
    sourceRefundPaise,
    walletRefundPaise,
    seatCount,
  }
}
