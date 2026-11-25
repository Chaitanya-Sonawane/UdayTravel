import { describe, it, expect } from 'vitest'
import { GET as getAvailability } from '@/app/api/availability/route'
import { GET as getSeats } from '@/app/api/seats/route'
import { todayIST } from '@/lib/time/ist'

describe('Public Availability & Seats APIs', () => {
  it('allows unauthenticated users to fetch bus availability without 401', async () => {
    const today = todayIST()
    // Request with NO Authorization header
    const req = new Request(`http://localhost:3000/api/availability?route=AHM_PUN&date=${today}`)
    const res = await getAvailability(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.route).toBe('AHM_PUN')
    expect(data.date).toBe(today)
    expect(Array.isArray(data.trips)).toBe(true)
    expect(data.trips.length).toBeGreaterThan(0)
  })

  it('allows unauthenticated users to view seat map without 401', async () => {
    const today = todayIST()
    // First get a tripId
    const availReq = new Request(`http://localhost:3000/api/availability?route=AHM_PUN&date=${today}`)
    const availRes = await getAvailability(availReq)
    const availData = await availRes.json()
    const tripId = availData.trips[0].tripId

    // Request with NO Authorization header
    const req = new Request(
      `http://localhost:3000/api/seats?route=AHM_PUN&date=${today}&tripId=${tripId}`
    )
    const res = await getSeats(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tripId).toBe(tripId)
    expect(data.seats).toBeDefined()
    expect(data.publicMap).toBeDefined()
  })
})
