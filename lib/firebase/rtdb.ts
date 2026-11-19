import { getClientRtdb } from './client'
import {
  ref as clientRef,
  set as clientSet,
  get as clientGet,
  runTransaction as clientRunTransaction,
} from 'firebase/database'

export * from './rtdb-client'
import type { RtdbSeatState, RtdbTrackingState } from './rtdb-client'

function getAdminRtdbSafe() {
  if (typeof window !== 'undefined') return null
  try {
    const { getAdminRtdb } = require('./admin')
    return getAdminRtdb()
  } catch {
    return null
  }
}

const DEFAULT_HOLD_TTL_MS = 10 * 60 * 1000 // 10 minutes

const withRtdbTimeout = <T>(promise: Promise<T>, ms = 1500): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('RTDB operation timed out')), ms)
    ),
  ])

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
    const adminDb = getAdminRtdbSafe()
    if (adminDb) {
      const seatRef = adminDb.ref(`seatState/${tripId}/${seatId}`)

      const result: any = await withRtdbTimeout(
        seatRef.transaction((current: RtdbSeatState | null) => {
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
        }),
        1000
      )

      if (!result.committed) {
        return { success: false, reason: 'SEAT_ALREADY_RESERVED' }
      }

      const snap = result.snapshot
      const val = typeof snap.val === 'function' ? snap.val() : snap
      return { success: true, seat: val as RtdbSeatState }
    }
  } catch (err) {
    console.warn('[RTDB holdSeat] Server transaction failed, trying client SDK:', err)
  }

  // 2. Fallback to Client RTDB (browser context)
  try {
    const clientDb = getClientRtdb()
    const sRef = clientRef(clientDb, `seatState/${tripId}/${seatId}`)
    const res: any = await withRtdbTimeout(
      clientRunTransaction(sRef, (current: RtdbSeatState | null) => {
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
      }),
      1000
    )

    if (!res.committed) {
      return { success: false, reason: 'SEAT_ALREADY_RESERVED' }
    }
    return { success: true, seat: res.snapshot.val() }
  } catch (clientErr: any) {
    return { success: false, reason: clientErr.message || 'TRANSACTION_FAILED' }
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
  const now = Date.now()

  try {
    const adminDb = getAdminRtdbSafe()
    if (adminDb) {
      const seatRef = adminDb.ref(`seatState/${tripId}/${seatId}`)
      const res = await seatRef.transaction((current: RtdbSeatState | null) => {
        if (!current) return current
        if (current.status === 'held' && (current.userId === userId || !current.userId)) {
          return {
            status: 'available',
            updatedAt: now,
          }
        }
        return current
      })
      return res.committed
    }
  } catch {
    // fallback
  }

  try {
    const clientDb = getClientRtdb()
    const sRef = clientRef(clientDb, `seatState/${tripId}/${seatId}`)
    const res = await clientRunTransaction(sRef, (current: RtdbSeatState | null) => {
      if (!current) return current
      if (current.status === 'held' && (current.userId === userId || !current.userId)) {
        return {
          status: 'available',
          updatedAt: now,
        }
      }
      return current
    })
    return res.committed
  } catch {
    return false
  }
}

export async function bookSeatsInRtdb(params: {
  tripId: string
  seatIds: string[]
  userId: string
  ticketNo: string
  ticketId?: string
  bookingId?: string
}): Promise<boolean> {
  const { tripId, seatIds, userId, ticketNo, bookingId } = params
  await Promise.all(
    seatIds.map((seatId) =>
      bookSeatInRtdb({ tripId, seatId, userId, ticketNo, bookingId })
    )
  )
  return true
}

/**
 * Marks seats as permanently 'booked' in RTDB once payment/booking confirms.
 */
export async function bookSeatInRtdb(params: {
  tripId: string
  seatId: string
  userId: string
  ticketNo: string
  bookingId?: string
  gender?: 'Male' | 'Female' | 'man' | 'woman'
}): Promise<boolean> {
  const { tripId, seatId, userId, ticketNo, bookingId, gender } = params
  const now = Date.now()

  if (process.env.NODE_ENV === 'test') {
    return true
  }

  const payload: RtdbSeatState = {
    status: 'booked',
    userId,
    ticketNo,
    bookingId,
    gender: gender || 'Male',
    updatedAt: now,
  }

  try {
    const adminDb = getAdminRtdbSafe()
    if (adminDb) {
      await withRtdbTimeout(adminDb.ref(`seatState/${tripId}/${seatId}`).set(payload))
      return true
    }
  } catch {
    // fallback
  }

  try {
    const clientDb = getClientRtdb()
    const sRef = clientRef(clientDb, `seatState/${tripId}/${seatId}`)
    await withRtdbTimeout(clientSet(sRef, payload))
    return true
  } catch {
    return false
  }
}

/**
 * Frees cancelled seats in RTDB so they immediately become available again.
 */
export async function cancelSeatsInRtdb(params: {
  tripId: string
  seatIds: string[]
}): Promise<boolean> {
  const { tripId, seatIds } = params
  const now = Date.now()

  if (process.env.NODE_ENV === 'test') {
    return true
  }

  const withTimeout = <T>(promise: Promise<T>, ms = 1500): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('RTDB operation timed out')), ms)
      ),
    ])

  try {
    const adminDb = getAdminRtdbSafe()
    if (adminDb) {
      const updates: Record<string, any> = {}
      for (const seatId of seatIds) {
        updates[`seatState/${tripId}/${seatId}`] = {
          status: 'available',
          updatedAt: now,
        }
      }
      await withTimeout(adminDb.ref().update(updates))
      return true
    }
  } catch (err) {
    console.warn('[cancelSeatsInRtdb] Admin error:', err)
  }

  try {
    const clientDb = getClientRtdb()
    const { update } = await import('firebase/database')
    const updates: Record<string, any> = {}
    for (const seatId of seatIds) {
      updates[`seatState/${tripId}/${seatId}`] = {
        status: 'available',
        updatedAt: now,
      }
    }
    await withTimeout(update(clientRef(clientDb), updates))
    return true
  } catch {
    return false
  }
}

/**
 * Reads all seat states for a given trip from RTDB.
 */
export async function getTripSeatsFromRtdb(tripId: string): Promise<Record<string, RtdbSeatState>> {
  try {
    const adminDb = getAdminRtdbSafe()
    if (adminDb) {
      const snap = await adminDb.ref(`seatState/${tripId}`).get()
      return (snap.val() as Record<string, RtdbSeatState>) || {}
    }
  } catch {
    // fallback
  }

  try {
    const clientDb = getClientRtdb()
    const sRef = clientRef(clientDb, `seatState/${tripId}`)
    const snap = await clientGet(sRef)
    return (snap.val() as Record<string, RtdbSeatState>) || {}
  } catch {
    return {}
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
    const adminDb = getAdminRtdbSafe()
    if (adminDb) {
      await adminDb.ref(`tracking/${tripId}`).set(payload)
      return true
    }
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
  return false
}
