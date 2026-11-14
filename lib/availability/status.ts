import { ALMOST_FULL_MAX, CLOSE_BEFORE_DEPARTURE_MIN } from '../config/rules'

export type AvailabilityStatus = 'closed' | 'sold-out' | 'almost-full' | 'available'

export interface ComputeStatusParams {
  seatsLeft: number
  departure: Date | string
  now?: Date
}

/**
 * Pure function to compute trip booking availability status based on business rules.
 * Status is dynamic and NEVER persisted in Firestore.
 *
 * Rules:
 * - 'closed': now >= departure - 60min (including already departed)
 * - 'sold-out': seatsLeft <= 0
 * - 'almost-full': 1 <= seatsLeft <= 10
 * - 'available': seatsLeft > 10
 */
export function computeStatus({
  seatsLeft,
  departure,
  now = new Date(),
}: ComputeStatusParams): AvailabilityStatus {
  const depTime = typeof departure === 'string' ? new Date(departure).getTime() : departure.getTime()
  const nowTime = now.getTime()

  const closeThresholdMs = CLOSE_BEFORE_DEPARTURE_MIN * 60 * 1000

  if (nowTime >= depTime - closeThresholdMs) {
    return 'closed'
  }

  if (seatsLeft <= 0) {
    return 'sold-out'
  }

  if (seatsLeft <= ALMOST_FULL_MAX) {
    return 'almost-full'
  }

  return 'available'
}
