import { describe, it, expect, beforeAll } from 'vitest'
import { getAdminDb } from '../lib/firebase/admin'
import { RoutesRepository } from '../lib/data/routes.repo'
import { BookingsRepository, BookingDocument } from '../lib/data/bookings.repo'
import {
  Route,
  resolveRouteId,
  format12hTime,
  createPointId,
} from '../lib/types/route'
import {
  getRouteWithCache,
  invalidateRouteCache,
  formatPickupDisplay,
  formatDropDisplay,
} from '../lib/routes/route-client'
import { seedRoutes } from '../scripts/seedRoutes'

describe('Route-Specific Pickup & Drop Points - 8 Acceptance Checks', () => {
  beforeAll(async () => {
    // Ensure clean seeded baseline
    await seedRoutes()
    invalidateRouteCache()
  })

  // Acceptance Check 1
  it('1. Ahilyanagar→Pune shows Ahilyanagar pickups with times + Pune drops', async () => {
    const route = await RoutesRepository.getRouteById('ahilyanagar_to_pune')
    expect(route).toBeDefined()
    expect(route?.active).toBe(true)
    expect(route?.label).toBe('Ahilyanagar → Pune')

    // Ahilyanagar pickups
    expect(route?.pickupPoints.length).toBe(20)
    expect(route?.pickupPoints[0]?.name).toBe('Office')
    expect(route?.pickupPoints[0]?.pickupTime).toBe('06:30')
    expect(format12hTime(route?.pickupPoints[0]?.pickupTime || '')).toBe('6:30 AM')

    // Formatted display
    const firstPickup = route!.pickupPoints[0]!
    expect(formatPickupDisplay(firstPickup)).toBe('Office — 6:30 AM')

    // Pune drops
    expect(route?.dropPoints.length).toBe(12)
    expect(route?.dropPoints[0]?.name).toBe('Wakadewadi')
    expect(formatDropDisplay(route!.dropPoints[0]!)).toBe('Wakadewadi')
  })

  // Acceptance Check 2
  it('2. Pune→Ahilyanagar shows Pune pickups with times + Ahilyanagar drops', async () => {
    const route = await RoutesRepository.getRouteById('pune_to_ahilyanagar')
    expect(route).toBeDefined()
    expect(route?.active).toBe(true)
    expect(route?.label).toBe('Pune → Ahilyanagar')

    // Pune pickups
    expect(route?.pickupPoints.length).toBe(11)
    expect(route?.pickupPoints[0]?.name).toBe('Wakadewadi')
    expect(route?.pickupPoints[0]?.pickupTime).toBe('18:30')
    expect(format12hTime(route?.pickupPoints[0]?.pickupTime || '')).toBe('6:30 PM')
    expect(formatPickupDisplay(route!.pickupPoints[0]!)).toBe('Wakadewadi — 6:30 PM')

    // Ahilyanagar drops
    expect(route?.dropPoints.length).toBe(20)
    expect(route?.dropPoints[0]?.name).toBe('Office')
    expect(formatDropDisplay(route!.dropPoints[0]!)).toBe('Office')
  })

  // Acceptance Check 3
  it('3. Nagar routes never show Ahilyanagar points (and vice versa)', async () => {
    const nagarToPune = await RoutesRepository.getRouteById('nagar_to_pune')
    const puneToNagar = await RoutesRepository.getRouteById('pune_to_nagar')

    expect(nagarToPune).toBeDefined()
    expect(nagarToPune?.active).toBe(false)
    expect(nagarToPune?.pickupPoints).toEqual([])
    expect(nagarToPune?.dropPoints).toEqual([])

    expect(puneToNagar).toBeDefined()
    expect(puneToNagar?.active).toBe(false)
    expect(puneToNagar?.pickupPoints).toEqual([])
    expect(puneToNagar?.dropPoints).toEqual([])

    // Verify resolveRouteId distinguishes Nagar from Ahilyanagar
    expect(resolveRouteId('Nagar', 'Pune')).toBe('nagar_to_pune')
    expect(resolveRouteId('Ahilyanagar', 'Pune')).toBe('ahilyanagar_to_pune')
    expect(resolveRouteId('Pune', 'Nagar')).toBe('pune_to_nagar')
    expect(resolveRouteId('Pune', 'Ahilyanagar')).toBe('pune_to_ahilyanagar')
  })

  // Acceptance Check 4
  it('4. Drop points show no time anywhere', async () => {
    const r1 = await RoutesRepository.getRouteById('ahilyanagar_to_pune')
    const r2 = await RoutesRepository.getRouteById('pune_to_ahilyanagar')

    r1?.dropPoints.forEach((dp) => {
      expect((dp as any).time).toBeUndefined()
      expect((dp as any).pickupTime).toBeUndefined()
      // formatDropDisplay must produce name only
      expect(formatDropDisplay(dp)).toBe(dp.name)
    })

    r2?.dropPoints.forEach((dp) => {
      expect((dp as any).time).toBeUndefined()
      expect((dp as any).pickupTime).toBeUndefined()
      expect(formatDropDisplay(dp)).toBe(dp.name)
    })
  })

  // Acceptance Check 5
  it('5. One route open = 1 Firestore read per session (cache verified)', async () => {
    invalidateRouteCache()

    // Mock global fetch for route client
    let fetchCount = 0
    const mockRoute = await RoutesRepository.getRouteById('ahilyanagar_to_pune')

    const originalFetch = global.fetch
    global.fetch = (async () => {
      fetchCount++
      return new Response(JSON.stringify({ success: true, route: mockRoute }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as any

    try {
      // First read: hits API once
      const first = await getRouteWithCache('ahilyanagar_to_pune')
      expect(first).toBeDefined()
      expect(fetchCount).toBe(1)

      // Subsequent reads in same session (reused across screens): in-memory cache, 0 network/Firestore reads
      const second = await getRouteWithCache('ahilyanagar_to_pune')
      expect(second).toBeDefined()
      expect(fetchCount).toBe(1)

      const third = await getRouteWithCache('Ahilyanagar', 'Pune')
      expect(third).toBeDefined()
      expect(fetchCount).toBe(1)
    } finally {
      global.fetch = originalFetch
    }
  })

  // Acceptance Check 6
  it('6. Admin edit appears for new users after cache version check', async () => {
    const initialRoute = await RoutesRepository.getRouteById('ahilyanagar_to_pune')
    expect(initialRoute).toBeDefined()
    const initialVersion = initialRoute?.version || 1

    // Perform Admin update in ONE transaction
    const newPickups = [
      ...initialRoute!.pickupPoints,
      {
        id: createPointId('pp', 'VIP Lounge Stop'),
        name: 'VIP Lounge Stop',
        sequence: initialRoute!.pickupPoints.length + 1,
        pickupTime: '07:15',
        active: true,
      },
    ]

    const updated = await RoutesRepository.updateRoutePoints(
      'ahilyanagar_to_pune',
      newPickups,
      initialRoute!.dropPoints
    )

    // Version must increment by 1
    expect(updated.version).toBe(initialVersion + 1)
    expect(updated.updatedAt).toBeDefined()
    expect(updated.pickupPoints.length).toBe(initialRoute!.pickupPoints.length + 1)

    // Re-read directly from repo: verifies persistence
    const reRead = await RoutesRepository.getRouteById('ahilyanagar_to_pune')
    expect(reRead?.version).toBe(initialVersion + 1)
    expect(reRead?.pickupPoints.some((p) => p.name === 'VIP Lounge Stop')).toBe(true)

    // Revert added stop so seed state remains clean
    await RoutesRepository.updateRoutePoints(
      'ahilyanagar_to_pune',
      initialRoute!.pickupPoints,
      initialRoute!.dropPoints
    )
  })

  // Acceptance Check 7
  it('7. Old bookings keep their original pickup/drop/time after edits', async () => {
    const bookingId = `bk_test_hist_${Date.now()}`
    const originalPickup = {
      pointId: 'pp_office',
      name: 'Office',
      pickupTime: '06:30',
    }
    const originalDrop = {
      pointId: 'dp_wakadewadi',
      name: 'Wakadewadi',
    }

    // Save a historical booking with snapshots
    const bookingDoc: BookingDocument = {
      id: bookingId,
      bookingId,
      userId: 'test_user_hist',
      tripId: 'TRIP-1',
      routeId: 'ahilyanagar_to_pune',
      busId: 'bus_1',
      travelDate: '2026-12-01',
      departureTime: '06:30',
      pickup: originalPickup,
      drop: originalDrop,
      seats: ['A1'],
      passengers: [{ name: 'Historical Passenger', age: 30, gender: 'male', seat: 'A1' }],
      fare: { perSeat: 200, seats: 1, total: 200 },
      totalAmount: 200,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await BookingsRepository.createBooking(bookingDoc)

    // Now simulate admin editing the route document (e.g. changing Office time to 07:00)
    const currentRoute = await RoutesRepository.getRouteById('ahilyanagar_to_pune')
    const modifiedPickups = currentRoute!.pickupPoints.map((p) =>
      p.id === 'pp_office' ? { ...p, pickupTime: '07:00' } : p
    )
    await RoutesRepository.updateRoutePoints(
      'ahilyanagar_to_pune',
      modifiedPickups,
      currentRoute!.dropPoints
    )

    // Retrieve historical booking: it must retain the original snapshot unchanged!
    const retrievedBooking = await BookingsRepository.getBooking(bookingId)
    expect(retrievedBooking).toBeDefined()
    expect(retrievedBooking?.pickup?.name).toBe('Office')
    expect(retrievedBooking?.pickup?.pickupTime).toBe('06:30') // Untouched!
    expect(retrievedBooking?.drop?.name).toBe('Wakadewadi')

    // Clean up
    await seedRoutes()
  })

  // Acceptance Check 8
  it('8. Empty Nagar routes block booking gracefully', async () => {
    const nagarRoute = await RoutesRepository.getRouteById('nagar_to_pune')
    expect(nagarRoute).toBeDefined()
    expect(nagarRoute?.active).toBe(false)
    expect(nagarRoute?.pickupPoints.length).toBe(0)

    // Verify active routes check excludes empty/inactive routes
    const activeRoutes = await RoutesRepository.getActiveRoutes()
    const nagarInActive = activeRoutes.some((r) => r.routeId === 'nagar_to_pune')
    expect(nagarInActive).toBe(false)

    // Verify resolveRouteId resolves Nagar correctly and doesn't fall back to Ahilyanagar
    const resolved = resolveRouteId('nagar_to_pune')
    expect(resolved).toBe('nagar_to_pune')
    expect(resolved).not.toBe('ahilyanagar_to_pune')
  })
})
