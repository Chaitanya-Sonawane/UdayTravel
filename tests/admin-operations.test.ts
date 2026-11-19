import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getManifest, PATCH as patchManifest } from '@/app/api/admin/manifest/route'
import { GET as searchTickets } from '@/app/api/admin/tickets/route'
import { POST as overrideCancel } from '@/app/api/admin/override-cancel/route'
import { POST as manualBooking } from '@/app/api/admin/manual-booking/route'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { getAdminDb } from '@/lib/firebase/admin'

describe('Admin Panel Operations API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('GET /api/admin/manifest returns 400 when tripId is missing', async () => {
    const req = new Request('http://localhost:3000/api/admin/manifest')
    const res = await getManifest(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe('INVALID_INPUT')
  })

  it('GET /api/admin/tickets returns list of tickets', async () => {
    vi.spyOn(TicketsRepository, 'searchTickets').mockResolvedValueOnce([
      {
        ticketNo: 'UT-20261118-TEST1',
        tripId: 'AHM_PUN_0600',
        routeId: 'AHM_PUN',
        travelDate: '2026-11-18',
        busNumber: 'MH 16 DP 4951',
        busName: 'Uday Express',
        seatLayout: '3+2 Seater Coach',
        pickup: { name: 'Maliwada Stand', pickupTime: '06:00' },
        drop: { name: 'Wakadewadi, Pune', dropTime: '08:45' },
        passengers: [{ seat: 'A1', name: 'Ramesh Patil', age: 35, gender: 'male' }],
        contactMobile: '9822011111',
        fare: { perSeatPaise: 20000, seats: 1, taxesPaise: 0, totalPaise: 20000 },
        payment: { method: 'CASH', totalPaidPaise: 20000, feePaise: 0 },
        status: 'CONFIRMED',
        bookedAt: new Date().toISOString(),
      } as any,
    ])

    const req = new Request('http://localhost:3000/api/admin/tickets?q=Ramesh')
    const res = await searchTickets(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.count).toBe(1)
    expect(data.tickets[0].ticketNo).toBe('UT-20261118-TEST1')
  })

  it('POST /api/admin/override-cancel validates payload schema', async () => {
    const req = new Request('http://localhost:3000/api/admin/override-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketNo: '' }),
    })
    const res = await overrideCancel(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe('INVALID_INPUT')
  })

  it('POST /api/admin/manual-booking validates payload missing seats', async () => {
    const req = new Request('http://localhost:3000/api/admin/manual-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: 'AHM_PUN_0600',
        routeId: 'AHM_PUN',
        travelDate: '2026-11-18',
        busNumber: 'MH 16 DP 4951',
        seats: [],
        passengers: [],
        contactMobile: '9822011111',
      }),
    })
    const res = await manualBooking(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe('INVALID_INPUT')
  })
})
