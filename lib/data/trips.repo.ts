import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { ROUTES, listTrips, RouteId } from '../config/routes'

export interface TripDocument {
  id: string
  tripId: string
  routeId: string
  busId: string
  travelDate: string
  departureTime: string
  arrivalTime: string
  fare: number
  status: 'active' | 'completed' | 'cancelled'
  availableSeats: number
  bookedSeats: string[]
  totalSeats: number
  createdAt: string
  updatedAt: string
}

export interface CreateTripInput {
  routeId: string
  busId: string
  travelDate: string
  departureTime: string
  arrivalTime?: string
  fare?: number
  status?: 'active' | 'completed' | 'cancelled'
}

function calculateArrivalTime(departureTime: string, durationMin = 165): string {
  const parts = departureTime.split(':')
  const h = parts[0] !== undefined ? parseInt(parts[0], 10) : NaN
  const m = parts[1] !== undefined ? parseInt(parts[1], 10) : NaN
  if (isNaN(h) || isNaN(m)) return '09:00'
  const totalMin = h * 60 + m + durationMin
  const arrH = Math.floor(totalMin / 60) % 24
  const arrM = totalMin % 60
  return `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`
}

export class TripsRepository {
  private static collectionName = 'trips'

  static async getTripsByDate(travelDate: string, routeId?: string): Promise<TripDocument[]> {
    firestoreMeter.recordRead(this.collectionName, `date_${travelDate}`)
    try {
      const db = getAdminDb()
      let query = db.collection(this.collectionName).where('travelDate', '==', travelDate)
      if (routeId) {
        query = query.where('routeId', '==', routeId)
      }
      const snap = await Promise.race([
        query.get(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 350)
        ),
      ])
      if (snap.empty) {
        return await this.ensureTripsForDate(travelDate, routeId)
      }
      return snap.docs.map((doc) => doc.data() as TripDocument)
    } catch (err) {
      console.warn('[TripsRepository] getTripsByDate failed or timed out, creating defaults in-memory:', err)
      return this.generateDefaultTrips(travelDate, routeId)
    }
  }

  static async getTripById(tripId: string): Promise<TripDocument | null> {
    firestoreMeter.recordRead(this.collectionName, tripId)
    try {
      const db = getAdminDb()
      const doc = await Promise.race([
        db.collection(this.collectionName).doc(tripId).get(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 350)
        ),
      ])
      if (!doc.exists) {
        return null
      }
      return doc.data() as TripDocument
    } catch (err) {
      console.warn('[TripsRepository] getTripById error:', err)
      return null
    }
  }

  static async createTrip(input: CreateTripInput): Promise<TripDocument> {
    firestoreMeter.recordWrite(this.collectionName, 'new')
    const db = getAdminDb()
    const now = new Date().toISOString()
    const hhmm = input.departureTime.replace(':', '')
    const id = `trip_${input.routeId}_${hhmm}_${input.travelDate.replace(/-/g, '')}`
    const arrivalTime = input.arrivalTime || calculateArrivalTime(input.departureTime)

    const tripDoc: TripDocument = {
      id,
      tripId: id,
      routeId: input.routeId,
      busId: input.busId || 'bus_mh16dp4951',
      travelDate: input.travelDate,
      departureTime: input.departureTime,
      arrivalTime,
      fare: input.fare ?? 200,
      status: input.status || 'active',
      availableSeats: 50,
      bookedSeats: [],
      totalSeats: 50,
      createdAt: now,
      updatedAt: now,
    }

    await db.collection(this.collectionName).doc(id).set(tripDoc, { merge: true })
    return tripDoc
  }

  static async updateTrip(tripId: string, updates: Partial<TripDocument>): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, tripId)
    const db = getAdminDb()
    const now = new Date().toISOString()
    await db.collection(this.collectionName).doc(tripId).set(
      {
        ...updates,
        updatedAt: now,
      },
      { merge: true }
    )
  }

  static async recordBookingInTrip(
    tripId: string,
    seatCount: number,
    bookedSeatIds: string[]
  ): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, tripId)
    const db = getAdminDb()
    const docRef = db.collection(this.collectionName).doc(tripId)
    try {
      await db.runTransaction(async (t) => {
        const snap = await t.get(docRef)
        if (!snap.exists) return
        const current = snap.data() as TripDocument
        const currentBooked = new Set(current.bookedSeats || [])
        for (const s of bookedSeatIds) currentBooked.add(s)
        const updatedBooked = Array.from(currentBooked)
        const available = Math.max(0, current.totalSeats - updatedBooked.length)

        t.update(docRef, {
          bookedSeats: updatedBooked,
          availableSeats: available,
          updatedAt: new Date().toISOString(),
        })
      })
    } catch (err) {
      console.warn('[TripsRepository] recordBookingInTrip transaction error:', err)
    }
  }

  static async recordCancellationInTrip(
    tripId: string,
    seatCount: number,
    cancelledSeatIds: string[]
  ): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, tripId)
    const db = getAdminDb()
    const docRef = db.collection(this.collectionName).doc(tripId)
    try {
      await db.runTransaction(async (t) => {
        const snap = await t.get(docRef)
        if (!snap.exists) return
        const current = snap.data() as TripDocument
        const cancelledSet = new Set(cancelledSeatIds)
        const updatedBooked = (current.bookedSeats || []).filter((s) => !cancelledSet.has(s))
        const available = Math.min(current.totalSeats, current.totalSeats - updatedBooked.length)

        t.update(docRef, {
          bookedSeats: updatedBooked,
          availableSeats: available,
          updatedAt: new Date().toISOString(),
        })
      })
    } catch (err) {
      console.warn('[TripsRepository] recordCancellationInTrip transaction error:', err)
    }
  }

  static generateDefaultTrips(travelDate: string, filterRouteId?: string): TripDocument[] {
    const routeKeys: RouteId[] = filterRouteId
      ? [filterRouteId as RouteId]
      : (['AHM_PUN', 'PUN_AHM'] as RouteId[])

    const trips: TripDocument[] = []
    const now = new Date().toISOString()

    for (const rKey of routeKeys) {
      const routeCfg = ROUTES[rKey]
      if (!routeCfg) continue
      for (const dep of routeCfg.departures) {
        const hhmm = dep.replace(':', '')
        const id = `trip_${rKey}_${hhmm}_${travelDate.replace(/-/g, '')}`
        trips.push({
          id,
          tripId: id,
          routeId: rKey,
          busId: 'bus_mh16dp4951',
          travelDate,
          departureTime: dep,
          arrivalTime: calculateArrivalTime(dep, routeCfg.durationMin),
          fare: 200,
          status: 'active',
          availableSeats: 50,
          bookedSeats: [],
          totalSeats: 50,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
    return trips
  }

  static async ensureTripsForDate(travelDate: string, routeId?: string): Promise<TripDocument[]> {
    const generated = this.generateDefaultTrips(travelDate, routeId)
    try {
      const db = getAdminDb()
      for (const trip of generated) {
        try {
          const ref = db.collection(this.collectionName).doc(trip.id)
          const snap = await Promise.race([
            ref.get(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Firestore timeout')), 500)
            ),
          ])
          if (!snap.exists) {
            await Promise.race([
              ref.set(trip),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Firestore timeout')), 500)
              ),
            ])
          }
        } catch {
          // Non-blocking in offline / slow sandbox
        }
      }
    } catch {
      // Return generated defaults immediately
    }
    return generated
  }
}
