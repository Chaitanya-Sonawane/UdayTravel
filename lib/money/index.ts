import { AppError, ErrorCodes } from '../errors/app-error'

/**
 * Validates that the input is a non-negative safe integer representing money in paise.
 */
export function validatePaise(paise: unknown, label = 'Amount'): number {
  if (typeof paise !== 'number') {
    throw new AppError(
      ErrorCodes.INVALID_INPUT,
      `${label} must be a valid number, got ${typeof paise}`
    )
  }
  if (!Number.isSafeInteger(paise)) {
    throw new AppError(
      ErrorCodes.INVALID_INPUT,
      `${label} must be a safe integer paise value, got ${paise}`
    )
  }
  if (paise < 0) {
    throw new AppError(
      ErrorCodes.INVALID_INPUT,
      `${label} cannot be negative, got ${paise}`
    )
  }
  return paise
}

/**
 * Converts whole or decimal rupees to integer paise.
 * Uses exact Math.round to prevent floating-point representation anomalies.
 */
export function rupeesToPaise(rupees: number): number {
  if (typeof rupees !== 'number' || isNaN(rupees) || rupees < 0) {
    throw new AppError(
      ErrorCodes.INVALID_INPUT,
      `Rupee value must be a non-negative number, got ${rupees}`
    )
  }
  const paise = Math.round(rupees * 100)
  return validatePaise(paise, 'Converted paise')
}

/**
 * Converts integer paise to formatted Indian Rupee string (e.g. "₹200" or "₹200.50").
 */
export function paiseToRupeesDisplay(paise: number): string {
  validatePaise(paise)
  const rupees = Math.floor(paise / 100)
  const remPaise = paise % 100
  if (remPaise === 0) {
    return `₹${rupees}`
  }
  return `₹${rupees}.${String(remPaise).padStart(2, '0')}`
}

/**
 * Computes authoritative server booking total in integer paise.
 */
export function computeBookingTotal(perSeatPaise: number, seatCount: number): number {
  validatePaise(perSeatPaise, 'perSeatPaise')
  if (!Number.isSafeInteger(seatCount) || seatCount <= 0) {
    throw new AppError(
      ErrorCodes.INVALID_INPUT,
      `Seat count must be a positive integer, got ${seatCount}`
    )
  }
  const total = perSeatPaise * seatCount
  return validatePaise(total, 'Total booking paise')
}

export interface SplitPaymentResult {
  totalPaise: number
  walletDebitPaise: number
  razorpayPaise: number
}

/**
 * Authoritatively splits booking total between user's available wallet balance and Razorpay.
 * Never allows client-dictated splits.
 */
export function splitPayment(totalPaise: number, availableWalletPaise: number): SplitPaymentResult {
  validatePaise(totalPaise, 'totalPaise')
  validatePaise(availableWalletPaise, 'availableWalletPaise')

  const walletDebitPaise = Math.min(totalPaise, availableWalletPaise)
  const razorpayPaise = totalPaise - walletDebitPaise

  return {
    totalPaise,
    walletDebitPaise,
    razorpayPaise,
  }
}
