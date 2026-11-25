import { getClientRtdb } from './client'
import {
  ref as clientRef,
  onValue as clientOnValue,
} from 'firebase/database'

export type SeatStatus = 'available' | 'held' | 'booked' | 'blocked'

export interface RtdbSeatState {
  status: SeatStatus
  userId?: string
  holdUntil?: number
  gender?: 'Male' | 'Female' | 'man' | 'woman'
  ticketId?: string
  ticketNo?: string
  bookingId?: string
  updatedAt: number
}

export interface RtdbTrackingState {
  tripId: string
  latitude: number
  longitude: number
  speed: number
  heading: number
  accuracy?: number
  status: 'scheduled' | 'in_transit' | 'arrived' | 'delayed'
  currentStop?: string
  nextStop?: string
  timestamp: number
  updatedAt: string
}

/**
 * Subscribes in real-time to a trip's seat state changes (Client SDK only).
 */
export function subscribeToTripSeats(
  tripId: string,
  callback: (seats: Record<string, RtdbSeatState>) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }
  try {
    const clientDb = getClientRtdb()
    const tripSeatsRef = clientRef(clientDb, `seatState/${tripId}`)
    const unsub = clientOnValue(tripSeatsRef, (snapshot) => {
      const data = snapshot.val() || {}
      callback(data as Record<string, RtdbSeatState>)
    })
    return () => unsub()
  } catch {
    return () => {}
  }
}

/**
 * Subscribes to live GPS tracking of a trip in real-time (Client SDK).
 */
export function subscribeToTracking(
  tripId: string,
  callback: (tracking: RtdbTrackingState | null) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }
  try {
    const clientDb = getClientRtdb()
    const trackRef = clientRef(clientDb, `tracking/${tripId}`)
    const unsub = clientOnValue(trackRef, (snapshot) => {
      callback(snapshot.val() as RtdbTrackingState | null)
    })
    return () => unsub()
  } catch {
    return () => {}
  }
}
