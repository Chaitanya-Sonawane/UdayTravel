import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getSeatsHandler } from '@/app/api/seats/route'
import {
  GET as getAdminAvailabilityHandler,
  PATCH as patchAdminAvailabilityHandler,
  POST as postAdminAvailabilityHandler,
} from '@/app/api/admin/availability/route'
import { GET as getUserAvailabilityHandler } from '@/app/api/availability/route'
import { getExpectedAdminToken } from '@/lib/server/admin-guard'

// Mock requireUser to simulate authenticated passenger
vi.mock('@/lib/server/guard', () => ({
  requireUser: vi.fn(async () => ({
    success: true,
    uid: 'traveler-uid-789',
    token: { uid: 'traveler-uid-789' },
  })),
}))

// Mock Next.js cache revalidateTag
vi.mock('next/cache', () => ({
  unstable_cache: (fn: Function) => fn,
  revalidateTag: vi.fn(),
}))

// Mock in-memory Firestore database
const mockFirestore = new Map<string, any>()

vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: vi.fn(() => ({
    collection: (col: string) => ({
      doc: (docId: string) => ({
        get: async () => {
          const key = `${col}/${docId}`
          const exists = mockFirestore.has(key)
          return {
            exists,
            data: () => (exists ? mockFirestore.get(key) : undefined),
          }
        },
        set: async (data: any, options?: { merge?: boolean }) => {
          const key = `${col}/${docId}`
          const existing = mockFirestore.get(key) || {}
          if (options?.merge) {
            mockFirestore.set(key, {
              ...existing,
              ...data,
              trips: data.trips !== undefined ? data.trips : existing.trips,
              customTrips: data.customTrips !== undefined ? data.customTrips : existing.customTrips,
            })
          } else {
            mockFirestore.set(key, data)
          }
          return { id: docId }
        },
      }),
    }),
  })),
}))

describe('Bus Schedules & Seat Chart System (Admin <-> User Flow)', () => {
  const adminToken = getExpectedAdminToken()
  const testDate = '2026-11-25'
  const route = 'AHM_PUN'

  beforeEach(() => {
    mockFirestore.clear()
  })

  it('allows Admin to create a custom bus schedule and reflects it in Firestore', async () => {
    const postReq = new NextRequest('http://localhost:3000/api/admin/availability', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route,
        date: testDate,
        busName: 'Uday Royal AC Special',
        departureTime: '18:30',
        arrivalTime: '21:15',
        fare: 250,
        totalSeats: 50,
      }),
    })

    const res = await postAdminAvailabilityHandler(postReq)
    expect(res.status).toBe(201)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.trip.busName).toBe('Uday Royal AC Special')
    expect(json.trip.tripId).toBe('AHM_PUN_1830')
    expect(json.trip.fare).toBe(250)

    // Verify stored in mock Firestore
    const stored = mockFirestore.get(`availability/${route}_${testDate}`)
    expect(stored).toBeDefined()
    expect(stored.trips['AHM_PUN_1830']).toBeDefined()
    expect(stored.trips['AHM_PUN_1830'].busName).toBe('Uday Royal AC Special')
  })

  it('allows Admin to configure individual seats on the seat chart and recalculates booked count', async () => {
    // Admin sets seat A1 as female, A2 as male, and B1 as blocked (3 booked seats total)
    const patchReq = new NextRequest('http://localhost:3000/api/admin/availability', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route,
        date: testDate,
        tripId: 'AHM_PUN_0600',
        busName: 'Uday Express 01',
        seats: {
          A1: 'female',
          A2: 'male',
          B1: 'blocked',
          A3: 'available',
        },
      }),
    })

    const patchRes = await patchAdminAvailabilityHandler(patchReq)
    expect(patchRes.status).toBe(200)
    const data = await patchRes.json()

    expect(data.success).toBe(true)
    expect(data.booked).toBe(3)
    expect(data.seatsLeft).toBe(47)
    expect(data.seats.A1).toBe('female')
    expect(data.seats.A2).toBe('male')
    expect(data.seats.B1).toBe('blocked')
  })

  it('serves the exact Admin-configured seat chart to the User via /api/seats', async () => {
    // 1. Setup mock Firestore with customized seats
    mockFirestore.set(`availability/${route}_${testDate}`, {
      route,
      date: testDate,
      trips: {
        AHM_PUN_0600: {
          tripId: 'AHM_PUN_0600',
          busName: 'Uday Express 01',
          departureTime: '06:00',
          arrivalTime: '08:45',
          fare: 200,
          totalSeats: 50,
          booked: 2,
          seats: {
            A1: 'female',
            A2: 'male',
            C1: 'available',
          },
        },
      },
    })

    // 2. User queries /api/seats
    const userReq = new NextRequest(
      `http://localhost:3000/api/seats?route=${route}&date=${testDate}&tripId=AHM_PUN_0600`,
      {
        headers: {
          Authorization: 'Bearer user-token',
        },
      }
    )

    const res = await getSeatsHandler(userReq)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.busName).toBe('Uday Express 01')
    expect(json.seats.A1).toBe('female')
    expect(json.seats.A2).toBe('male')
    expect(json.seats.C1).toBe('available')
    expect(json.totalSeats).toBe(50)
  })

  it('reflects Admin-created custom buses on the User availability list (/api/availability)', async () => {
    // 1. Admin adds custom evening bus
    mockFirestore.set(`availability/${route}_${testDate}`, {
      route,
      date: testDate,
      customTrips: [
        {
          tripId: 'AHM_PUN_2000',
          busName: 'Uday Night Express',
          departureTime: '20:00',
          arrivalTime: '22:45',
          duration: '02h 45m',
          fare: 220,
          totalSeats: 50,
          booked: 5,
        },
      ],
    })

    // 2. User queries /api/availability
    const userReq = new NextRequest(
      `http://localhost:3000/api/availability?route=${route}&date=${testDate}`,
      {
        headers: {
          Authorization: 'Bearer user-token',
        },
      }
    )

    const res = await getUserAvailabilityHandler(userReq)
    expect(res.status).toBe(200)
    const json = await res.json()

    const nightBus = json.trips.find((t: any) => t.tripId === 'AHM_PUN_2000')
    expect(nightBus).toBeDefined()
    expect(nightBus.busName).toBe('Uday Night Express')
    expect(nightBus.seatsLeft).toBe(45)
    expect(nightBus.fare).toBe(220)
    expect(nightBus.status).toBe('available')
  })

  it('allows Admin to delete a bus schedule from Firestore', async () => {
    // 1. Setup doc with a trip
    mockFirestore.set(`availability/${route}_${testDate}`, {
      route,
      date: testDate,
      trips: {
        AHM_PUN_1830: {
          tripId: 'AHM_PUN_1830',
          busName: 'Uday Royal AC Special',
        },
      },
    })

    // 2. Admin calls DELETE
    const delReq = new NextRequest(
      `http://localhost:3000/api/admin/availability?route=${route}&date=${testDate}&tripId=AHM_PUN_1830`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    )

    const { DELETE: deleteAdminAvailabilityHandler } = await import(
      '@/app/api/admin/availability/route'
    )
    const delRes = await deleteAdminAvailabilityHandler(delReq)
    expect(delRes.status).toBe(200)

    const delJson = await delRes.json()
    expect(delJson.success).toBe(true)

    const stored = mockFirestore.get(`availability/${route}_${testDate}`)
    expect(stored.trips.AHM_PUN_1830).toBeUndefined()
  })
})
