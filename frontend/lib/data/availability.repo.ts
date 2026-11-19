import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { AvailabilityDoc } from '../schema/availability'
import { SEATS_PER_BUS } from '../config/rules'
import { AppError, ErrorCodes } from '../errors/app-error'

export class AvailabilityRepository {
  private static getDocId(routeId: string, date: string): string {
    return `${routeId}_${date}`
  }

  static async getAvailabilityDoc(
    routeId: string,
    date: string
  ): Promise<AvailabilityDoc | null> {
    const docId = this.getDocId(routeId, date)
    firestoreMeter.recordRead('availability', docId)
    const db = getAdminDb()
    const snap = await db.collection('availability').doc(docId).get()
    if (!snap.exists) return null
    return snap.data() as AvailabilityDoc
  }

  /**
   * Adjusts the booked seat counter atomically inside a Firestore transaction.
   * Ensures booked count never drops below 0 or exceeds bus capacity.
   */
  static async adjustBookedInTx(
    t: FirebaseFirestore.Transaction,
    routeId: string,
    date: string,
    tripId: string,
    delta: number
  ): Promise<number> {
    const docId = this.getDocId(routeId, date)
    const db = getAdminDb()
    const docRef = db.collection('availability').doc(docId)

    firestoreMeter.recordRead('availability', docId)
    const snap = await t.get(docRef)
    const docData = snap.exists ? (snap.data() as AvailabilityDoc) : {}

    let currentBooked = 0
    let capacity = SEATS_PER_BUS

    // Check customTrips array or trips object
    if (docData.customTrips) {
      const ct = docData.customTrips.find((t) => t.tripId === tripId)
      if (ct) {
        currentBooked = ct.booked || 0
        capacity = ct.totalSeats || SEATS_PER_BUS
      }
    } else if (docData.trips?.[tripId]) {
      const tr = docData.trips[tripId]
      currentBooked = tr.booked || 0
      capacity = tr.totalSeats || SEATS_PER_BUS
    }

    let nextBooked: number
    if (delta < 0) {
      nextBooked = Math.max(0, currentBooked + delta)
    } else {
      nextBooked = currentBooked + delta
      if (nextBooked > capacity) {
        throw new AppError(
          ErrorCodes.CONFLICT,
          `Cannot book seats: capacity of ${capacity} exceeded (attempted ${nextBooked})`
        )
      }
    }

    const isoNow = new Date().toISOString()
    firestoreMeter.recordWrite('availability', docId)

    if (docData.customTrips) {
      const updatedCustom = docData.customTrips.map((ct) => {
        if (ct.tripId === tripId) {
          return { ...ct, booked: nextBooked, updatedAt: isoNow }
        }
        return ct
      })
      t.set(docRef, { customTrips: updatedCustom, updatedAt: isoNow }, { merge: true })
    } else {
      t.set(
        docRef,
        {
          trips: {
            [tripId]: {
              booked: nextBooked,
              updatedAt: isoNow,
            },
          },
          updatedAt: isoNow,
        },
        { merge: true }
      )
    }

    return nextBooked
  }
}
