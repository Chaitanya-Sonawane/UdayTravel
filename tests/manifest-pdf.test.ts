import { describe, it, expect, vi } from 'vitest'
import { GET } from '../app/api/admin/manifest/pdf/route'
import { TicketsRepository } from '@/lib/data/tickets.repo'

describe('Passenger Manifest PDF Generation Route', () => {
  it('returns 400 when tripId is missing', async () => {
    const req = new Request('http://localhost:3000/api/admin/manifest/pdf')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.code).toBe('INVALID_INPUT')
  })

  it('generates valid PDF buffer when tripId and date are provided', async () => {
    vi.spyOn(TicketsRepository, 'listTicketsForTrip').mockResolvedValueOnce([
      {
        ticketNo: 'UT-TEST-PDF',
        tripId: 'AHM_PUN_0600',
        routeId: 'AHM_PUN',
        travelDate: '2026-11-19',
        busNumber: 'MH 16 DP 4951',
        busName: 'Uday Express',
        seatLayout: '3+2 Seater Coach',
        pickup: { name: 'Maliwada Stand', pickupTime: '06:00 AM' },
        drop: { name: 'Wakadewadi, Pune' },
        passengers: [{ seat: 'A1', name: 'Test Passenger', age: 30, gender: 'male' }],
        contactMobile: '9822012345',
        fare: { perSeatPaise: 22000, seats: 1, taxesPaise: 0, totalPaise: 22000 },
        payment: { method: 'Cash at Counter', paidAt: new Date().toISOString(), razorpayPaise: 22000, walletDebitPaise: 0 },
        status: 'CONFIRMED',
        bookedAt: new Date().toISOString(),
      } as any,
    ])

    const req = new Request('http://localhost:3000/api/admin/manifest/pdf?tripId=AHM_PUN_0600&date=2026-11-19')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('UdayTravels-Manifest-AHM_PUN_0600-2026-11-19.pdf')

    const arrayBuf = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)
    expect(buffer.toString('utf8', 0, 4)).toBe('%PDF')
  })
})
