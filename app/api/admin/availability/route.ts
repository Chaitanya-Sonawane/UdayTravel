import { NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/server/admin-guard'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { getRoute, RouteId } from '@/lib/config/routes'
import { BASE_FARE_INR, SEATS_PER_BUS } from '@/lib/config/rules'
import { departureInstant, toISTIsoString, weekdayLabel } from '@/lib/time/ist'
import { computeStatus } from '@/lib/availability/status'
import {
  AvailabilityDoc,
  generateDefaultSeatsMap,
  SeatState,
  TripScheduleData,
} from '@/lib/schema/availability'
import { notifySeatChartUpdate } from '@/lib/server/realtime-bus'

const AdminAvailabilityUpdateSchema = z.object({
  route: z.enum(['AHM_PUN', 'PUN_AHM']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  tripId: z.string().min(1, 'Trip ID is required'),
  busName: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  fare: z.number().int().min(50).max(5000).optional(),
  totalSeats: z.number().int().min(10).max(100).optional(),
  booked: z.coerce.number().int().min(0).max(100).optional(),
  seats: z.record(z.string(), z.enum(['available', 'male', 'female', 'blocked'])).optional(),
})

const CreateScheduleSchema = z.object({
  route: z.enum(['AHM_PUN', 'PUN_AHM']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  busName: z.string().min(2, 'Bus name is required'),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/, 'Departure must be HH:mm'),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/, 'Arrival must be HH:mm'),
  fare: z.coerce.number().int().min(50).default(BASE_FARE_INR),
  totalSeats: z.coerce.number().int().min(10).max(100).default(SEATS_PER_BUS),
  seats: z.record(z.string(), z.enum(['available', 'male', 'female', 'blocked'])).optional(),
})

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  const { searchParams } = new URL(req.url)
  const route = (searchParams.get('route') || 'AHM_PUN') as RouteId
  const date = searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: { code: 'INVALID_DATE', message: 'Valid date in YYYY-MM-DD format is required' } },
      { status: 400 }
    )
  }

  const routeConfig = getRoute(route)
  if (!routeConfig) {
    return NextResponse.json(
      { error: { code: 'INVALID_ROUTE', message: `Route '${route}' not supported` } },
      { status: 400 }
    )
  }

  const docId = `${route}_${date}`
  const db = getAdminDb()
  firestoreMeter.recordRead('availability', docId)

  let availabilityDoc: AvailabilityDoc | null = null
  try {
    const docSnap = await db.collection('availability').doc(docId).get()
    if (docSnap.exists) {
      availabilityDoc = docSnap.data() as AvailabilityDoc
    }
  } catch (err) {
    console.warn(`[Admin Availability API] Error reading ${docId}:`, err)
  }

  const now = new Date()
  const items: Array<TripScheduleData & {
    departure: string
    arrival: string
    seatsLeft: number
    totalCapacity: number
    status: string
    isCustom: boolean
  }> = []

  // 1. Process trips explicitly scheduled in availabilityDoc.trips
  if (availabilityDoc?.trips) {
    for (const [tripId, tripData] of Object.entries(availabilityDoc.trips)) {
      if (!tripData) continue
      const totalCapacity = tripData.totalSeats || SEATS_PER_BUS
      let seatsMap: Record<string, SeatState>
      let booked = 0

      if (tripData.seats && Object.keys(tripData.seats).length > 0) {
        seatsMap = tripData.seats
        booked = Object.values(tripData.seats).filter((s) => s !== 'available').length
      } else if (typeof tripData.booked === 'number') {
        booked = tripData.booked
        seatsMap = generateDefaultSeatsMap(booked)
      } else {
        booked = 0
        seatsMap = generateDefaultSeatsMap(0)
      }

      const seatsLeft = Math.max(0, Math.min(totalCapacity, totalCapacity - booked))
      const departureTime = tripData.departureTime || '06:00'
      const arrivalTime = tripData.arrivalTime || '08:45'
      const depInstant = departureInstant(date, departureTime)
      const durationMin = tripData.durationMin || 165
      const arrInstant = new Date(depInstant.getTime() + durationMin * 60 * 1000)

      const status = computeStatus({
        seatsLeft,
        departure: depInstant,
        now,
      })

      items.push({
        tripId,
        busName: tripData.busName || 'Uday Express',
        busType: tripData.busType || '3+2 Seater Coach',
        departureTime,
        arrivalTime,
        durationMin,
        duration: tripData.duration,
        fare: tripData.fare || BASE_FARE_INR,
        totalSeats: totalCapacity,
        booked,
        seats: seatsMap,
        departure: toISTIsoString(depInstant),
        arrival: toISTIsoString(arrInstant),
        seatsLeft,
        totalCapacity,
        status,
        isCustom: false,
      })
    }
  }

  // 2. Process all trips in customTrips array if present
  if (availabilityDoc?.customTrips && Array.isArray(availabilityDoc.customTrips)) {
    for (const customTrip of availabilityDoc.customTrips) {
      if (customTrip.tripId && !items.some((i) => i.tripId === customTrip.tripId)) {
        const totalCapacity = customTrip.totalSeats || SEATS_PER_BUS
        let seatsMap = customTrip.seats
        let booked = 0

        if (seatsMap && Object.keys(seatsMap).length > 0) {
          booked = Object.values(seatsMap).filter((s) => s !== 'available').length
        } else {
          booked = customTrip.booked ?? 0
          seatsMap = generateDefaultSeatsMap(booked)
        }

        const seatsLeft = Math.max(0, Math.min(totalCapacity, totalCapacity - booked))
        const depInstant = departureInstant(date, customTrip.departureTime || '08:00')
        const durationMin = customTrip.durationMin || 165
        const arrInstant = new Date(depInstant.getTime() + durationMin * 60 * 1000)

        const status = computeStatus({
          seatsLeft,
          departure: depInstant,
          now,
        })

        items.push({
          tripId: customTrip.tripId,
          busName: customTrip.busName || 'Uday Special',
          busType: customTrip.busType || '3+2 Seater Coach',
          departureTime: customTrip.departureTime || '08:00',
          arrivalTime: customTrip.arrivalTime || '10:45',
          durationMin,
          duration: customTrip.duration,
          fare: customTrip.fare || BASE_FARE_INR,
          totalSeats: totalCapacity,
          booked,
          seats: seatsMap,
          departure: toISTIsoString(depInstant),
          arrival: toISTIsoString(arrInstant),
          seatsLeft,
          totalCapacity,
          status,
          isCustom: true,
        })
      }
    }
  }

  items.sort((a, b) => a.departureTime.localeCompare(b.departureTime))

  return NextResponse.json({
    route,
    date,
    weekday: weekdayLabel(date),
    trips: items,
    updatedAt: availabilityDoc?.updatedAt ?? null,
  })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parsed = AdminAvailabilityUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      },
      { status: 400 }
    )
  }

  const { route, date, tripId, busName, departureTime, arrivalTime, fare, totalSeats, booked: inputBooked, seats } = parsed.data
  const docId = `${route}_${date}`
  const now = new Date().toISOString()

  let finalBooked = inputBooked ?? 0
  let finalSeats = seats

  if (seats && Object.keys(seats).length > 0) {
    finalBooked = Object.values(seats).filter((s) => s !== 'available').length
  } else if (typeof inputBooked === 'number') {
    finalSeats = generateDefaultSeatsMap(inputBooked)
  }

  try {
    const db = getAdminDb()
    firestoreMeter.recordWrite('availability', docId)

    const docRef = db.collection('availability').doc(docId)
    const existingSnap = await docRef.get()
    const existingData = (existingSnap.exists ? existingSnap.data() : {}) as AvailabilityDoc

    let customTrips = existingData.customTrips || []
    const isCustomIndex = customTrips.findIndex((t) => t.tripId === tripId)

    const tripUpdate: Partial<TripScheduleData> = {
      tripId,
      booked: finalBooked,
      ...(busName ? { busName } : {}),
      ...(departureTime ? { departureTime } : {}),
      ...(arrivalTime ? { arrivalTime } : {}),
      ...(fare ? { fare } : {}),
      ...(totalSeats ? { totalSeats } : {}),
      ...(finalSeats ? { seats: finalSeats } : {}),
      updatedAt: now,
    }

    if (isCustomIndex >= 0) {
      customTrips[isCustomIndex] = {
        ...customTrips[isCustomIndex]!,
        ...tripUpdate,
      } as TripScheduleData
      await docRef.set(
        {
          route,
          date,
          customTrips,
          updatedAt: now,
        },
        { merge: true }
      )
    } else {
      await docRef.set(
        {
          route,
          date,
          trips: {
            [tripId]: tripUpdate,
          },
          updatedAt: now,
        },
        { merge: true }
      )
    }

    // Sync bus_seats collection
    if (finalSeats) {
      try {
        const busSeatsDocRef = db.collection('bus_seats').doc(`${tripId}_${date}`)
        const updatedBusSeats: Record<string, any> = {}
        for (const [seatId, state] of Object.entries(finalSeats)) {
          updatedBusSeats[seatId] = {
            state: state === 'available' ? 'AVAILABLE' : state === 'blocked' ? 'BLOCKED' : 'CONFIRMED',
            passengerGender: state === 'female' ? 'female' : state === 'male' ? 'male' : undefined,
          }
        }
        await busSeatsDocRef.set(
          {
            tripId,
            date,
            seats: updatedBusSeats,
            updatedAt: now,
            schemaVersion: 1,
          },
          { merge: true }
        )
      } catch (seatErr) {
        console.warn('[Admin API] bus_seats update warning:', seatErr)
      }
    }

    try {
      ;(revalidateTag as any)('uday-availability-cache', 'default')
    } catch {}

    // Broadcast live update over real-time server bus to all connected clients
    try {
      notifySeatChartUpdate({
        route,
        date,
        tripId,
        busName: busName || 'Uday Express',
        booked: finalBooked,
        seatsLeft: (totalSeats || SEATS_PER_BUS) - finalBooked,
        seats: finalSeats || {},
        updatedAt: now,
      })
    } catch (busErr) {
      console.warn('[Admin API] Realtime notification warning:', busErr)
    }

    try {
      ;(revalidateTag as any)('uday-availability-cache', 'default')
    } catch {}

    return NextResponse.json({
      success: true,
      route,
      date,
      tripId,
      busName: busName || 'Uday Express',
      booked: finalBooked,
      seatsLeft: (totalSeats || SEATS_PER_BUS) - finalBooked,
      seats: finalSeats,
      updatedAt: now,
    })
  } catch (err: unknown) {
    console.error(`[Admin Availability API] Error updating ${docId}:`, err)
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: 'Failed to update availability record' } },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parsed = CreateScheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      },
      { status: 400 }
    )
  }

  const { route, date, busName, departureTime, arrivalTime, fare, totalSeats, seats } = parsed.data
  const docId = `${route}_${date}`
  const now = new Date().toISOString()
  const hhmm = departureTime.replace(':', '')
  const tripId = `${route}_${hhmm}`

  const finalSeats = seats || generateDefaultSeatsMap(0)
  const booked = Object.values(finalSeats).filter((s) => s !== 'available').length

  const newTrip: TripScheduleData = {
    tripId,
    busName,
    busType: '3+2 Seater Coach',
    departureTime,
    arrivalTime,
    durationMin: 165,
    fare,
    totalSeats,
    booked,
    seats: finalSeats,
    updatedAt: now,
  }

  try {
    const db = getAdminDb()
    firestoreMeter.recordWrite('availability', docId)

    const docRef = db.collection('availability').doc(docId)
    const existingSnap = await docRef.get()
    const existingData = (existingSnap.exists ? existingSnap.data() : {}) as AvailabilityDoc

    const trips = { ...(existingData.trips || {}) }
    trips[tripId] = newTrip

    await docRef.set(
      {
        route,
        date,
        trips,
        updatedAt: now,
      },
      { merge: true }
    )

    // Also populate bus_seats collection for the new schedule
    try {
      const busSeatsDocRef = db.collection('bus_seats').doc(`${tripId}_${date}`)
      const initialBusSeats: Record<string, any> = {}
      for (const [seatId, state] of Object.entries(finalSeats)) {
        initialBusSeats[seatId] = {
          state: state === 'available' ? 'AVAILABLE' : state === 'blocked' ? 'BLOCKED' : 'CONFIRMED',
          passengerGender: state === 'female' ? 'female' : state === 'male' ? 'male' : undefined,
        }
      }
      await busSeatsDocRef.set({
        tripId,
        date,
        seats: initialBusSeats,
        updatedAt: now,
        schemaVersion: 1,
      })
    } catch (seatErr) {
      console.warn('[Admin API] bus_seats initialization warning:', seatErr)
    }

    // Broadcast new bus schedule over real-time server bus
    try {
      notifySeatChartUpdate({
        route,
        date,
        tripId,
        busName,
        booked,
        seatsLeft: totalSeats - booked,
        seats: finalSeats,
        updatedAt: now,
      })
    } catch (busErr) {
      console.warn('[Admin API] Realtime notification warning:', busErr)
    }

    try {
      ;(revalidateTag as any)('uday-availability-cache', 'default')
    } catch {}

    return NextResponse.json(
      {
        success: true,
        trip: newTrip,
        message: 'Bus schedule created successfully',
      },
      { status: 201 }
    )
  } catch (err) {
    console.error(`[Admin Availability API] Error creating schedule for ${docId}:`, err)
    return NextResponse.json(
      { error: { code: 'CREATE_FAILED', message: 'Failed to create bus schedule' } },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  const { searchParams } = new URL(req.url)
  const route = searchParams.get('route') as RouteId
  const date = searchParams.get('date')
  const tripId = searchParams.get('tripId')

  if (!route || !date || !tripId) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'route, date, and tripId are required' } },
      { status: 400 }
    )
  }

  const docId = `${route}_${date}`
  const now = new Date().toISOString()

  try {
    const db = getAdminDb()
    firestoreMeter.recordWrite('availability', docId)

    const docRef = db.collection('availability').doc(docId)
    const existingSnap = await docRef.get()
    const existingData = (existingSnap.exists ? existingSnap.data() : {}) as AvailabilityDoc

    const trips = { ...(existingData.trips || {}) }
    delete trips[tripId]

    const customTrips = (existingData.customTrips || []).filter((t) => t.tripId !== tripId)

    await docRef.set(
      {
        route,
        date,
        trips,
        customTrips,
        updatedAt: now,
      },
      { merge: true }
    )

    try {
      ;(revalidateTag as any)('uday-availability-cache', 'default')
    } catch {
      // test ignore
    }

    try {
      notifySeatChartUpdate({
        route,
        date,
        tripId,
        booked: 0,
        seatsLeft: 0,
        seats: {},
        updatedAt: now,
      })
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Bus schedule '${tripId}' deleted successfully`,
    })
  } catch (err) {
    console.error(`[Admin Availability API] Delete error:`, err)
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: 'Failed to delete bus schedule' } },
      { status: 500 }
    )
  }
}
