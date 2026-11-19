import { describe, it, expect } from 'vitest'
import { GET, POST, DELETE } from '@/app/api/admin/schedule/route'
import { NextRequest } from 'next/server'

describe('Admin Step 1: Create Route for the Day with Bus and Seat Pattern Selection', () => {
  const testDate = '2026-12-25'
  const routeId = 'AHM_PUN'

  it('GET /api/admin/schedule returns 3 official fleet buses and templates', async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/schedule?route=${routeId}&date=${testDate}`)
    const res = await GET(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.buses).toBeInstanceOf(Array)
    expect(data.buses.length).toBeGreaterThanOrEqual(3)

    // Verify 3 fleet buses exist
    const b55 = data.buses.find((b: any) => b.templateId === 'BUS_55')
    const b44 = data.buses.find((b: any) => b.templateId === 'BUS_44')
    const b33 = data.buses.find((b: any) => b.templateId === 'BUS_33')

    expect(b55).toBeDefined()
    expect(b55.busNumber).toContain('4951')
    expect(b55.totalSeats).toBe(55)

    expect(b44).toBeDefined()
    expect(b44.busNumber).toContain('1003')
    expect(b44.totalSeats).toBe(44)

    expect(b33).toBeDefined()
    expect(b33.busNumber).toContain('3951')
    expect(b33.totalSeats).toBe(33)
  })

  it('POST /api/admin/schedule creates a 55-seater route schedule with custom seat pattern', async () => {
    const postReq = new NextRequest('http://localhost:3000/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: 'AHM_PUN',
        date: testDate,
        busId: 'bus_mh16dp4951',
        busNumber: 'MH 16 DP 4951',
        busName: 'Uday Express 55-Seater',
        templateId: 'BUS_55',
        departureTime: '06:00',
        arrivalTime: '09:15',
        fare: 220,
        seatConfig: {
          '1': 'blocked', // Conductor seat
          'A1': 'female', // Ladies front row
          'A2': 'female',
        },
      }),
    })

    const postRes = await POST(postReq)
    expect(postRes.status).toBe(200)

    const postData = await postRes.json()
    expect(postData.success).toBe(true)
    expect(postData.trip.totalCapacity).toBe(55)
    expect(postData.trip.departureTime).toBe('06:00')
    expect(postData.trip.fare).toBe(220)

    // Verify GET returns this created departure
    const getReq = new NextRequest(`http://localhost:3000/api/admin/schedule?route=AHM_PUN&date=${testDate}`)
    const getRes = await GET(getReq)
    const getData = await getRes.json()
    const scheduledTrip = getData.trips.find((t: any) => t.tripId === postData.tripId)
    expect(scheduledTrip).toBeDefined()
    expect(scheduledTrip.busNumber).toBe('MH 16 DP 4951')
  })

  it('POST /api/admin/schedule creates 44-seater and 33-seater bus departures', async () => {
    // Create 44-seater schedule
    const req44 = new NextRequest('http://localhost:3000/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: 'AHM_PUN',
        date: testDate,
        busId: 'bus_mh16dv1003',
        busNumber: 'MH 16 DV 1003',
        busName: 'Uday Express 44-Seater Executive',
        templateId: 'BUS_44',
        departureTime: '07:30',
        arrivalTime: '10:45',
        fare: 250,
      }),
    })
    const res44 = await POST(req44)
    expect(res44.status).toBe(200)
    const data44 = await res44.json()
    expect(data44.trip.totalCapacity).toBe(44)

    // Create 33-seater schedule
    const req33 = new NextRequest('http://localhost:3000/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: 'AHM_PUN',
        date: testDate,
        busId: 'bus_mh16dp3951',
        busNumber: 'MH 16 DP 3951',
        busName: 'Uday Express 33-Seater Deluxe',
        templateId: 'BUS_33',
        departureTime: '09:30',
        arrivalTime: '12:45',
        fare: 200,
      }),
    })
    const res33 = await POST(req33)
    expect(res33.status).toBe(200)
    const data33 = await res33.json()
    expect(data33.trip.totalCapacity).toBe(33)
  })

  it('DELETE /api/admin/schedule removes a departure from the daily schedule', async () => {
    const tripIdToDelete = `AHM_PUN_0600_4951`
    const delReq = new NextRequest(`http://localhost:3000/api/admin/schedule?route=AHM_PUN&date=${testDate}&tripId=${tripIdToDelete}`, {
      method: 'DELETE',
    })
    const delRes = await DELETE(delReq)
    expect(delRes.status).toBe(200)

    const delData = await delRes.json()
    expect(delData.success).toBe(true)

    // Verify GET no longer includes the trip
    const getReq = new NextRequest(`http://localhost:3000/api/admin/schedule?route=AHM_PUN&date=${testDate}`)
    const getRes = await GET(getReq)
    const getData = await getRes.json()
    const found = getData.trips.find((t: any) => t.tripId === tripIdToDelete)
    expect(found).toBeUndefined()
  })
})
