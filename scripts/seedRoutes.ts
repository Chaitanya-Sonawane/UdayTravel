import { getAdminDb } from '../lib/firebase/admin'
import { createPointId, Route, PickupPoint, DropPoint } from '../lib/types/route'

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

export async function seedRoutes(): Promise<void> {
  const db = getAdminDb()
  const now = new Date().toISOString()

  // 1. ahilyanagar_to_pune
  const ahilyanagarToPune: Route = {
    routeId: 'ahilyanagar_to_pune',
    fromCity: 'Ahilyanagar',
    toCity: 'Pune',
    label: 'Ahilyanagar → Pune',
    active: true,
    version: 1,
    updatedAt: now,
    pickupPoints: buildPickupPoints(AHILYANAGAR_PICKUP_RAW),
    dropPoints: buildDropPoints(PUNE_DROP_RAW),
  }

  // 2. pune_to_ahilyanagar
  // Drop points: Same names/order as the Ahilyanagar pickup list (no times).
  const puneToAhilyanagar: Route = {
    routeId: 'pune_to_ahilyanagar',
    fromCity: 'Pune',
    toCity: 'Ahilyanagar',
    label: 'Pune → Ahilyanagar',
    active: true,
    version: 1,
    updatedAt: now,
    pickupPoints: buildPickupPoints(PUNE_PICKUP_RAW),
    dropPoints: buildDropPoints(AHILYANAGAR_PICKUP_RAW.map((p) => p.name)),
  }

  // 3. nagar_to_pune (EMPTY, active: false)
  const nagarToPune: Route = {
    routeId: 'nagar_to_pune',
    fromCity: 'Nagar',
    toCity: 'Pune',
    label: 'Nagar → Pune',
    active: false,
    version: 1,
    updatedAt: now,
    pickupPoints: [],
    dropPoints: [],
  }

  // 4. pune_to_nagar (EMPTY, active: false)
  const puneToNagar: Route = {
    routeId: 'pune_to_nagar',
    fromCity: 'Pune',
    toCity: 'Nagar',
    label: 'Pune → Nagar',
    active: false,
    version: 1,
    updatedAt: now,
    pickupPoints: [],
    dropPoints: [],
  }

  const routesToSeed: Route[] = [
    ahilyanagarToPune,
    puneToAhilyanagar,
    nagarToPune,
    puneToNagar,
  ]

  for (const r of routesToSeed) {
    const docRef = db.collection('routes').doc(r.routeId)
    await docRef.set(r, { merge: true })
    console.log(`[seedRoutes] Seeded route '${r.routeId}' (active: ${r.active}, pickups: ${r.pickupPoints.length}, drops: ${r.dropPoints.length})`)
  }

  // Optional legacy alias docs so legacy queries to routes/AHM_PUN and routes/PUN_AHM continue functioning
  await db.collection('routes').doc('AHM_PUN').set(ahilyanagarToPune, { merge: true })
  await db.collection('routes').doc('PUN_AHM').set(puneToAhilyanagar, { merge: true })
  console.log('[seedRoutes] Seeded legacy aliases AHM_PUN and PUN_AHM.')

  console.log('[seedRoutes] Successfully finished seeding all 4 route direction documents.')
}

if (require.main === module) {
  seedRoutes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seedRoutes] Error:', err)
      process.exit(1)
    })
}
