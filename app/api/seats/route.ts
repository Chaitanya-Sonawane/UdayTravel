import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { getRoute, RouteId } from '@/lib/config/routes'
import { BASE_FARE_INR, SEATS_PER_BUS } from '@/lib/config/rules'
import {
  AvailabilityDoc,
  generateDefaultSeatsMap,
  SeatState,
} from '@/lib/schema/availability'

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  const { searchParams } = new URL(req.url)
  const route = searchParams.get('route') as RouteId
  const date = searchParams.get('date')
  const tripId = searchParams.get('tripId')

  if (!route || !date || !tripId) {
    return NextResponse.json(
      { error: { code: 'INVALID_QUERY', message: 'route, date, and tripId are required' } },
      { status: 400 }
    )
  }

  const routeConfig = getRoute(route)
  if (!routeConfig) {
    return NextResponse.json(
      { error: { code: 'INVALID_ROUTE', message: `Route '${route}' is not supported` } },
      { status: 400 }
    )
  }

  const docId = `${route}_${date}`
  let availabilityDoc: AvailabilityDoc | null = null

  try {
    firestoreMeter.recordRead('availability', docId)
    const db = getAdminDb()
    const docSnap = await db.collection('availability').doc(docId).get()
    if (docSnap.exists) {
      availabilityDoc = docSnap.data() as AvailabilityDoc
    }
  } catch (err) {
    console.warn(`[Seats API] Error reading ${docId}:`, err)
  }

  // Look for trip in trips or customTrips
  let tripData = availabilityDoc?.trips?.[tripId]
  if (!tripData && availabilityDoc?.customTrips) {
    tripData = availabilityDoc.customTrips.find((t) => t.tripId === tripId)
  }

  if (!tripData) {
    return NextResponse.json(
      { error: { code: 'TRIP_NOT_FOUND', message: `Bus schedule '${tripId}' not found for ${date}` } },
      { status: 404 }
    )
  }

  const totalSeats = tripData.totalSeats || SEATS_PER_BUS
  let seats: Record<string, SeatState>

  if (tripData.seats && Object.keys(tripData.seats).length > 0) {
    seats = tripData.seats
  } else if (typeof tripData.booked === 'number') {
    seats = generateDefaultSeatsMap(tripData.booked)
  } else {
    seats = generateDefaultSeatsMap(0)
  }

  const booked = Object.values(seats).filter((s) => s !== 'available').length
  const seatsLeft = Math.max(0, totalSeats - booked)

  return NextResponse.json(
    {
      route,
      date,
      tripId,
      busName: tripData.busName || 'Uday Express',
      busType: tripData.busType || '3+2 Seater Coach',
      departureTime: tripData.departureTime || '06:00',
      arrivalTime: tripData.arrivalTime || '08:45',
      fare: tripData.fare || BASE_FARE_INR,
      totalSeats,
      seatsLeft,
      booked,
      seats,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
