import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { getRoute, RouteId } from '@/lib/config/routes'
import { BASE_FARE_INR, SEATS_PER_BUS } from '@/lib/config/rules'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { AvailabilityDoc } from '@/lib/schema/availability'
import { ALL_SEAT_IDS } from '@/lib/domain/seats/rules'

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

  // Read authoritative public map from seat_public ONLY
  const publicMap = await SeatsRepository.getSeatPublic(tripId, date)

  const takenCount = Object.keys(publicMap.taken || {}).length
  const heldCount = Object.keys(publicMap.held || {}).length
  const blockedCount = (publicMap.blocked || []).length
  const totalOccupied = takenCount + heldCount + blockedCount
  const seatsLeft = Math.max(0, totalSeats - totalOccupied)

  // Provide mapped seats record for backward-compatibility with older tests & consumers
  const seats: Record<string, string> = {}
  for (const sId of ALL_SEAT_IDS) {
    if (publicMap.taken?.[sId]) {
      seats[sId] = publicMap.taken[sId] === 'F' ? 'female' : 'male'
    } else if (publicMap.held?.[sId]) {
      seats[sId] = 'held'
    } else if (publicMap.blocked?.includes(sId)) {
      seats[sId] = 'blocked'
    } else if (tripData.seats?.[sId]) {
      seats[sId] = tripData.seats[sId]
    } else {
      seats[sId] = 'available'
    }
  }

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
      booked: totalOccupied,
      seats,
      publicMap,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
