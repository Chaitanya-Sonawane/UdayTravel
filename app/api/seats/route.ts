export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { getRoute, RouteId } from '@/lib/config/routes'
import { BASE_FARE_INR, SEATS_PER_BUS } from '@/lib/config/rules'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { TripsRepository } from '@/lib/data/trips.repo'
import { AvailabilityDoc } from '@/lib/schema/availability'
import { ALL_SEAT_IDS } from '@/lib/domain/seats/rules'

export async function GET(req: Request) {
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
  } catch {
    // Availability doc lookup safe catch
  }

  // Look for trip in trips or customTrips
  let tripData: any = availabilityDoc?.trips?.[tripId]
  if (!tripData && availabilityDoc?.customTrips) {
    tripData = availabilityDoc.customTrips.find((t) => t.tripId === tripId)
  }

  if (!tripData) {
    // Check TripsRepository for trip in Firestore
    try {
      const repoTrip = await TripsRepository.getTripById(tripId)
      if (repoTrip) {
        tripData = {
          tripId: repoTrip.tripId || repoTrip.id,
          busName: 'Uday Bus',
          busType: '3+2 Seater Coach',
          departureTime: repoTrip.departureTime,
          arrivalTime: repoTrip.arrivalTime || '08:45',
          fare: repoTrip.fare || BASE_FARE_INR,
          totalSeats: repoTrip.totalSeats || SEATS_PER_BUS,
          booked: (repoTrip.bookedSeats || []).length,
        }
      }
    } catch {
      // Repository lookup safe catch
    }
  }

  if (!tripData) {
    // Fallback for standard route departures
    const match = tripId.match(/^(AHM_PUN|PUN_AHM)_(\d{2})(\d{2})$/)
    if (match) {
      const depHour = match[2]
      const depMin = match[3]
      const depTime = `${depHour}:${depMin}`
      tripData = {
        tripId,
        busName: 'Uday Bus',
        busType: '3+2 Seater Coach',
        departureTime: depTime,
        arrivalTime: '09:00',
        fare: BASE_FARE_INR,
        totalSeats: SEATS_PER_BUS,
        booked: 0,
      }
    }
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

  // Check if caller holds any active seats on this trip
  const myHeldSeats: string[] = []
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7).trim()
      const parts = idToken.split('.')
      let callerUid: string | null = null
      if (parts.length === 3 && parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
        callerUid = payload.user_id || payload.sub || payload.uid
      } else if (idToken) {
        callerUid = idToken
      }

      if (callerUid) {
        const busDoc = await SeatsRepository.getBusSeats(tripId, date)
        const now = Date.now()
        for (const [sId, entry] of Object.entries(busDoc.seats || {})) {
          if (
            entry.state === 'HELD' &&
            entry.heldBy === callerUid &&
            entry.holdExpiresAt &&
            entry.holdExpiresAt > now
          ) {
            myHeldSeats.push(sId)
          }
        }
      }
    }
  } catch {
    // safe catch
  }

  return NextResponse.json(
    {
      route,
      date,
      tripId,
      busName: tripData.busName && !tripData.busName.includes('Uday Express') ? tripData.busName : 'Uday Bus',
      busType: tripData.busType || '3+2 Seater Coach',
      departureTime: tripData.departureTime || '06:00',
      arrivalTime: tripData.arrivalTime || '08:45',
      fare: tripData.fare || BASE_FARE_INR,
      totalSeats,
      seatsLeft,
      booked: totalOccupied,
      seats,
      publicMap,
      myHeldSeats,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
