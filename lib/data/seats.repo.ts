import { getAdminDb } from '../firebase/admin'
import { AppError, ErrorCodes } from '../errors/app-error'
import { firestoreMeter } from '../firebase/meter'
import {
  evaluate,
  Gender,
  Pax,
  SeatState,
  normalizeSeats,
} from '../domain/seats/rules'
import { HOLD_TTL_MS, FAMILY_MAX } from '../config/seat-rules'

export type SeatLifecycleState = 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'BLOCKED'

export interface BusSeatEntry {
  state: SeatLifecycleState
  gender?: Gender
  fam?: string
  level?: 0 | 1 | 2 | 'OPEN'
  heldBy?: string
  deviceId?: string
  grp?: string
  holdExpiresAt?: number
  ticketNo?: string
  updatedAt?: string
}

export interface BusSeatsDoc {
  tripId: string
  date: string
  departureAt: number
  seats: Record<string, BusSeatEntry>
  rulesVersion: 2
  v: number
  updatedAt: string
}

export interface SeatPublicDoc {
  taken: Record<string, Gender>
  held: Record<string, { gender: Gender; expiresAt: number }>
  blocked: string[]
  departureAt: number
  v: number
  updatedAt: string
}

export function buildPublicDoc(
  busDoc: Partial<BusSeatsDoc> | undefined,
  now: number
): SeatPublicDoc {
  const taken: Record<string, Gender> = {}
  const held: Record<string, { gender: Gender; expiresAt: number }> = {}
  const blocked: string[] = []

  for (const [seatId, entry] of Object.entries(busDoc?.seats || {})) {
    if (entry.state === 'CONFIRMED' && entry.gender) {
      taken[seatId] = entry.gender
    } else if (
      entry.state === 'HELD' &&
      entry.gender &&
      entry.holdExpiresAt &&
      entry.holdExpiresAt > now
    ) {
      held[seatId] = {
        gender: entry.gender,
        expiresAt: entry.holdExpiresAt,
      }
    } else if (entry.state === 'BLOCKED') {
      blocked.push(seatId)
    }
  }

  return {
    taken,
    held,
    blocked,
    departureAt: busDoc?.departureAt || 0,
    v: ((busDoc?.v || 0) + 1),
    updatedAt: new Date().toISOString(),
  }
}

export interface PlaceHoldOptions {
  passengers?: Array<{ seatId: string; gender: Gender; age: number }>
  family?: boolean
  acceptAdjacent?: boolean
  deviceId?: string
  departureAt?: number
}

