import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  getExpectedAdminToken,
  isValidAdminSecret,
  requireAdmin,
} from '../lib/server/admin-guard'

// Mock Firestore for Admin Operations
const mockUsersDb = new Map<string, any>()
const mockAvailabilityDb = new Map<string, any>()

vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: vi.fn(() => ({
    collection: (col: string) => ({
      get: async () => {
        if (col === 'users') {
          return {
            docs: Array.from(mockUsersDb.entries()).map(([id, data]) => ({
              id,
              data: () => data,
            })),
          }
        }
        return { docs: [] }
      },
      doc: (id: string) => ({
        get: async () => {
          if (col === 'availability') {
            const exists = mockAvailabilityDb.has(id)
            return {
              exists,
              data: () => (exists ? mockAvailabilityDb.get(id) : undefined),
            }
          }
          const exists = mockUsersDb.has(id)
          return {
            exists,
            data: () => (exists ? mockUsersDb.get(id) : undefined),
          }
        },
        update: async (data: any) => {
          if (col === 'users') {
            if (!mockUsersDb.has(id)) throw new Error('NOT_FOUND')
            mockUsersDb.set(id, { ...mockUsersDb.get(id), ...data })
          }
          return {}
        },
        set: async (data: any, options?: { merge?: boolean }) => {
          if (col === 'availability') {
            const existing = mockAvailabilityDb.get(id) || { trips: {} }
            if (options?.merge) {
              mockAvailabilityDb.set(id, {
                ...existing,
                ...data,
                trips: { ...existing.trips, ...data.trips },
              })
            } else {
              mockAvailabilityDb.set(id, data)
            }
          }
          return {}
        },
      }),
    }),
  })),
}))

import { POST as authPostHandler, GET as authGetHandler, DELETE as authDeleteHandler } from '../app/api/admin/auth/route'
import { GET as adminUsersGetHandler } from '../app/api/admin/users/route'
import { PATCH as adminUserPatchHandler } from '../app/api/admin/users/[uid]/route'
import { GET as adminAvailGetHandler, PATCH as adminAvailPatchHandler } from '../app/api/admin/availability/route'

describe('Admin Panel Backend & Security', () => {
  const secretKey = 'uday_admin_secret_2026'
  const validToken = getExpectedAdminToken()

  beforeEach(() => {
    mockUsersDb.clear()
    mockAvailabilityDb.clear()
    // Seed sample test traveler
    mockUsersDb.set('usr-1', {
      name: 'Ramesh Kulkarni',
      mobile: '9822098220',
      age: 35,
      gender: 'man',
      createdAt: '2026-11-10T10:00:00.000Z',
    })
  })

  describe('Admin Guard (requireAdmin)', () => {
    it('approves request with valid Authorization Bearer token', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${validToken}` },
      })
      const result = await requireAdmin(req)
      expect(result.success).toBe(true)
    })

    it('approves request with valid cookie session', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/users', {
        headers: { Cookie: `uday_admin_token=${validToken}` },
      })
      const result = await requireAdmin(req)
      expect(result.success).toBe(true)
    })

    it('rejects request with invalid token', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: 'Bearer wrong-token-123' },
      })
      const result = await requireAdmin(req)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(401)
      }
    })

    it('rejects request with missing credentials', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/users')
      const result = await requireAdmin(req)
      expect(result.success).toBe(false)
    })
  })

  describe('Admin Auth API (/api/admin/auth)', () => {
    it('authenticates correct secret key and sets HTTP-only session cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey }),
      })

      const res = await authPostHandler(req)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)

      const cookie = res.cookies.get('uday_admin_token')
      expect(cookie).toBeDefined()
      expect(cookie?.value).toBe(validToken)
    })

    it('rejects incorrect secret key with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: 'incorrect-secret' }),
      })

      const res = await authPostHandler(req)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error.code).toBe('INVALID_CREDENTIALS')
    })
  })

  describe('Admin Users Management API', () => {
    it('retrieves user directory for authenticated admin', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${validToken}` },
      })

      const res = await adminUsersGetHandler(req)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(Array.isArray(json.users)).toBe(true)
      expect(json.users.length).toBe(1)
      expect(json.users[0].name).toBe('Ramesh Kulkarni')
    })

    it('edits user profile details via PATCH /api/admin/users/[uid]', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/users/usr-1', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Ramesh Kulkarni Updated',
          age: 36,
          mobile: '9822098221',
          gender: 'man',
        }),
      })

      const res = await adminUserPatchHandler(req, { params: Promise.resolve({ uid: 'usr-1' }) })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)

      expect(mockUsersDb.get('usr-1').name).toBe('Ramesh Kulkarni Updated')
      expect(mockUsersDb.get('usr-1').age).toBe(36)
      expect(mockUsersDb.get('usr-1').mobile).toBe('9822098221')
    })
  })

  describe('Admin Bus Availability API (Date-Wise Editing)', () => {
    const testDate = '2026-11-20'

    it('retrieves date-wise trips and capacity', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/admin/availability?route=AHM_PUN&date=${testDate}`,
        {
          headers: { Authorization: `Bearer ${validToken}` },
        }
      )

      const res = await adminAvailGetHandler(req)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.route).toBe('AHM_PUN')
      expect(json.date).toBe(testDate)
      expect(json.trips.length).toBe(0) // starts clean with 0 buses until admin creates them
    })

    it('allows admin to edit booked seat counts for a trip', async () => {
      // First seed a trip for the date
      mockAvailabilityDb.set(`AHM_PUN_${testDate}`, {
        route: 'AHM_PUN',
        date: testDate,
        trips: {
          AHM_PUN_0600: {
            tripId: 'AHM_PUN_0600',
            busName: 'Uday Express 01',
            booked: 0,
            totalSeats: 50,
          },
        },
      })

      const patchReq = new NextRequest('http://localhost:3000/api/admin/availability', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'AHM_PUN',
          date: testDate,
          tripId: 'AHM_PUN_0600',
          booked: 38,
        }),
      })

      const patchRes = await adminAvailPatchHandler(patchReq)
      expect(patchRes.status).toBe(200)

      const patchJson = await patchRes.json()
      expect(patchJson.success).toBe(true)
      expect(patchJson.booked).toBe(38)
      expect(patchJson.seatsLeft).toBe(12) // 50 - 38

      // Verify subsequent GET reflects the change
      const getReq = new NextRequest(
        `http://localhost:3000/api/admin/availability?route=AHM_PUN&date=${testDate}`,
        {
          headers: { Authorization: `Bearer ${validToken}` },
        }
      )
      const getRes = await adminAvailGetHandler(getReq)
      const getJson = await getRes.json()

      const trip0600 = getJson.trips.find((t: any) => t.tripId === 'AHM_PUN_0600')
      expect(trip0600.booked).toBe(38)
      expect(trip0600.seatsLeft).toBe(12)
    })
  })
})
