import { describe, it, expect } from 'vitest'
import { seedRoutes } from '../scripts/seedRoutes'
import { getAdminDb } from '../lib/firebase/admin'
import { Route } from '../lib/types/route'

describe('Route-Specific Pickup & Drop Points Seeding', () => {
  it('seeds all 4 routes idempotently', async () => {
    await seedRoutes()
    const db = getAdminDb()

    // 1. Check ahilyanagar_to_pune
    const snap1 = await db.collection('routes').doc('ahilyanagar_to_pune').get()
    expect(snap1.exists).toBe(true)
    const r1 = snap1.data() as Route
    expect(r1.active).toBe(true)
    expect(r1.label).toBe('Ahilyanagar → Pune')
    expect(r1.pickupPoints.length).toBe(20)
    expect(r1.pickupPoints[0]!.name).toBe('Office')
    expect(r1.pickupPoints[0]!.pickupTime).toBe('06:30')
    expect(r1.dropPoints.length).toBe(12)
    expect(r1.dropPoints[0]!.name).toBe('Wakadewadi')
    // Ensure drop points have NO time property
    expect((r1.dropPoints[0] as any).pickupTime).toBeUndefined()
    expect((r1.dropPoints[0] as any).time).toBeUndefined()

    // 2. Check pune_to_ahilyanagar
    const snap2 = await db.collection('routes').doc('pune_to_ahilyanagar').get()
    expect(snap2.exists).toBe(true)
    const r2 = snap2.data() as Route
    expect(r2.active).toBe(true)
    expect(r2.label).toBe('Pune → Ahilyanagar')
    expect(r2.pickupPoints.length).toBe(11)
    expect(r2.pickupPoints[0]!.name).toBe('Wakadewadi')
    expect(r2.pickupPoints[0]!.pickupTime).toBe('18:30')
    expect(r2.dropPoints.length).toBe(20)
    expect(r2.dropPoints[0]!.name).toBe('Office')
    expect((r2.dropPoints[0] as any).pickupTime).toBeUndefined()

    // 3. Check nagar_to_pune (EMPTY, active: false)
    const snap3 = await db.collection('routes').doc('nagar_to_pune').get()
    expect(snap3.exists).toBe(true)
    const r3 = snap3.data() as Route
    expect(r3.active).toBe(false)
    expect(r3.pickupPoints.length).toBe(0)
    expect(r3.dropPoints.length).toBe(0)

    // 4. Check pune_to_nagar (EMPTY, active: false)
    const snap4 = await db.collection('routes').doc('pune_to_nagar').get()
    expect(snap4.exists).toBe(true)
    const r4 = snap4.data() as Route
    expect(r4.active).toBe(false)
    expect(r4.pickupPoints.length).toBe(0)
    expect(r4.dropPoints.length).toBe(0)
  })
})