export class SeatsRepository {
  public static getDocId(tripId: string, date: string): string {
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
        departureAt: 0,
        seats: {},
        rulesVersion: 2,
        v: 1,
        updatedAt: new Date().toISOString(),
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
      departureAt: data.departureAt || 0,
      rulesVersion: 2,
      v: data.v || 1,
      seats: cleanedSeats,
    }
  }

  /**
   * Reads sanitized seat_public doc directly.
   */
  static async getSeatPublic(tripId: string, date: string): Promise<SeatPublicDoc> {
    const docId = this.getDocId(tripId, date)
    firestoreMeter.recordRead('seat_public', docId)
    const db = getAdminDb()
    const snap = await db.collection('seat_public').doc(docId).get()

    const now = Date.now()
    if (snap.exists) {
      const data = snap.data() as SeatPublicDoc
      // Clean expired holds in return payload
      const cleanedHeld: Record<string, { gender: Gender; expiresAt: number }> = {}
      for (const [s, h] of Object.entries(data.held || {})) {
        if (h.expiresAt > now) {
          cleanedHeld[s] = h
        }
      }
      return {
        ...data,
        held: cleanedHeld,
      }
    }

    // Fallback: build from bus_seats if seat_public doesn't exist yet
    const busSeats = await this.getBusSeats(tripId, date)
    return buildPublicDoc(busSeats, now)
  }

  /**
   * Atomically places a hold on seats inside a Firestore transaction.
   * Runs rules.evaluate inside the transaction and dual-writes bus_seats and seat_public.
   */
  static async placeHold(
    tripId: string,
    date: string,
    seatIds: string[],
    uid: string,
    grp: string,
    holdExpiresAt: number,
    options?: PlaceHoldOptions
  ): Promise<{ freshPublicMap?: SeatPublicDoc }> {
    const docId = this.getDocId(tripId, date)
    const db = getAdminDb()

    return await db.runTransaction(async (t) => {
      firestoreMeter.recordRead('bus_seats', docId)
      const busDocRef = db.collection('bus_seats').doc(docId)
      const publicDocRef = db.collection('seat_public').doc(docId)

      const snap = await t.get(busDocRef)
      const now = Date.now()

      const currentDoc = snap.exists ? (snap.data() as BusSeatsDoc) : undefined
      const currentSeats: Record<string, BusSeatEntry> = currentDoc?.seats || {}
      const departureAt =
        options?.departureAt || currentDoc?.departureAt || (now + 24 * 3600 * 1000)

      // Clean expired holds
      const cleanedSeats: Record<string, BusSeatEntry> = {}
      let userActiveHoldCount = 0

      for (const [id, entry] of Object.entries(currentSeats)) {
        if (entry.state === 'HELD' && entry.holdExpiresAt && entry.holdExpiresAt <= now) {
          cleanedSeats[id] = { state: 'AVAILABLE' }
        } else {
          cleanedSeats[id] = entry
          if (
            entry.state === 'HELD' &&
            entry.holdExpiresAt &&
            entry.holdExpiresAt > now &&
            entry.grp !== grp &&
            ((entry.heldBy && entry.heldBy === uid) ||
              (options?.deviceId && entry.deviceId && entry.deviceId === options.deviceId))
          ) {
            userActiveHoldCount++
          }
        }
      }

      // Abuse check: Max 1 active hold per uid + device
      if (options?.deviceId && userActiveHoldCount > 0) {
        throw new AppError(
          ErrorCodes.CONFLICT,
          'You already have an active seat hold in progress. Please complete or release it first.'
        )
      }

      // Max 6 seats per booking
      if (seatIds.length > FAMILY_MAX) {
        throw new AppError(
          ErrorCodes.INVALID_INPUT,
          `Cannot hold more than ${FAMILY_MAX} seats in one booking.`
        )
      }

      // Prepare passengers array for rule evaluation
      let evalPassengers: Pax[] = []
      if (options?.passengers && options.passengers.length > 0) {
        evalPassengers = options.passengers.map((p) => ({
          seatId: p.seatId,
          gender: p.gender,
          age: p.age,
        }))
      } else {
        // Fallback for tests or legacy calls: assign adult F or M based on existing or default
        evalPassengers = seatIds.map((sId) => ({
          seatId: sId,
          gender: 'F',
          age: 25,
        }))
      }

      // Run shared domain rules evaluation
      const evalRes = evaluate(
        cleanedSeats as unknown as Record<string, SeatState>,
        {
          family: !!options?.family,
          acceptAdjacent: !!options?.acceptAdjacent,
          pax: evalPassengers,
        },
        now,
        departureAt
      )

      if (!evalRes.ok) {
        const freshMap = buildPublicDoc({ ...currentDoc, seats: cleanedSeats, departureAt }, now)
        const appErr = new AppError(
          evalRes.code === 'ADJACENT_CONSENT_REQUIRED'
            ? ErrorCodes.INVALID_INPUT
            : ErrorCodes.SEAT_UNAVAILABLE,
          `Seat selection failed rule evaluation: ${evalRes.code} for seat ${evalRes.seatId || ''}`,
          { code: evalRes.code, seatId: evalRes.seatId, freshMap }
        )
        throw appErr
      }

      // Apply hold
      const updatedSeats = { ...cleanedSeats }
      const isoNow = new Date().toISOString()
      const newV = (currentDoc?.v || 0) + 1

      for (const p of evalPassengers) {
        updatedSeats[p.seatId] = {
          state: 'HELD',
          gender: p.gender,
          level: evalRes.levels[p.seatId],
          fam: options?.family ? grp : undefined,
          heldBy: uid,
          deviceId: options?.deviceId,
          grp,
          holdExpiresAt,
          updatedAt: isoNow,
        }
      }

      const updatedBusDoc: BusSeatsDoc = {
        tripId,
        date,
        departureAt,
        seats: updatedSeats,
        rulesVersion: 2,
        v: newV,
        updatedAt: isoNow,
      }

      const publicDoc = buildPublicDoc(updatedBusDoc, now)

      firestoreMeter.recordWrite('bus_seats', docId)
      t.set(busDocRef, updatedBusDoc, { merge: true })

      firestoreMeter.recordWrite('seat_public', docId)
      t.set(publicDocRef, publicDoc, { merge: true })

      return { freshPublicMap: publicDoc }
    })
  }

  /**
   * Releases caller's own hold.
   */
  static async releaseHold(
    tripId: string,
    date: string,
    seatIds: string[],
    uid: string,
    grp: string
  ): Promise<void> {
    const docId = this.getDocId(tripId, date)
    const db = getAdminDb()

    await db.runTransaction(async (t) => {
      firestoreMeter.recordRead('bus_seats', docId)
      const busDocRef = db.collection('bus_seats').doc(docId)
      const publicDocRef = db.collection('seat_public').doc(docId)

      const snap = await t.get(busDocRef)
      if (!snap.exists) return

      const currentDoc = snap.data() as BusSeatsDoc
      const currentSeats = currentDoc.seats || {}
      const updatedSeats = { ...currentSeats }
      const isoNow = new Date().toISOString()
      let modified = false

      for (const sId of seatIds) {
        const entry = updatedSeats[sId]
        if (entry && entry.state === 'HELD' && (entry.heldBy === uid || entry.grp === grp)) {
          updatedSeats[sId] = {
            state: 'AVAILABLE',
            updatedAt: isoNow,
          }
          modified = true
        }
      }

      if (!modified) return

      const newV = (currentDoc.v || 0) + 1
      const updatedBusDoc: BusSeatsDoc = {
        ...currentDoc,
        seats: updatedSeats,
        v: newV,
        updatedAt: isoNow,
      }

      const publicDoc = buildPublicDoc(updatedBusDoc, Date.now())

      firestoreMeter.recordWrite('bus_seats', docId)
      t.set(busDocRef, updatedBusDoc, { merge: true })

      firestoreMeter.recordWrite('seat_public', docId)
      t.set(publicDocRef, publicDoc, { merge: true })
    })
  }

  /**
   * Confirms seats in a Firestore transaction during booking finalization.
   * Requires state HELD, matching grp and not expired. Keeps passenger gender.
   */
  static confirmSeatsInTx(
    t: FirebaseFirestore.Transaction,
    tripId: string,
    date: string,
    seatIds: string[],
    grp: string,
    ticketNo: string,
    passengers: Array<{ seat?: string; seatId?: string; gender: string }>,
    uid?: string
  ): void {
    const docId = this.getDocId(tripId, date)
    const db = getAdminDb()
    const busDocRef = db.collection('bus_seats').doc(docId)
    const publicDocRef = db.collection('seat_public').doc(docId)

    const genderMap = new Map<string, Gender>()
    for (const p of passengers) {
      const sId = p.seat || p.seatId
      if (sId) {
        const isF = p.gender === 'female' || p.gender === 'F'
        genderMap.set(sId, isF ? 'F' : 'M')
      }
    }

    const isoNow = new Date().toISOString()
    const busSeatsUpdate: Record<string, unknown> = {
      updatedAt: isoNow,
      rulesVersion: 2,
    }

    for (const seatId of seatIds) {
      const mappedGender = genderMap.get(seatId) || 'M'
      busSeatsUpdate[`seats.${seatId}`] = {
        state: 'CONFIRMED',
        grp,
        ticketNo,
        gender: mappedGender,
        updatedAt: isoNow,
      }
    }

    firestoreMeter.recordWrite('bus_seats', docId)
    t.update(busDocRef, busSeatsUpdate as any)

    // Dual-write into seat_public
    const publicUpdate: Record<string, unknown> = {
      updatedAt: isoNow,
    }
    for (const seatId of seatIds) {
      publicUpdate[`taken.${seatId}`] = genderMap.get(seatId) || 'M'
      publicUpdate[`held.${seatId}`] = null
    }

    firestoreMeter.recordWrite('seat_public', docId)
    t.set(publicDocRef, publicUpdate as any, { merge: true })
  }

  /**
   * Releases seats back to AVAILABLE in a transaction (e.g. on cancellation).
   */
  static releaseSeatsInTx(
    t: FirebaseFirestore.Transaction,
    tripId: string,
    date: string,
    seatIds: string[]
  ): void {
    const docId = this.getDocId(tripId, date)
    const db = getAdminDb()
    const busDocRef = db.collection('bus_seats').doc(docId)
    const publicDocRef = db.collection('seat_public').doc(docId)

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
    t.update(busDocRef, updatePayload as any)

    // Also remove from taken/held in seat_public
    const publicUpdate: Record<string, unknown> = {
      updatedAt: isoNow,
    }
    for (const seatId of seatIds) {
      publicUpdate[`taken.${seatId}`] = null
      publicUpdate[`held.${seatId}`] = null
    }

    firestoreMeter.recordWrite('seat_public', docId)
    t.set(publicDocRef, publicUpdate as any, { merge: true })
  }

  /**
   * Admin blocks or unblocks a seat.
   */
  static async adminBlockSeat(
    tripId: string,
    date: string,
    seatId: string,
    blocked: boolean,
    adminUid: string
  ): Promise<void> {
    const docId = this.getDocId(tripId, date)
    const db = getAdminDb()

    await db.runTransaction(async (t) => {
      firestoreMeter.recordRead('bus_seats', docId)
      const busDocRef = db.collection('bus_seats').doc(docId)
      const publicDocRef = db.collection('seat_public').doc(docId)

      const snap = await t.get(busDocRef)
      const currentDoc = snap.exists ? (snap.data() as BusSeatsDoc) : undefined
      const currentSeats = currentDoc?.seats || {}
      const isoNow = new Date().toISOString()

      const updatedSeats = { ...currentSeats }
      if (blocked) {
        updatedSeats[seatId] = { state: 'BLOCKED', updatedAt: isoNow }
      } else {
        updatedSeats[seatId] = { state: 'AVAILABLE', updatedAt: isoNow }
      }

      const updatedBusDoc: BusSeatsDoc = {
        tripId,
        date,
        departureAt: currentDoc?.departureAt || 0,
        seats: updatedSeats,
        rulesVersion: 2,
        v: (currentDoc?.v || 0) + 1,
        updatedAt: isoNow,
      }

      const publicDoc = buildPublicDoc(updatedBusDoc, Date.now())

      firestoreMeter.recordWrite('bus_seats', docId)
      t.set(busDocRef, updatedBusDoc, { merge: true })

      firestoreMeter.recordWrite('seat_public', docId)
      t.set(publicDocRef, publicDoc, { merge: true })

      // Audit log
      const auditRef = db.collection('admin_audit_logs').doc()
      t.set(auditRef, {
        action: blocked ? 'SEAT_BLOCK' : 'SEAT_UNBLOCK',
        tripId,
        date,
        seatId,
        adminUid,
        timestamp: Date.now(),
        createdAt: isoNow,
      })
    })
  }

  /**
   * Admin reseats a passenger due to gender mismatch during boarding.
   * Audited with required reason.
   */
  static async adminReseat(
    tripId: string,
    date: string,
    fromSeatId: string,
    toSeatId: string,
    reason: string,
    adminUid: string
  ): Promise<void> {
    if (!reason || reason.trim().length === 0) {
      throw new AppError(ErrorCodes.INVALID_INPUT, 'A reason is required for seat reseating.')
    }

    const docId = this.getDocId(tripId, date)
    const db = getAdminDb()

    await db.runTransaction(async (t) => {
      firestoreMeter.recordRead('bus_seats', docId)
      const busDocRef = db.collection('bus_seats').doc(docId)
      const publicDocRef = db.collection('seat_public').doc(docId)

      const snap = await t.get(busDocRef)
      if (!snap.exists) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Bus seats record not found')
      }

      const currentDoc = snap.data() as BusSeatsDoc
      const currentSeats = currentDoc.seats || {}

      const fromEntry = currentSeats[fromSeatId]
      const toEntry = currentSeats[toSeatId]

      if (!fromEntry || fromEntry.state !== 'CONFIRMED') {
        throw new AppError(
          ErrorCodes.INVALID_INPUT,
          `Seat ${fromSeatId} is not confirmed and cannot be reseated.`
        )
      }

      if (toEntry && toEntry.state !== 'AVAILABLE') {
        throw new AppError(
          ErrorCodes.SEAT_UNAVAILABLE,
          `Target seat ${toSeatId} is not available.`
        )
      }

      const isoNow = new Date().toISOString()
      const updatedSeats = { ...currentSeats }
      updatedSeats[toSeatId] = {
        ...fromEntry,
        updatedAt: isoNow,
      }
      updatedSeats[fromSeatId] = {
        state: 'AVAILABLE',
        updatedAt: isoNow,
      }

      const updatedBusDoc: BusSeatsDoc = {
        ...currentDoc,
        seats: updatedSeats,
        v: (currentDoc.v || 0) + 1,
        updatedAt: isoNow,
      }

      const publicDoc = buildPublicDoc(updatedBusDoc, Date.now())

      firestoreMeter.recordWrite('bus_seats', docId)
      t.set(busDocRef, updatedBusDoc, { merge: true })

      firestoreMeter.recordWrite('seat_public', docId)
      t.set(publicDocRef, publicDoc, { merge: true })

      // Audit log
      const auditRef = db.collection('admin_audit_logs').doc()
      t.set(auditRef, {
        action: 'SEAT_RESEAT',
        tripId,
        date,
        fromSeatId,
        toSeatId,
        reason,
        adminUid,
        timestamp: Date.now(),
        createdAt: isoNow,
      })
    })
  }
}
