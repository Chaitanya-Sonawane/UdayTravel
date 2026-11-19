import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import {
  Route,
  PickupPoint,
  DropPoint,
  resolveRouteId,
  createPointId,
} from '../types/route'
import { getSeedRoute, getAllSeedRoutes } from '../routes/seed-data'

export class RoutesRepository {
  private static collectionName = 'routes'

  /**
   * Retrieves all routes from the routes collection.
   */
  static async getAllRoutes(): Promise<Route[]> {
    firestoreMeter.recordRead(this.collectionName, 'all')
    const db = getAdminDb()
    try {
      const snap = await db.collection(this.collectionName).get()
      if (snap.empty) {
        return getAllSeedRoutes()
      }
      const list: Route[] = []
      snap.forEach((doc) => {
        const data = doc.data() as Route
        // Ignore duplicate legacy aliases in general list
        if (['ahilyanagar_to_pune', 'pune_to_ahilyanagar', 'nagar_to_pune', 'pune_to_nagar'].includes(doc.id)) {
          list.push({ ...data, routeId: doc.id as any })
        }
      })
      if (list.length === 0) {
        return getAllSeedRoutes()
      }
      return list.sort((a, b) => a.label.localeCompare(b.label))
    } catch (err) {
      console.warn('[RoutesRepository] getAllRoutes failed, using seed fallback:', err)
      return getAllSeedRoutes()
    }
  }

  /**
   * Retrieves active routes only (for passenger booking searches).
   */
  static async getActiveRoutes(): Promise<Route[]> {
    const all = await this.getAllRoutes()
    return all.filter((r) => r.active && r.pickupPoints.length > 0)
  }

  /**
   * Retrieves a single route document by canonical or alias ID.
   * Single document read quota optimized.
   */
  static async getRouteById(routeId: string): Promise<Route | null> {
    const canonicalId = resolveRouteId(routeId) || routeId
    firestoreMeter.recordRead(this.collectionName, canonicalId)
    const db = getAdminDb()

    try {
      const doc = await Promise.race([
        db.collection(this.collectionName).doc(canonicalId).get(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 350)
        ),
      ])
      if (doc.exists) {
        return doc.data() as Route
      }
      // Fallback to checking un-normalized doc ID if different
      if (canonicalId !== routeId) {
        const rawDoc = await Promise.race([
          db.collection(this.collectionName).doc(routeId).get(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 350)
          ),
        ])
        if (rawDoc.exists) {
          return rawDoc.data() as Route
        }
      }
    } catch (err) {
      console.warn(`[RoutesRepository] getRouteById notice for ${canonicalId}:`, err)
    }

    // Always fallback to authoritative seed data so passenger booking flows never fail
    return getSeedRoute(canonicalId)
  }

  /**
   * Saves or updates a route with automatic version tracking.
   */
  static async saveRoute(route: Route): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, route.routeId)
    const db = getAdminDb()
    const now = new Date().toISOString()
    const payload: Route = {
      ...route,
      updatedAt: now,
      version: (route.version || 0) + 1,
    }
    await db.collection(this.collectionName).doc(route.routeId).set(payload, { merge: true })
  }

  /**
   * Updates route pickup and drop points inside ONE atomic Firestore transaction.
   * Increments version + 1 and sets updatedAt.
   * Never issues one write per point.
   */
  static async updateRoutePoints(
    routeId: string,
    pickupPoints: PickupPoint[],
    dropPoints: DropPoint[]
  ): Promise<Route> {
    const canonicalId = resolveRouteId(routeId) || routeId
    firestoreMeter.recordWrite(this.collectionName, canonicalId)
    const db = getAdminDb()
    const docRef = db.collection(this.collectionName).doc(canonicalId)

    const updatedRoute = await db.runTransaction(async (t) => {
      const snap = await t.get(docRef)
      if (!snap.exists) {
        throw new Error(`Route '${canonicalId}' does not exist`)
      }
      const current = snap.data() as Route
      const newVersion = (current.version || 1) + 1
      const now = new Date().toISOString()

      // Ensure 1-based sequence assignment
      const sortedPickups = pickupPoints.map((p, idx) => ({
        ...p,
        id: p.id || createPointId('pp', p.name),
        sequence: idx + 1,
        active: p.active !== false,
      }))

      const sortedDrops = dropPoints.map((d, idx) => ({
        ...d,
        id: d.id || createPointId('dp', d.name),
        sequence: idx + 1,
        active: d.active !== false,
      }))

      const updates: Partial<Route> = {
        pickupPoints: sortedPickups,
        dropPoints: sortedDrops,
        version: newVersion,
        updatedAt: now,
      }

      t.update(docRef, updates)

      // Also update legacy alias doc if applicable in same transaction
      if (canonicalId === 'ahilyanagar_to_pune') {
        t.set(db.collection(this.collectionName).doc('AHM_PUN'), { ...current, ...updates }, { merge: true })
      } else if (canonicalId === 'pune_to_ahilyanagar') {
        t.set(db.collection(this.collectionName).doc('PUN_AHM'), { ...current, ...updates }, { merge: true })
      }

      return {
        ...current,
        ...updates,
      } as Route
    })

    return updatedRoute
  }

  /**
   * Checks whether any future booking references the specified pickup or drop point.
   * Used before allowing a hard delete.
   */
  static async hasFutureBookingsForPoint(routeId: string, pointId: string): Promise<boolean> {
    const db = getAdminDb()
    try {
      const today = new Date().toISOString().slice(0, 10)
      const snap = await db.collection('bookings').where('travelDate', '>=', today).get()
      let hasRef = false
      snap.forEach((doc) => {
        const b = doc.data() as any
        if (
          b.pickup?.pointId === pointId ||
          b.drop?.pointId === pointId ||
          b.pickupPointId === pointId ||
          b.dropPointId === pointId
        ) {
          hasRef = true
        }
      })
      return hasRef
    } catch {
      return false
    }
  }

  // Alias methods for legacy compatibility
  static async getRoutes(): Promise<any[]> {
    return this.getAllRoutes()
  }
}
