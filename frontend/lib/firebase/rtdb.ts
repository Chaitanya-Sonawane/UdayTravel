import { getClientRtdb } from './client'
import { getAdminRtdb } from './admin'
import { ref as clientRef, set as clientSet, get as clientGet, onValue as clientOnValue, runTransaction as clientRunTransaction, off as clientOff } from 'firebase/database'

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

const DEFAULT_HOLD_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Server/Client helper to atomically hold a seat in RTDB.
 * Prevents race conditions: if another user holds the seat before expiry, it fails.
 */
export async function holdSeatInRtdb(params: {
  tripId: string
  seatId: string
  userId: string
  gender?: 'Male' | 'Female' | 'man' | 'woman'
  holdTtlMs?: number
}): Promise<{ success: boolean; seat?: RtdbSeatState; reason?: string }> {
  const { tripId, seatId, userId, gender, holdTtlMs = DEFAULT_HOLD_TTL_MS } = params
  const now = Date.now()
  const holdUntil = now + holdTtlMs

  try {
    // 1. Try Admin RTDB first (for server contexts)
    const adminDb = getAdminRtdb()
    const seatRef = adminDb.ref(`seatState/${tripId}/${seatId}`)

    const result = await seatRef.transaction((current: RtdbSeatState | null) => {
      if (!current || current.status === 'available') {
        return {
          status: 'held',
          userId,
          gender: gender || 'Male',
          holdUntil,
          updatedAt: now,
        }
      }

      // If held, check if hold expired or held by same user
      if (current.status === 'held') {
        const isExpired = current.holdUntil && current.holdUntil <= now
        const isSameUser = current.userId === userId
        if (isExpired || isSameUser) {
          return {
            status: 'held',
            userId,
            gender: gender || current.gender || 'Male',
            holdUntil,
            updatedAt: now,
          }
        }
        // Valid active hold by another user -> abort transaction
        return undefined
      }

      // If booked or blocked -> abort
      return undefined
    })

    if (!result.committed) {
      return { success: false, reason: 'SEAT_ALREADY_RESERVED' }
    }

    const snap = result.snapshot
    const val = typeof snap.val === 'function' ? snap.val() : snap
    return { success: true, seat: val as RtdbSeatState }
  } catch (err) {
    console.warn('[RTDB holdSeat] Server transaction failed, trying client SDK:', err)
    // 2. Fallback to Client RTDB (browser context)
    try {
      const clientDb = getClientRtdb()
      const sRef = clientRef(clientDb, `seatState/${tripId}/${seatId}`)
      const res = await clientRunTransaction(sRef, (current: RtdbSeatState | null) => {
        if (!current || current.status === 'available') {
          return {
            status: 'held',
            userId,
            gender: gender || 'Male',
            holdUntil,
            updatedAt: now,
          }
        }
        if (current.status === 'held') {
          const isExpired = current.holdUntil && current.holdUntil <= now
          const isSameUser = current.userId === userId
          if (isExpired || isSameUser) {
            return {
              status: 'held',
              userId,
              gender: gender || current.gender || 'Male',
              holdUntil,
              updatedAt: now,
            }
          }
        }
        return undefined
      })

      if (!res.committed) {
        return { success: false, reason: 'SEAT_ALREADY_RESERVED' }
      }
      return { success: true, seat: res.snapshot.val() }
    } catch (clientErr: any) {
      return { success: false, reason: clientErr.message || 'TRANSACTION_FAILED' }
    }
  }
}

/**
 * Releases a hold on a seat in RTDB if owned by the user.
 */
