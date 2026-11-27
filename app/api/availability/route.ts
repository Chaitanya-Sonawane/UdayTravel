export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { getRoute, RouteId } from '@/lib/config/routes'
import { BASE_FARE_INR, SEATS_PER_BUS } from '@/lib/config/rules'
import { departureInstant, isDateInWindow, toISTIsoString, weekdayLabel } from '@/lib/time/ist'
import { computeStatus } from '@/lib/availability/status'
import { TripsRepository } from '@/lib/data/trips.repo'
import {
  AvailabilityDoc,
  AvailabilityQuerySchema,
  AvailabilityResponse,
  generateDefaultSeatsMap,
  SeatState,
  TripAvailabilityItem,
} from '@/lib/schema/availability'

async function fetchCachedAvailabilityDoc(docId: string): Promise<AvailabilityDoc | null> {
  try {
    firestoreMeter.recordRead('availability', docId)
    const db = getAdminDb()
    const docSnap = await Promise.race([
      db.collection('availability').doc(docId).get(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 350)
      ),
    ])

    if (!docSnap.exists) {
      return null
    }

    return docSnap.data() as AvailabilityDoc
  } catch (err) {
    console.warn(`[Availability API] fetchCachedAvailabilityDoc notice for ${docId}:`, err)
    return null
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const routeParam = searchParams.get('route')
  const dateParam = searchParams.get('date')

  const parsed = AvailabilityQuerySchema.safeParse({
    route: routeParam,
    date: dateParam,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: parsed.error.issues.map((e) => e.message).join(', '),
        },
      },
      { status: 400 }
    )
  }

  const { route, date } = parsed.data

  const routeConfig = getRoute(route)
  if (!routeConfig) {
    return NextResponse.json(
      {
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route '${route}' is not supported.`,
        },
      },
      { status: 400 }
    )
  }

  if (!isDateInWindow(date)) {
    return NextResponse.json(
      {
        error: {
          code: 'DATE_OUT_OF_WINDOW',
          message: `Date '${date}' is outside the allowable 30-day booking window.`,
        },
      },
      { status: 400 }
    )
  }

  const docId = `${route}_${date}`
  let availabilityDoc: AvailabilityDoc | null = null

  try {
    availabilityDoc = await fetchCachedAvailabilityDoc(docId)
  } catch (err: unknown) {
    console.error(`[Availability API] Error reading doc ${docId}:`, err)
  }

  const now = new Date()
  const tripItems: TripAvailabilityItem[] = []

  // 1. Process all trips explicitly scheduled in availabilityDoc.trips
  if (availabilityDoc?.trips) {
    for (const [tripId, tripData] of Object.entries(availabilityDoc.trips)) {
      if (!tripData) continue
      const totalSeats = tripData.totalSeats || SEATS_PER_BUS
      let booked = 0
      let seatsMap = tripData.seats

      if (seatsMap && Object.keys(seatsMap).length > 0) {
        booked = Object.values(seatsMap).filter((s) => s !== 'available').length
      } else if (typeof tripData.booked === 'number') {
        booked = tripData.booked
        seatsMap = generateDefaultSeatsMap(booked)
      } else {
        booked = 0
        seatsMap = generateDefaultSeatsMap(0)
      }

      const seatsLeft = Math.max(0, Math.min(totalSeats, totalSeats - booked))
      const departureTime = tripData.departureTime || '06:00'
      const arrivalTime = tripData.arrivalTime || '08:45'
      const depInstant = departureInstant(date, departureTime)
      const durationMin = tripData.durationMin || 165
      const arrInstant = new Date(depInstant.getTime() + durationMin * 60 * 1000)

      const hours = Math.floor(durationMin / 60)
      const mins = durationMin % 60
      const durationFormatted = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`

      const status = computeStatus({
        seatsLeft,
        departure: depInstant,
        now,
      })

      const busNumber = (tripData as any).busNumber || (totalSeats === 44 ? 'MH 16 DV 1003' : totalSeats === 33 ? 'MH 16 DP 3951' : 'MH 16 DP 4951')
      const coachLabel = (tripData as any).coachLabel || (totalSeats === 44 ? '2+2 Coach (44 Seats)' : totalSeats === 33 ? '2+2 Coach (33 Seats)' : '2+3 Coach (55 Seats)')
      const layoutType = (tripData as any).layoutType || (totalSeats === 55 ? '2+3' : '2+2')

      tripItems.push({
        tripId,
        busName: tripData.busName || 'Uday Bus',
        busType: coachLabel,
        busNumber,
        coachLabel,
        layoutType,
        departure: toISTIsoString(depInstant),
        arrival: toISTIsoString(arrInstant),
        departureTime,
        arrivalTime,
        duration: tripData.duration || durationFormatted,
        seatsLeft,
        totalCapacity: totalSeats,
        booked,
        status,
        fare: tripData.fare || BASE_FARE_INR,
        seats: seatsMap,
      })
    }
  }

  // 2. Process all trips in customTrips array if present
  if (availabilityDoc?.customTrips && Array.isArray(availabilityDoc.customTrips)) {
    for (const customTrip of availabilityDoc.customTrips) {
      if (customTrip.tripId && !tripItems.some((t) => t.tripId === customTrip.tripId)) {
        const totalSeats = customTrip.totalSeats || SEATS_PER_BUS
        let booked = 0
        let seatsMap = customTrip.seats

        if (seatsMap && Object.keys(seatsMap).length > 0) {
          booked = Object.values(seatsMap).filter((s) => s !== 'available').length
        } else {
          booked = customTrip.booked ?? 0
          seatsMap = generateDefaultSeatsMap(booked)
        }

        const seatsLeft = Math.max(0, Math.min(totalSeats, totalSeats - booked))
        const depInstant = departureInstant(date, customTrip.departureTime || '08:00')
        const durationMin = customTrip.durationMin || 165
        const arrInstant = new Date(depInstant.getTime() + durationMin * 60 * 1000)

        const hours = Math.floor(durationMin / 60)
        const mins = durationMin % 60
        const durationFormatted = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`

        const status = computeStatus({
          seatsLeft,
          departure: depInstant,
          now,
        })

        const busNumber = (customTrip as any).busNumber || (totalSeats === 44 ? 'MH 16 DV 1003' : totalSeats === 33 ? 'MH 16 DP 3951' : 'MH 16 DP 4951')
        const coachLabel = (customTrip as any).coachLabel || (totalSeats === 44 ? '2+2 Coach (44 Seats)' : totalSeats === 33 ? '2+2 Coach (33 Seats)' : '2+3 Coach (55 Seats)')
        const layoutType = (customTrip as any).layoutType || (totalSeats === 55 ? '2+3' : '2+2')

        tripItems.push({
          tripId: customTrip.tripId,
          busName: customTrip.busName || 'Uday Bus',
          busType: coachLabel,
          busNumber,
          coachLabel,
          layoutType,
          departure: toISTIsoString(depInstant),
          arrival: toISTIsoString(arrInstant),
          departureTime: customTrip.departureTime || '08:00',
          arrivalTime: customTrip.arrivalTime || '10:45',
          duration: customTrip.duration || durationFormatted,
          seatsLeft,
          totalCapacity: totalSeats,
          booked,
          status,
          fare: customTrip.fare || BASE_FARE_INR,
          seats: seatsMap,
        })
      }
    }
  }

  // 3. Fallback: Query Firestore trips collection via TripsRepository if tripItems is empty
  if (tripItems.length === 0) {
    try {
      const repoTrips = await TripsRepository.getTripsByDate(date, route)
      for (const t of repoTrips) {
        const totalSeats = t.totalSeats || SEATS_PER_BUS
        const booked = (t.bookedSeats || []).length
        const seatsLeft =
          typeof t.availableSeats === 'number'
            ? t.availableSeats
            : Math.max(0, totalSeats - booked)
        const depInstant = departureInstant(date, t.departureTime)
        const arrivalTime = t.arrivalTime || '08:45'
        const arrInstant = departureInstant(date, arrivalTime)
        const durationMin = Math.round(
          (arrInstant.getTime() - depInstant.getTime()) / (60 * 1000)
        )
        const durPositive = durationMin > 0 ? durationMin : 165
        const hours = Math.floor(durPositive / 60)
        const mins = durPositive % 60
        const durationFormatted = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`

        const status = computeStatus({
          seatsLeft,
          departure: depInstant,
          now,
        })

        const seatsMap = generateDefaultSeatsMap(booked)
        for (const bookedSeat of t.bookedSeats || []) {
          seatsMap[bookedSeat] = 'blocked'
        }

        const busNumber = t.busNumber || (t.totalSeats === 44 || t.busId === 'bus_mh16dv1003' ? 'MH 16 DV 1003' : t.totalSeats === 33 || t.busId === 'bus_mh16dp3951' ? 'MH 16 DP 3951' : 'MH 16 DP 4951')
        const coachLabel = t.coachLabel || (t.totalSeats === 44 ? '2+2 Coach (44 Seats)' : t.totalSeats === 33 ? '2+2 Coach (33 Seats)' : '2+3 Coach (55 Seats)')
        const layoutType = (t.seatLayout && t.seatLayout.includes('2+3')) || t.totalSeats === 55 ? '2+3' : '2+2'
        const busName = t.busName || 'Uday Bus'

        tripItems.push({
          tripId: t.tripId || t.id,
          busName,
          busType: coachLabel,
          busNumber,
          coachLabel,
          layoutType,
          departure: toISTIsoString(depInstant),
          arrival: toISTIsoString(arrInstant),
          departureTime: t.departureTime,
          arrivalTime,
          duration: t.duration || durationFormatted,
          seatsLeft,
          totalCapacity: totalSeats,
          booked,
          status,
          fare: t.fare || BASE_FARE_INR,
          seats: seatsMap,
        })
      }
    } catch (err) {
      console.warn('[Availability API] Fallback to TripsRepository failed:', err)
    }
  }

  // Sort trips chronologically by departure time
  tripItems.sort((a, b) => a.departureTime.localeCompare(b.departureTime))

  const payload: AvailabilityResponse = {
    route: route as RouteId,
    date,
    weekday: weekdayLabel(date),
    asOf: toISTIsoString(now),
    trips: tripItems,
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
