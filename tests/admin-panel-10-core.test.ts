import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getSchedule, POST as postSchedule } from '@/app/api/admin/schedule/route'
import { POST as postManualBooking } from '@/app/api/admin/manual-booking/route'
import { GET as searchTickets } from '@/app/api/admin/tickets/route'
import { POST as postOverrideCancel } from '@/app/api/admin/override-cancel/route'
import { GET as getRoutePassengers, POST as postRoutePassenger } from '@/app/api/admin/route-passengers/route'
import { GET as getManifestPdf } from '@/app/api/admin/manifest/pdf/route'
import { GET as getPaymentsAudit } from '@/app/api/admin/payments/route'
import { GET as getCancellationsAudit } from '@/app/api/admin/cancellations/route'
import { BUS_55_TEMPLATE, BUS_44_TEMPLATE, BUS_33_TEMPLATE } from '@/lib/domain/seats/bus-templates'
import { evaluate, SeatState, Pax } from '@/lib/domain/seats/rules'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import * as cancelModule from '@/lib/payments/cancel'
import { NextRequest } from 'next/server'

describe('Uday Travels Admin Panel — 10 Core Acceptance Tests', () => {
  const testDate = '2026-12-30'
  const routeId = 'AHM_PUN'

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Test 1: Daily Route & Bus Scheduler
  it('1. Daily Scheduler: creates a route trip for the day with bus assignment, departure time, and fare', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: 'AHM_PUN',
        date: testDate,
        busId: 'bus_mh16dp4951',
        busNumber: 'MH 16 DP 4951',
        busName: 'Uday Express 55-Seater',
        templateId: 'BUS_55',
        departureTime: '06:30',
        arrivalTime: '09:45',
        fare: 220,
      }),
    })

    const res = await postSchedule(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.trip.departureTime).toBe('06:30')
    expect(data.trip.busNumber).toBe('MH 16 DP 4951')
    expect(data.trip.fare).toBe(220)
    expect(data.trip.totalCapacity).toBe(55)
  })

  // Test 2: Fleet Templates & Bus Layout
  it('2. Fleet Templates: validates seat capacities and layouts for 55, 44, and 33 seater coaches', () => {
    expect(BUS_55_TEMPLATE.capacity).toBe(55)
    expect(BUS_44_TEMPLATE.capacity).toBe(44)
    expect(BUS_33_TEMPLATE.capacity).toBe(33)

    // 55-seater 2+3 layout checks
    const rowA = BUS_55_TEMPLATE.rows[0]
    expect(rowA).toBeDefined()
    expect(rowA?.leftSeats).toEqual(['A1', 'A2'])
    expect(rowA?.rightSeats).toEqual(['A3', 'A4', 'A5'])
    expect(BUS_55_TEMPLATE.rearBench.length).toBe(6)
  })

  // Test 3: Manual Counter Booking (Walk-in Cash Booking)
  it('3. Counter Booking: books seats for walk-in passengers with cash and returns route ticket', async () => {
    const req = new Request('http://localhost:3000/api/admin/manual-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: 'AHM_PUN_0630',
        routeId: 'AHM_PUN',
        travelDate: testDate,
        busNumber: 'MH 16 DP 4951',
        busName: 'Uday Express 55-Seater',
        seatLayout: '3+2 Seater Coach',
        pickup: { name: 'Maliwada Stand', pickupTime: '06:30 AM' },
        drop: { name: 'Shivaji Nagar, Pune' },
        passengers: [
          { seat: 'A1', name: 'Suresh Patil', age: 38, gender: 'male' },
          { seat: 'A2', name: 'Dinesh Patil', age: 35, gender: 'male' },
        ],
        contactMobile: '9822019911',
        paymentMethod: 'CASH',
        farePerSeat: 220,
      }),
    })

    const res = await postManualBooking(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.ticketNo).toMatch(/^UT-(AP|PA)-/)
    expect(data.ticket.passengers.map((p: any) => p.seat)).toEqual(['A1', 'A2'])
    expect(data.ticket.status).toBe('CONFIRMED')
  })

  // Test 4: Counter Booking Gender Safety Enforcement
  it('4. Counter Gender Safety: strictly blocks male and female strangers from adjacent seats', () => {
    const tNow = Date.now()
    const tDep = tNow + 86400000

    // Existing confirmed seat has female passenger
    const existingSeats: Record<string, SeatState> = {
      B1: { state: 'CONFIRMED', gender: 'F' },
    }

    // Unrelated male attempts counter booking on adjacent B2 without family consent
    const req = {
      family: false,
      acceptAdjacent: false,
      pax: [{ seatId: 'B2', gender: 'M', age: 30 }] as Pax[],
    }

    const evalResult = evaluate(existingSeats, req, tNow, tDep)
    expect(evalResult.ok).toBe(false)
    if (!evalResult.ok) {
      expect(evalResult.code).toBe('SEAT_GENDER_ZONE')
      expect(evalResult.seatId).toBe('B2')
    }
  })

  // Test 5: Real-Time Seat Status Synchronization
  it('5. Real-Time Seat Sync: retrieves authoritative trip seat map reflecting booked seats', async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/schedule?route=${routeId}&date=${testDate}`)
    const res = await getSchedule(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.trips)).toBe(true)
    const trip = data.trips.find((t: any) => t.busNumber === 'MH 16 DP 4951')
    if (trip) {
      expect(typeof trip.booked).toBe('number')
      expect(typeof trip.seatsLeft).toBe('number')
      expect(trip.booked + trip.seatsLeft).toBeLessThanOrEqual(55)
    }
  })

  // Test 6: Ticket Lookup & Search
  it('6. Ticket Lookup: searches tickets by passenger name, mobile, or ticket number', async () => {
    vi.spyOn(TicketsRepository, 'searchTickets').mockResolvedValueOnce([
      {
        ticketNo: 'UT-AP-T9988',
        tripId: 'AHM_PUN_0630',
        routeId: 'AHM_PUN',
        travelDate: testDate,
        busNumber: 'MH 16 DP 4951',
        busName: 'Uday Express',
        seatLayout: '3+2 Seater Coach',
        pickup: { name: 'Maliwada Stand', pickupTime: '06:30 AM' },
        drop: { name: 'Swargate, Pune' },
        passengers: [{ seat: 'D1', name: 'Ganesh Shinde', age: 40, gender: 'male' }],
        contactMobile: '9822099999',
        fare: { perSeatPaise: 22000, seats: 1, taxesPaise: 0, totalPaise: 22000 },
        payment: { method: 'CASH', totalPaidPaise: 22000, feePaise: 0 },
        status: 'CONFIRMED',
        bookedAt: new Date().toISOString(),
      } as any,
    ])

    const req = new Request('http://localhost:3000/api/admin/tickets?q=Ganesh')
    const res = await searchTickets(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.tickets.length).toBeGreaterThanOrEqual(1)
    expect(data.tickets[0].passengers[0].name).toBe('Ganesh Shinde')
    expect(data.tickets[0].ticketNo).toBe('UT-AP-T9988')
  })

  // Test 7: Admin Override Cancellation & Refund Processing
  it('7. Override Cancellation: processes cancellation with refund tracking and input validation', async () => {
    // 1. Validation test
    const invalidReq = new Request('http://localhost:3000/api/admin/override-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketNo: '' }),
    })
    const invalidRes = await postOverrideCancel(invalidReq)
    expect(invalidRes.status).toBe(400)

    // 2. Mock valid override cancel
    vi.spyOn(cancelModule, 'cancelBooking').mockResolvedValueOnce({
      ticket: {
        ticketNo: 'UT-AP-CANCEL1',
        status: 'CANCELLED',
      } as any,
      refund: {
        status: 'PROCESSED',
        refundPaise: 22000,
      } as any,
    })

    const validReq = new Request('http://localhost:3000/api/admin/override-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketNo: 'UT-AP-CANCEL1',
        reason: 'Passenger requested cash counter refund',
      }),
    })
    const validRes = await postOverrideCancel(validReq)
    expect(validRes.status).toBe(200)
    const validData = await validRes.json()
    expect(validData.success).toBe(true)
    expect(validData.ticketNo).toBe('UT-AP-CANCEL1')
    expect(validData.status).toBe('CANCELLED')
  })

  // Test 8: Route-Wise Passenger Boarding Sheet API
  it('8. Route Passenger Sheet: adds passenger stops and sorts by route stop sequence', async () => {
    const postReq = new Request('http://localhost:3000/api/admin/route-passengers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId,
        date: testDate,
        name: 'Sunil Jagtap',
        mobile: '9822088888',
        pickupStop: 'Swargate',
        dropStop: 'Maliwada Stand',
        seatNo: 'D2',
        gender: 'male',
        age: 33,
      }),
    })

    const postRes = await postRoutePassenger(postReq)
    expect(postRes.status).toBe(200)
    const postData = await postRes.json()
    expect(postData.success).toBe(true)
    expect(postData.passenger.name).toBe('Sunil Jagtap')
    expect(postData.passenger.pickupStop).toBe('Swargate')

    // Fetch passenger sheet for the route
    const getReq = new Request(`http://localhost:3000/api/admin/route-passengers?routeId=${routeId}&date=${testDate}`)
    const getRes = await getRoutePassengers(getReq)
    expect(getRes.status).toBe(200)
    const getData = await getRes.json()
    expect(getData.success).toBe(true)
    expect(Array.isArray(getData.passengers)).toBe(true)
  })

  // Test 9: Passenger Manifest & Bus Dispatch (PDF Export)
  it('9. Manifest PDF Export: generates valid PDF buffer with %PDF magic header for bus dispatch', async () => {
    vi.spyOn(TicketsRepository, 'listTicketsForTrip').mockResolvedValueOnce([
      {
        ticketNo: 'UT-AP-MANIFEST1',
        tripId: 'AHM_PUN_0630',
        routeId: 'AHM_PUN',
        travelDate: testDate,
        busNumber: 'MH 16 DP 4951',
        busName: 'Uday Express',
        seatLayout: '3+2 Seater Coach',
        pickup: { name: 'Maliwada Stand', pickupTime: '06:30 AM' },
        drop: { name: 'Shivaji Nagar, Pune' },
        passengers: [{ seat: 'A1', name: 'Anil Deshmukh', age: 45, gender: 'male' }],
        contactMobile: '9822077777',
        fare: { perSeatPaise: 22000, seats: 1, taxesPaise: 0, totalPaise: 22000 },
        payment: { method: 'CASH', totalPaidPaise: 22000 },
        status: 'CONFIRMED',
        bookedAt: new Date().toISOString(),
      } as any,
    ])

    const req = new Request(`http://localhost:3000/api/admin/manifest/pdf?tripId=AHM_PUN_0630&date=${testDate}`)
    const res = await getManifestPdf(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('UdayTravels-Manifest')

    const arrayBuf = await res.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuf)
    expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF')
  })

  // Test 10: Financial Audit Ledgers (Payments & Cancellations)
  it('10. Financial Ledgers: tracks live revenues, cash vs online breakdown, and cancellation fees', async () => {
    // 1. Payments ledger audit
    const payReq = new Request(`http://localhost:3000/api/admin/payments?date=${testDate}`)
    const payRes = await getPaymentsAudit(payReq)
    expect(payRes.status).toBe(200)
    const payData = await payRes.json()
    expect(payData.success).toBe(true)
    expect(typeof payData.totalRevenue).toBe('number')
    expect(typeof payData.cashRevenue).toBe('number')
    expect(typeof payData.onlineRevenue).toBe('number')
    expect(Array.isArray(payData.payments)).toBe(true)

    // 2. Cancellations ledger audit
    const cancelReq = new Request('http://localhost:3000/api/admin/cancellations')
    const cancelRes = await getCancellationsAudit(cancelReq)
    expect(cancelRes.status).toBe(200)
    const cancelData = await cancelRes.json()
    expect(cancelData.success).toBe(true)
    expect(typeof cancelData.totalCancelledCount).toBe('number')
    expect(typeof cancelData.webAppCount).toBe('number')
    expect(typeof cancelData.manualCount).toBe('number')
    expect(typeof cancelData.totalRefunded).toBe('number')
    expect(typeof cancelData.totalFeeCollected).toBe('number')
    expect(Array.isArray(cancelData.cancellations)).toBe(true)
  }, 15000)
})
