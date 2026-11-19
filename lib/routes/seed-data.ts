import { Route, RouteId, PickupPoint, DropPoint, createPointId, resolveRouteId } from '../types/route'

export const AHILYANAGAR_PICKUP_RAW = [
  { name: 'Office', time: '06:30' },
  { name: 'Ekvira Chowk', time: '06:30' },
  { name: 'Yashodha Nagar', time: '06:30' },
  { name: 'HDFC Bank', time: '06:30' },
  { name: 'Vaani Nagar', time: '06:30' },
  { name: 'Petrol Pump', time: '06:30' },
  { name: 'Bhistbag Chowk', time: '06:35' },
  { name: 'Balaji Kaman', time: '06:40' },
  { name: 'Sona Nagar Chowk', time: '06:40' },
  { name: 'Professor Chowk', time: '06:40' },
  { name: 'Premdan Chowk', time: '06:45' },
  { name: 'Zopadi Canteen', time: '06:45' },
  { name: 'Sarda College', time: '06:45' },
  { name: 'Delhigate', time: '06:45' },
  { name: 'Nepti Naka Chowk', time: '06:50' },
  { name: 'Swastik Chowk', time: '07:00' },
  { name: 'Vinayak Nagar', time: '07:05' },
  { name: 'Kinetic Chowk', time: '07:05' },
  { name: 'Rangoli Hotel', time: '07:05' },
  { name: 'Ambika Nagar Stop', time: '07:05' },
]

export const PUNE_DROP_RAW = [
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

export const PUNE_PICKUP_RAW = [
  { name: 'Wakadewadi', time: '18:30' },
  { name: 'Sangamwadi', time: '18:30' },
  { name: 'Yerwada', time: '18:45' },
  { name: 'Shastri Nagar', time: '18:50' },
  { name: 'Ramwadi Naka', time: '18:50' },
  { name: 'Four Points', time: '18:50' },
  { name: 'Wadgaonsheri', time: '18:50' },
  { name: 'Chandan Nagar', time: '18:55' },
  { name: 'Tata Guard Room', time: '18:55' },
  { name: 'Kharadi Bye Pass', time: '19:00' },
  { name: 'Wagholi', time: '19:15' },
]

export function buildPickupPoints(rawList: Array<{ name: string; time: string }>): PickupPoint[] {
  return rawList.map((item, idx) => ({
    id: createPointId('pp', item.name),
    name: item.name,
    sequence: idx + 1,
    pickupTime: item.time,
    active: true,
  }))
}

export function buildDropPoints(rawNames: string[]): DropPoint[] {
  return rawNames.map((name, idx) => ({
    id: createPointId('dp', name),
    name,
    sequence: idx + 1,
    active: true,
  }))
}

const STATIC_TIMESTAMP = '2026-11-17T00:00:00.000Z'

export const SEED_ROUTES: Record<RouteId, Route> = {
  ahilyanagar_to_pune: {
    routeId: 'ahilyanagar_to_pune',
    fromCity: 'Ahilyanagar',
    toCity: 'Pune',
    label: 'Ahilyanagar → Pune',
    active: true,
    version: 1,
    updatedAt: STATIC_TIMESTAMP,
    pickupPoints: buildPickupPoints(AHILYANAGAR_PICKUP_RAW),
    dropPoints: buildDropPoints(PUNE_DROP_RAW),
  },
  pune_to_ahilyanagar: {
    routeId: 'pune_to_ahilyanagar',
    fromCity: 'Pune',
    toCity: 'Ahilyanagar',
    label: 'Pune → Ahilyanagar',
    active: true,
    version: 1,
    updatedAt: STATIC_TIMESTAMP,
    pickupPoints: buildPickupPoints(PUNE_PICKUP_RAW),
    dropPoints: buildDropPoints(AHILYANAGAR_PICKUP_RAW.map((p) => p.name)),
  },
  nagar_to_pune: {
    routeId: 'nagar_to_pune',
    fromCity: 'Nagar',
    toCity: 'Pune',
    label: 'Nagar → Pune',
    active: false,
    version: 1,
    updatedAt: STATIC_TIMESTAMP,
    pickupPoints: [],
    dropPoints: [],
  },
  pune_to_nagar: {
    routeId: 'pune_to_nagar',
    fromCity: 'Pune',
    toCity: 'Nagar',
    label: 'Pune → Nagar',
    active: false,
    version: 1,
    updatedAt: STATIC_TIMESTAMP,
    pickupPoints: [],
    dropPoints: [],
  },
}

export function getSeedRoute(fromOrRouteId: string, toCity?: string): Route | null {
  const canonicalId = resolveRouteId(fromOrRouteId, toCity)
  if (!canonicalId) return null
  const route = SEED_ROUTES[canonicalId]
  if (!route) return null
  // Return a cloned copy so modifications won't mutate the seed definition
  return JSON.parse(JSON.stringify(route))
}

export function getAllSeedRoutes(): Route[] {
  return Object.values(SEED_ROUTES).map((r) => JSON.parse(JSON.stringify(r)))
}
