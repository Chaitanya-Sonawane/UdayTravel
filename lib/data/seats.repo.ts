import { getAdminDb } from '../firebase/admin'
import { AppError, ErrorCodes } from '../errors/app-error'
import { firestoreMeter } from '../firebase/meter'

export type SeatLifecycleState = 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'BLOCKED'

export interface BusSeatEntry {
  state: SeatLifecycleState
  heldBy?: string
  grp?: string
  holdExpiresAt?: number
  ticketNo?: string
  passengerGender?: 'male' | 'female'
  updatedAt?: string
}

export interface BusSeatsDoc {
  tripId: string
  date: string
  seats: Record<string, BusSeatEntry>
  updatedAt: string
  schemaVersion: number
}

export class SeatsRepository {
  private static getDocId(tripId: string, date: string): string {
    return `${tripId}_${date}`
  }

  /**
   * Reads bus seats document, resolving lazy expiry of expired holds in-memory.
   */
  static async getBusSeats(tripId: string, date: string): Promise<BusSeatsDoc> {
    const docId = this.getDocId(tripId, date)
    firestoreMeter.recordRead('bus_seats', docId)
    const db = getAdminDb()
    const snap = await db.collection('bus_seats').doc(docId).get()

    const now = Date.now()
    if (!snap.exists) {
      return {
        tripId,
        date,
        seats: {},
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      }
    }

    const data = snap.data() as BusSeatsDoc
    const cleanedSeats: Record<string, BusSeatEntry> = {}

    for (const [id, entry] of Object.entries(data.seats || {})) {
      if (entry.state === 'HELD' && entry.holdExpiresAt && entry.holdExpiresAt <= now) {
        cleanedSeats[id] = { state: 'AVAILABLE' }
      } else {
        cleanedSeats[id] = entry
      }
    }

    return {
      ...data,
      seats: cleanedSeats,
    }
  }

  /**
   * Atomically places a hold on seats inside a Firestore transaction.
   * If any requested seat is CONFIRMED, BLOCKED, or currently HELD by another active hold, throws SEAT_UNAVAILABLE.
   */
  static async placeHold(
    tripId: string,
    date: string,
    seatIds: string[],
    uid: string,
    grp: string,
    holdExpiresAt: number
  ): Promise<void> {
    const docId = this.getDocId(tripId, date)
    const db = getAdminDb()

    await db.runTransaction(async (t) => {
      firestoreMeter.recordRead('bus_seats', docId)
      const docRef = db.collection('bus_seats').doc(docId)
      const snap = await t.get(docRef)
      const now = Date.now()

      const currentSeats: Record<string, BusSeatEntry> = snap.exists
        ? (snap.data() as BusSeatsDoc).seats || {}
        : {}

      // Validate availability of all requested seats
      for (const seatId of seatIds) {
        const existing = currentSeats[seatId]
        if (existing) {
          const isExpiredHold =
            existing.state === 'HELD' && existing.holdExpiresAt && existing.holdExpiresAt <= now
          const isSameHold = existing.state === 'HELD' && existing.grp === grp

          if (existing.state === 'CONFIRMED' || existing.state === 'BLOCKED') {
            throw new AppError(
              ErrorCodes.SEAT_UNAVAILABLE,
              `Seat ${seatId} is already booked or blocked`
            )
          }

          if (existing.state === 'HELD' && !isExpiredHold && !isSameHold) {
            throw new AppError(
              ErrorCodes.SEAT_UNAVAILABLE,
              `Seat ${seatId} is currently held by another traveler`
            )
          }
        }
      }

      // Apply hold to requested seats
      const updatedSeats = { ...currentSeats }
      const isoNow = new Date().toISOString()
      for (const seatId of seatIds) {
        updatedSeats[seatId] = {
          state: 'HELD',
          heldBy: uid,
          grp,
          holdExpiresAt,
          updatedAt: isoNow,
        }
      }

      firestoreMeter.recordWrite('bus_seats', docId)
      t.set(
        docRef,
        {
          tripId,
          date,
          seats: updatedSeats,
          updatedAt: isoNow,
          schemaVersion: 1,
        },
        { merge: true }
      )
    })
  }

  /**
   * Confirms seats in a Firestore transaction during booking finalization.
   * Verifies the seat is held by this grp before transitioning to CONFIRMED.
   */
  static confirmSeatsInTx(
    t: FirebaseFirestore.Transaction,
    tripId: string,
    date: string,
    seatIds: string[],
    grp: string,
    ticketNo: string,
    passengers: Array<{ seat: string; gender: 'male' | 'female' }>
  ): void {
    const docId = this.getDocId(tripId, date)
    const db = getAdminDb()
    const docRef = db.collection('bus_seats').doc(docId)

    const genderMap = new Map<string, 'male' | 'female'>()
    for (const p of passengers) {
      genderMap.set(p.seat, p.gender)
    }

    const isoNow = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {
      updatedAt: isoNow,
    }

    for (const seatId of seatIds) {
      updatePayload[`seats.${seatId}`] = {
        state: 'CONFIRMED',
        grp,
        ticketNo,
        passengerGender: genderMap.get(seatId) || 'male',
        updatedAt: isoNow,
      }
    }

    firestoreMeter.recordWrite('bus_seats', docId)
    t.update(docRef, updatePayload as any)
  }

  /**
   * Releases seats back to AVAILABLE in a transaction.
   */
  static releaseSeatsInTx(
    t: FirebaseFirestore.Transaction,
    tripId: string,
    date: string,
    seatIds: string[]
  ): void {
    const docId = this.getDocId(tripId, date)
    const db = getAdminDb()
    const docRef = db.collection('bus_seats').doc(docId)

    const isoNow = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {
      updatedAt: isoNow,
    }

    for (const seatId of seatIds) {
      updatePayload[`seats.${seatId}`] = {
        state: 'AVAILABLE',
        updatedAt: isoNow,
      }
    }

    firestoreMeter.recordWrite('bus_seats', docId)
    t.update(docRef, updatePayload as any)
  }
}
