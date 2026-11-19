import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'

export interface RoutePoint {
  id: string
  name: string
  address?: string
  sequence: number
  active: boolean
}

export interface RouteDocument {
  id: string
  source: string
  destination: string
  routeName: string
  fare: number
  active: boolean
  departures: string[]
  durationMin: number
  pickupPoints: RoutePoint[]
  dropPoints: RoutePoint[]
  cancellationPolicy: string
  createdAt: string
  updatedAt: string
}

export const AHILYANAGAR_PICKUP_NAMES = [
  'Office',
  'Ekvira Chowk',
  'Yashodha Nagar',
  'HDFC Bank',
  'Vaani Nagar',
  'Petrol Pump',
  'Bhistbag Chowk',
  'Balaji Kaman',
  'Sona Nagar Chowk',
  'Professor Chowk',
  'Premdan Chowk',
  'Zopadi Canteen',
  'Sarda College',
  'Delhigate',
  'Nepti Naka Chowk',
  'Swastik Chowk',
  'Vinayak Nagar',
  'Kinetic Chowk',
  'Rangoli Hotel',
  'Ambika Nagar Stop',
]

export const PUNE_DROP_NAMES = [
  'Wakadewadi',
  'Sangamwadi',
  'Yerwada',
  'Shastri Nagar',
  'Ramwadi Naka',
  'Four Points',
  'Wadgaonsheri',
  'Viman Nagar',
  'Chandan Nagar',
  'Tata Guard Room',
  'Kharadi Bye Pass',
  'Wagholi',
]

export function buildRoutePoints(names: string[]): RoutePoint[] {
  return names.map((name, idx) => ({
    id: `pt_${idx + 1}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name,
    address: `${name}, Maharashtra`,
    sequence: idx + 1,
    active: true,
  }))
}

export const DEFAULT_ROUTES: RouteDocument[] = [
  {
    id: 'AHM_PUN',
    source: 'Ahilyanagar',
    destination: 'Pune',
    routeName: 'Ahilyanagar → Pune',
    fare: 200,
    active: true,
    departures: ['05:30', '06:00', '09:30', '14:00'],
    durationMin: 165,
    pickupPoints: buildRoutePoints(AHILYANAGAR_PICKUP_NAMES),
    dropPoints: buildRoutePoints(PUNE_DROP_NAMES),
    cancellationPolicy: 'Ahilyanagar to Pune bookings will not be cancelled after 08:00 PM for the next day journey.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PUN_AHM',
    source: 'Pune',
    destination: 'Ahilyanagar',
    routeName: 'Pune → Ahilyanagar',
    fare: 200,
    active: true,
    departures: ['06:30', '10:00', '13:30', '17:00'],
    durationMin: 165,
    pickupPoints: buildRoutePoints(PUNE_DROP_NAMES),
    dropPoints: buildRoutePoints(AHILYANAGAR_PICKUP_NAMES),
    cancellationPolicy: 'Pune to Ahilyanagar bookings cannot be cancelled on the same day of booking and journey.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export class RoutesRepository {
  private static collectionName = 'routes'

  static async getRoutes(): Promise<RouteDocument[]> {
    firestoreMeter.recordRead(this.collectionName, 'all')
    const db = getAdminDb()
    try {
      const snap = await db.collection(this.collectionName).where('active', '==', true).get()
      if (snap.empty) {
        await this.ensureDefaultRoutes()
        return DEFAULT_ROUTES
      }
      return snap.docs.map((doc) => doc.data() as RouteDocument)
    } catch (err) {
      console.warn('[RoutesRepository] getRoutes failed, falling back to defaults:', err)
      return DEFAULT_ROUTES
    }
  }

  static async getRouteById(routeId: string): Promise<RouteDocument | null> {
    firestoreMeter.recordRead(this.collectionName, routeId)
    const db = getAdminDb()
    try {
      const doc = await db.collection(this.collectionName).doc(routeId).get()
      if (!doc.exists) {
        const found = DEFAULT_ROUTES.find((r) => r.id === routeId)
        if (found) {
          await this.saveRoute(found)
          return found
        }
        return null
      }
      return doc.data() as RouteDocument
    } catch (err) {
      console.warn('[RoutesRepository] getRouteById failed, falling back to defaults:', err)
      return DEFAULT_ROUTES.find((r) => r.id === routeId) || null
    }
  }

  static async saveRoute(route: RouteDocument): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, route.id)
    const db = getAdminDb()
    const now = new Date().toISOString()
    const payload = {
      ...route,
      updatedAt: now,
      createdAt: route.createdAt || now,
    }
    await db.collection(this.collectionName).doc(route.id).set(payload, { merge: true })
  }

  static async ensureDefaultRoutes(): Promise<void> {
    const db = getAdminDb()
    for (const route of DEFAULT_ROUTES) {
      try {
        const doc = await db.collection(this.collectionName).doc(route.id).get()
        if (!doc.exists) {
          await this.saveRoute(route)
        }
      } catch (err) {
        console.warn(`[RoutesRepository] could not seed route ${route.id}:`, err)
      }
    }
  }
}
