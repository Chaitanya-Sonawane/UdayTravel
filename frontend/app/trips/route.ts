import { NextResponse } from 'next/server'
import { TripsRepository } from '@/lib/data/trips.repo'
import { requireAdmin } from '@/lib/server/admin-guard'
import { todayIST } from '@/lib/time/ist'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || todayIST()
    const routeId = searchParams.get('routeId') || undefined

    const trips = await TripsRepository.getTripsByDate(date, routeId)
    return NextResponse.json({ success: true, trips }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch trips'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const adminAuth = await requireAdmin(req)
  if (!adminAuth.success) {
    return adminAuth.response
  }

  try {
    const body = await req.json()
    const { routeId, busId, travelDate, departureTime, arrivalTime, fare } = body

    if (!routeId || !travelDate || !departureTime) {
      return NextResponse.json(
        { success: false, error: 'routeId, travelDate, and departureTime are required' },
        { status: 400 }
      )
    }

    const trip = await TripsRepository.createTrip({
      routeId,
      busId: busId || 'bus_mh16dp4951',
      travelDate,
      departureTime,
      arrivalTime,
      fare: fare ? Number(fare) : 200,
    })

    return NextResponse.json({ success: true, trip }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create trip'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
