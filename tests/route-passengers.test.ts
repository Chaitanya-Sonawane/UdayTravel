import { describe, it, expect } from 'vitest'
import { GET as routePassengersGet, POST as routePassengersPost } from '../app/api/admin/route-passengers/route'

describe('Route-Wise Passenger Boarding Sheet & Booking Saver API', () => {
  const testDate = '2026-11-20'
  const routeId = 'AHM_PUN'

  it('saves passenger booking info with Name, Phone, Pickup, Drop, and Seat for route', async () => {
    // 1. Add passenger at stop 14 (Delhigate)
    const req1 = new Request('http://localhost:3000/api/admin/route-passengers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId,
        date: testDate,
        name: 'Vikas Jadhav',
        mobile: '9822019901',
        pickupStop: 'Delhigate',
        dropStop: 'Wakadewadi',
        seatNo: 'C1',
        gender: 'male',
        age: 32,
      }),
    })

    const res1 = await routePassengersPost(req1)
    expect(res1.status).toBe(200)
    const json1 = await res1.json()
    expect(json1.success).toBe(true)
    expect(json1.ticketNo).toBeDefined()
    expect(json1.passenger.name).toBe('Vikas Jadhav')
    expect(json1.passenger.pickupStop).toBe('Delhigate')
    expect(json1.passenger.pickupSequence).toBe(14)
    expect(json1.passenger.seatNo).toBe('C1')

    // 2. Add passenger at stop 1 (Office - earlier in route)
    const req2 = new Request('http://localhost:3000/api/admin/route-passengers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId,
        date: testDate,
        name: 'Anita Kulkarni',
        mobile: '9822019902',
        pickupStop: 'Office',
        dropStop: 'Swargate',
        seatNo: 'C2',
        gender: 'female',
        age: 28,
      }),
    })

    const res2 = await routePassengersPost(req2)
    expect(res2.status).toBe(200)
    const json2 = await res2.json()
    expect(json2.success).toBe(true)
    expect(json2.passenger.pickupSequence).toBe(1)
  })

  it('retrieves passengers in strict route-wise sorted order with sequential Sr No', async () => {
    const req = new Request(
      `http://localhost:3000/api/admin/route-passengers?route=${routeId}&date=${testDate}`
    )
    const res = await routePassengersGet(req)
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(data.routeId).toBe('AHM_PUN')
    expect(Array.isArray(data.passengers)).toBe(true)
    expect(data.passengers.length).toBeGreaterThan(0)

    // Verify sequential Sr. No (1, 2, 3...)
    data.passengers.forEach((p: any, idx: number) => {
      expect(p.srNo).toBe(idx + 1)
      expect(p.name).toBeDefined()
      expect(p.mobile).toBeDefined()
      expect(p.pickupStop).toBeDefined()
      expect(p.dropStop).toBeDefined()
      expect(p.seatNo).toBeDefined()
    })

    // Verify route sequence ordering: Stop #1 (Office) MUST appear before Stop #14 (Delhigate)
    const officePassenger = data.passengers.find((p: any) => p.pickupStop === 'Office')
    const delhigatePassenger = data.passengers.find((p: any) => p.pickupStop === 'Delhigate')

    if (officePassenger && delhigatePassenger) {
      expect(officePassenger.srNo).toBeLessThan(delhigatePassenger.srNo)
      expect(officePassenger.pickupSequence).toBeLessThan(delhigatePassenger.pickupSequence)
    }

    // Verify stop breakdown aggregation
    expect(Array.isArray(data.stopBreakdown)).toBe(true)
    const officeStat = data.stopBreakdown.find((s: any) => s.stopName === 'Office')
    expect(officeStat).toBeDefined()
    expect(officeStat.count).toBeGreaterThan(0)
  })

  it('validates required fields on passenger creation', async () => {
    const req = new Request('http://localhost:3000/api/admin/route-passengers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: 'AHM_PUN',
        date: testDate,
        name: '', // Invalid empty name
        mobile: '123', // Invalid short mobile
        pickupStop: '',
        dropStop: '',
      }),
    })

    const res = await routePassengersPost(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
    expect(json.error.code).toBe('VALIDATION_FAILED')
  })
})
