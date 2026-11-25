import fs from 'node:fs'
import path from 'node:path'

const DEV_STORAGE_FILE = path.join(process.cwd(), '.dev-firestore-store.json')

const DEFAULT_BUSES = [
  {
    id: 'bus_mh16dp4951',
    busNumber: 'MH 16 DP 4951',
    busName: 'Uday Express 55-Seater (2+3 Layout)',
    templateId: 'BUS_55',
    seatLayout: '2+3 Seater',
    totalSeats: 55,
    active: true,
    features: ['AC', 'Reading Light', 'Charging Point', 'Emergency Exit', 'Luggage Compartment'],
    driverName: 'Suresh Patil',
    driverMobile: '+91 98220 12345',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bus_mh16dv1003',
    busNumber: 'MH 16 DV 1003',
    busName: 'Uday Express 44-Seater (2+2 Layout)',
    templateId: 'BUS_44',
    seatLayout: '2+2 Seater',
    totalSeats: 44,
    active: true,
    features: ['AC', 'Reclining Push-Back Seats', 'USB Charging', 'Emergency Exit'],
    driverName: 'Ganesh More',
    driverMobile: '+91 98220 67890',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bus_mh16dp3951',
    busNumber: 'MH 16 DP 3951',
    busName: 'Uday Express 33-Seater (2+2 Layout)',
    templateId: 'BUS_33',
    seatLayout: '2+2 Seater',
    totalSeats: 33,
    active: true,
    features: ['AC', 'Push-Back Seats', 'USB Ports'],
    driverName: 'Kailas Shinde',
    driverMobile: '+91 98220 54321',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export async function wipeAllFirebaseData() {
  console.log('========================================================================')
  console.log('[FIREBASE DATA PURGE] Starting complete purge of previous Firebase data...')
  console.log('========================================================================')

  const stats = {}
  let totalDocs = 0

  if (fs.existsSync(DEV_STORAGE_FILE)) {
    try {
      const raw = fs.readFileSync(DEV_STORAGE_FILE, 'utf-8')
      const existing = JSON.parse(raw)
      totalDocs = Object.keys(existing).length
      for (const key of Object.keys(existing)) {
        const col = key.split('/')[0] || 'other'
        stats[col] = (stats[col] || 0) + 1
      }
      console.log(`Found ${totalDocs} existing records across collections:`)
      console.table(stats)
    } catch (err) {
      console.warn('Could not read existing store:', err)
    }
  }

  // Create clean slate: keep only default fleet buses
  const cleanStore = {}
  for (const bus of DEFAULT_BUSES) {
    cleanStore[`buses/${bus.id}`] = bus
  }

  fs.writeFileSync(DEV_STORAGE_FILE, JSON.stringify(cleanStore, null, 2), 'utf-8')

  console.log('------------------------------------------------------------------------')
  console.log(`✓ Purged ${totalDocs} previous documents:`)
  console.log('  - All previous tickets deleted')
  console.log('  - All previous bookings deleted')
  console.log('  - All previous orders & seat holds deleted')
  console.log('  - All previous payments & refunds deleted')
  console.log('  - All previous user accounts & wallets deleted')
  console.log('  - All previous seat public & bus seats allocations reset')
  console.log('  - All previous trip manifests & availability entries purged')
  console.log('  - Clean fleet master buses preserved (MH 16 DP 4951, MH 16 DV 1003, MH 16 DP 3951)')
  console.log('========================================================================')
  console.log('[FIREBASE DATA PURGE] Complete. Database is now in a 100% pristine state.')
  console.log('========================================================================')
}

wipeAllFirebaseData().catch((err) => {
  console.error('Purge error:', err)
  process.exit(1)
})
