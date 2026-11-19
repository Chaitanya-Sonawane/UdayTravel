import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { BusDocument, DEFAULT_BUSES } from './buses.constants'

export type { BusDocument }
export { DEFAULT_BUSES }

export class BusesRepository {
  private static collectionName = 'buses'

  static async getBuses(): Promise<BusDocument[]> {
    firestoreMeter.recordRead(this.collectionName, 'all')
    try {
      const db = getAdminDb()
      const snap = await Promise.race([
        db.collection(this.collectionName).where('active', '==', true).get(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 1000)
        ),
      ])
      if (snap.empty) {
        await this.ensureDefaultBuses()
        return DEFAULT_BUSES
      }
      return snap.docs.map((doc) => doc.data() as BusDocument)
    } catch (err) {
      console.warn('[BusesRepository] getBuses failed or timed out, falling back to defaults:', err)
      return DEFAULT_BUSES
    }
  }

  static async getBusById(busId: string): Promise<BusDocument | null> {
    firestoreMeter.recordRead(this.collectionName, busId)
    try {
      const db = getAdminDb()
      const doc = await Promise.race([
        db.collection(this.collectionName).doc(busId).get(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 1000)
        ),
      ])
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
      console.warn('[BusesRepository] getBusById failed or timed out, falling back to defaults:', err)
      return DEFAULT_BUSES.find((b) => b.id === busId || b.busNumber === busId) || null
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
