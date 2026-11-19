import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'

export interface BusDocument {
  id: string
  busNumber: string
  busName: string
  seatLayout: string
  totalSeats: number
  active: boolean
  features: string[]
  createdAt: string
  updatedAt: string
}

export const DEFAULT_BUSES: BusDocument[] = [
  {
    id: 'bus_mh16dp4951',
    busNumber: 'MH 16 DP 4951',
    busName: 'Uday Travels Premium Executive AC Sleeper/Seater',
    seatLayout: '3+2 Seater',
    totalSeats: 50,
    active: true,
    features: ['AC', 'Reading Light', 'Charging Point', 'Emergency Exit', 'Luggage Compartment'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export class BusesRepository {
  private static collectionName = 'buses'

  static async getBuses(): Promise<BusDocument[]> {
    firestoreMeter.recordRead(this.collectionName, 'all')
    const db = getAdminDb()
    try {
      const snap = await db.collection(this.collectionName).where('active', '==', true).get()
      if (snap.empty) {
        await this.ensureDefaultBuses()
        return DEFAULT_BUSES
      }
      return snap.docs.map((doc) => doc.data() as BusDocument)
    } catch (err) {
      console.warn('[BusesRepository] getBuses failed, falling back to defaults:', err)
      return DEFAULT_BUSES
    }
  }

  static async getBusById(busId: string): Promise<BusDocument | null> {
    firestoreMeter.recordRead(this.collectionName, busId)
    const db = getAdminDb()
    try {
      const doc = await db.collection(this.collectionName).doc(busId).get()
      if (!doc.exists) {
        const found = DEFAULT_BUSES.find((b) => b.id === busId || b.busNumber === busId)
        if (found) {
          await this.saveBus(found)
          return found
        }
        return null
      }
      return doc.data() as BusDocument
    } catch (err) {
      console.warn('[BusesRepository] getBusById failed, falling back to defaults:', err)
      return DEFAULT_BUSES.find((b) => b.id === busId) || null
    }
  }

  static async saveBus(bus: BusDocument): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, bus.id)
    const db = getAdminDb()
    const now = new Date().toISOString()
    const payload = {
      ...bus,
      updatedAt: now,
      createdAt: bus.createdAt || now,
    }
    await db.collection(this.collectionName).doc(bus.id).set(payload, { merge: true })
  }

  static async ensureDefaultBuses(): Promise<void> {
    const db = getAdminDb()
    for (const bus of DEFAULT_BUSES) {
      try {
        const doc = await db.collection(this.collectionName).doc(bus.id).get()
        if (!doc.exists) {
          await this.saveBus(bus)
        }
      } catch (err) {
        console.warn(`[BusesRepository] could not seed bus ${bus.id}:`, err)
      }
    }
  }
}
