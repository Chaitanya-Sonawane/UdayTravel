import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the guard to authenticate requests cleanly during unit test execution
vi.mock('@/lib/server/guard', () => ({
  requireUser: vi.fn(async () => ({
    success: true,
    uid: 'test-traveler-uid-456',
    token: { uid: 'test-traveler-uid-456' },
  })),
}))

// Mock Next.js unstable_cache to verify caching behaviour directly
let cacheStore: Record<string, any> = {}
let cacheReadCount = 0

vi.mock('next/cache', () => ({
  unstable_cache: (fn: Function, keys: string[]) => {
    return async (...args: any[]) => {
      const cacheKey = `${keys.join(':')}:${args.join(':')}`
      if (cacheStore[cacheKey] !== undefined) {
        return cacheStore[cacheKey]
      }
      cacheReadCount++
      const result = await fn(...args)
      cacheStore[cacheKey] = result
      return result
    }
  },
}))

// Mock Firebase Admin Firestore
const mockUsersStore = new Map<string, any>()
const mockAvailabilityStore = new Map<string, any>()

vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: vi.fn(() => ({
    collection: (colName: string) => ({
      doc: (docId: string) => ({
        create: async (data: any) => {
          if (colName === 'users') {
            if (mockUsersStore.has(docId)) {
              const err: any = new Error('7 ALREADY_EXISTS: Document already exists')
              err.code = 6
              throw err
            }
            mockUsersStore.set(docId, data)
            return { id: docId }
          }
        },
        update: async (data: any) => {
          if (colName === 'users') {
            if (!mockUsersStore.has(docId)) {
              throw new Error('5 NOT_FOUND: Document not found')
            }
            mockUsersStore.set(docId, { ...mockUsersStore.get(docId), ...data })
            return {}
          }
        },
        get: async () => {
          if (colName === 'availability') {
            const exists = mockAvailabilityStore.has(docId)
            return {
              exists,
              data: () => (exists ? mockAvailabilityStore.get(docId) : undefined),
            }
          }
          return { exists: false, data: () => undefined }
        },
      }),
    }),
  })),
  getAdminAuth: vi.fn(),
  getAdminAppCheck: vi.fn(),
}))

import { POST as accountPostHandler } from '../app/api/account/route'
import { GET as availabilityGetHandler } from '../app/api/availability/route'
import { todayIST } from '../lib/time/ist'

describe('API Route Handlers (Account & Availability)', () => {
  beforeEach(() => {
    mockUsersStore.clear()
    mockAvailabilityStore.clear()
    cacheStore = {}
    cacheReadCount = 0
  })

  describe('POST /api/account idempotency & ALREADY_EXISTS behavior', () => {
    const validBody = {
      name: 'Sunil Gavaskar',
      mobile: '9822198221',
      age: 45,
      gender: 'man',
    }

    it('creates account on first call and returns { created: true } with status 201', async () => {
      const req = new NextRequest('http://localhost:3000/api/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(validBody),
      })

      const res = await accountPostHandler(req)
      expect(res.status).toBe(201)

      const json = await res.json()
      expect(json.created).toBe(true)
      expect(json.profile.name).toBe('Sunil Gavaskar')
      expect(mockUsersStore.has('test-traveler-uid-456')).toBe(true)
    })

    it('returns 200 with { created: false } on second call without overwriting (0 reads, 1 write)', async () => {
      // First call: creates
      const req1 = new NextRequest('http://localhost:3000/api/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(validBody),
      })
      const res1 = await accountPostHandler(req1)
      expect(res1.status).toBe(201)

      // Second call: user already exists in Firestore
      const req2 = new NextRequest('http://localhost:3000/api/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          ...validBody,
          name: 'Modified Name Attempt',
        }),
      })

      const res2 = await accountPostHandler(req2)
      expect(res2.status).toBe(200)

      const json2 = await res2.json()
      expect(json2.created).toBe(false)
      // Existing data in store was NOT overwritten
      expect(mockUsersStore.get('test-traveler-uid-456').name).toBe('Sunil Gavaskar')
    })
  })

  describe('GET /api/availability caching and data merge', () => {
    it('returns trip list and serves cached response on subsequent requests', async () => {
      const travelDate = todayIST()
      const docId = `AHM_PUN_${travelDate}`

      // Seed 10 booked seats for departure 0600
      mockAvailabilityStore.set(docId, {
        trips: {
          AHM_PUN_0600: { booked: 10 },
        },
        updatedAt: new Date().toISOString(),
      })

      const makeRequest = () =>
        new NextRequest(
          `http://localhost:3000/api/availability?route=AHM_PUN&date=${travelDate}`,
          {
            method: 'GET',
            headers: {
              Authorization: 'Bearer test-token',
            },
          }
        )

      // First call: populates cache
      const res1 = await availabilityGetHandler(makeRequest())
      expect(res1.status).toBe(200)
      const data1 = await res1.json()

      expect(data1.route).toBe('AHM_PUN')
      expect(data1.date).toBe(travelDate)
      expect(Array.isArray(data1.trips)).toBe(true)
      expect(data1.trips.length).toBe(1)

      const trip0600 = data1.trips.find((t: any) => t.tripId === 'AHM_PUN_0600')
      expect(trip0600).toBeDefined()
      expect(trip0600.seatsLeft).toBe(40) // 50 - 10 booked
      expect(trip0600.fare).toBe(200)

      expect(cacheReadCount).toBe(1)

      // Second call within 60s: served from cache
      const res2 = await availabilityGetHandler(makeRequest())
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.trips.length).toBe(1)

      // cacheReadCount did not increase!
      expect(cacheReadCount).toBe(1)
    })

    it('rejects invalid route with 400', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/availability?route=INVALID_ROUTE&date=${todayIST()}`,
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      )

      const res = await availabilityGetHandler(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('INVALID_REQUEST')
    })
  })
})