export async function releaseSeatInRtdb(params: {
  tripId: string
  seatId: string
  userId: string
}): Promise<boolean> {
  const { tripId, seatId, userId } = params
  try {
    const adminDb = getAdminRtdb()
    const seatRef = adminDb.ref(`seatState/${tripId}/${seatId}`)
    await seatRef.transaction((current: RtdbSeatState | null) => {
      if (current && current.status === 'held' && current.userId === userId) {
        return {
          status: 'available',
          updatedAt: Date.now(),
        }
      }
      return current
    })
    return true
  } catch {
    try {
      const clientDb = getClientRtdb()
      const sRef = clientRef(clientDb, `seatState/${tripId}/${seatId}`)
      await clientRunTransaction(sRef, (current: RtdbSeatState | null) => {
        if (current && current.status === 'held' && current.userId === userId) {
          return {
            status: 'available',
            updatedAt: Date.now(),
          }
        }
        return current
      })
      return true
    } catch {
      return false
    }
  }
}

/**
 * Transition held seats to permanently 'booked' status upon successful payment verification.
 */
export async function bookSeatsInRtdb(params: {
  tripId: string
  seatIds: string[]
  userId: string
  ticketId: string
  ticketNo?: string
  bookingId?: string
}): Promise<boolean> {
  const { tripId, seatIds, userId, ticketId, ticketNo, bookingId } = params
  const now = Date.now()

  try {
    const adminDb = getAdminRtdb()
    const updates: Record<string, RtdbSeatState> = {}

    for (const seatId of seatIds) {
      updates[`seatState/${tripId}/${seatId}`] = {
        status: 'booked',
        userId,
        ticketId,
        ticketNo: ticketNo || ticketId,
        bookingId: bookingId || '',
        updatedAt: now,
      }
    }

    await adminDb.ref().update(updates)
    return true
  } catch (err) {
    console.warn('[RTDB bookSeats] Server update failed, falling back to client:', err)
    try {
      const clientDb = getClientRtdb()
      for (const seatId of seatIds) {
        const sRef = clientRef(clientDb, `seatState/${tripId}/${seatId}`)
        await clientSet(sRef, {
          status: 'booked',
          userId,
          ticketId,
          ticketNo: ticketNo || ticketId,
          bookingId: bookingId || '',
          updatedAt: now,
        })
      }
      return true
    } catch {
      return false
    }
  }
}

/**
 * Retrieves the complete seat state map for a given trip from RTDB.
 */
export async function getTripSeatsFromRtdb(tripId: string): Promise<Record<string, RtdbSeatState>> {
  try {
    const adminDb = getAdminRtdb()
    const snap = await adminDb.ref(`seatState/${tripId}`).get()
    const data = typeof snap.val === 'function' ? snap.val() : snap
    return (data as Record<string, RtdbSeatState>) || {}
  } catch {
    try {
      const clientDb = getClientRtdb()
      const sRef = clientRef(clientDb, `seatState/${tripId}`)
      const snap = await clientGet(sRef)
      return (snap.val() as Record<string, RtdbSeatState>) || {}
    } catch {
      return {}
    }
  }
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
  } catch (err) {
    console.warn('[subscribeToTripSeats] Real-time subscription error:', err)
    return () => {}
  }
}

/**
 * Updates vehicle live GPS location in RTDB.
 */
export async function updateTrackingInRtdb(
  tripId: string,
  data: Partial<RtdbTrackingState>
): Promise<boolean> {
  const now = Date.now()
  const payload: RtdbTrackingState = {
    tripId,
    latitude: data.latitude || 19.0948,
    longitude: data.longitude || 74.7480,
    speed: data.speed || 0,
    heading: data.heading || 0,
    accuracy: data.accuracy || 5,
    status: data.status || 'in_transit',
    currentStop: data.currentStop,
    nextStop: data.nextStop,
    timestamp: now,
    updatedAt: new Date(now).toISOString(),
  }

  try {
    const adminDb = getAdminRtdb()
    await adminDb.ref(`tracking/${tripId}`).set(payload)
    return true
  } catch {
    try {
      const clientDb = getClientRtdb()
      const trackRef = clientRef(clientDb, `tracking/${tripId}`)
      await clientSet(trackRef, payload)
      return true
    } catch {
      return false
    }
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
