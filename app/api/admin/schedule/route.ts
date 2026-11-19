import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { DEFAULT_BUSES, BusesRepository } from '@/lib/data/buses.repo'
import { getBusTemplate, getTemplateForBus, BUS_TEMPLATES, BusTemplateId } from '@/lib/domain/seats/bus-templates'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { BASE_FARE_INR } from '@/lib/config/rules'
import { AvailabilityDoc } from '@/lib/schema/availability'

const CreateScheduleSchema = z.object({
  routeId: z.string().refine((val): val is RouteId => val in ROUTES, {
    message: 'Route must be AHM_PUN or PUN_AHM',
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be YYYY-MM-DD',
  }),
  busId: z.string().min(1, 'Bus ID is required'),
  busNumber: z.string().min(1, 'Bus Number is required'),
  busName: z.string().min(1, 'Bus Name is required'),
  templateId: z.enum(['BUS_55', 'BUS_44', 'BUS_33']),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Departure time must be HH:mm (24h)',
  }),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Arrival time must be HH:mm (24h)',
  }),
  fare: z.number().min(50).max(5000),
  seatConfig: z.record(z.string(), z.enum(['available', 'blocked', 'female', 'male'])).optional(),
})

// Calculate arrival time if not provided
function addMinutesToTime(timeStr: string, minutes: number): string {
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr || '0', 10)
  const m = parseInt(mStr || '0', 10)
  const total = h * 60 + m + minutes
  const finalH = Math.floor(total / 60) % 24
  const finalM = total % 60
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`
}

/**
 * GET /api/admin/schedule?route=AHM_PUN&date=2026-11-20
 * Returns available fleet buses and existing scheduled trips for this route/date
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const routeId = searchParams.get('route') || 'AHM_PUN'
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  try {
    const buses = await BusesRepository.getBuses()
    const docId = `${routeId}_${date}`
    const db = getAdminDb()

    firestoreMeter.recordRead('availability', docId)
    const snap = await db.collection('availability').doc(docId).get()
    const availabilityData = snap.exists ? (snap.data() as AvailabilityDoc) : null

    // Extract all scheduled trips
    const tripsList: any[] = []
    if (availabilityData?.customTrips) {
      tripsList.push(...availabilityData.customTrips)
    }
    if (availabilityData?.trips) {
      Object.entries(availabilityData.trips).forEach(([tId, t]) => {
        if (!tripsList.some((existing) => existing.tripId === tId)) {
          tripsList.push({ tripId: tId, ...t })
        }
      })
    }

    return NextResponse.json({
      success: true,
      routeId,
      date,
      buses,
      templates: BUS_TEMPLATES,
      trips: tripsList,
    })
  } catch (err: any) {
    console.warn('[Admin Schedule GET Error]:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch schedule data',
        buses: DEFAULT_BUSES,
        templates: BUS_TEMPLATES,
        trips: [],
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/schedule
 * Creates a route schedule for the day with assigned bus and seat pattern configuration
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = CreateScheduleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
          },
        },
        { status: 400 }
      )
    }

    const {
      routeId,
      date,
      busId,
      busNumber,
      busName,
      templateId,
      departureTime,
      arrivalTime,
      fare,
      seatConfig = {},
    } = parsed.data

    const template = getBusTemplate(templateId)
    const totalCapacity = template.capacity

    // Generate unique tripId e.g. AHM_PUN_0600 or with bus suffix if collision
    const baseTripId = `${routeId}_${departureTime.replace(':', '')}`
    const cleanBusSuffix = busNumber.replace(/[^a-zA-Z0-9]/g, '').slice(-4)
    const tripId = `${baseTripId}_${cleanBusSuffix}`

    const docId = `${routeId}_${date}`
    const db = getAdminDb()
    const isoNow = new Date().toISOString()

    // 1. Calculate blocked and initial booked count
    const blockedSeats = Object.entries(seatConfig)
      .filter(([_, state]) => state === 'blocked')
      .map(([id]) => id)

    const preAllocatedSeats = Object.entries(seatConfig)
      .filter(([_, state]) => state === 'male' || state === 'female')
      .map(([id]) => id)

    const bookedCount = preAllocatedSeats.length
    const seatsLeft = Math.max(0, totalCapacity - bookedCount - blockedSeats.length)

    // 2. Prepare Trip Availability Object
    const tripItem = {
      tripId,
      busId,
      busName,
      busNumber,
      templateId,
      busType: `${template.layoutType} Coach (${totalCapacity} Seats)`,
      departureTime,
      arrivalTime: arrivalTime || addMinutesToTime(departureTime, 195),
      departure: ROUTES[routeId as RouteId].origin,
      arrival: ROUTES[routeId as RouteId].destination,
      booked: bookedCount,
      seatsLeft,
      totalCapacity,
      totalSeats: totalCapacity,
      status: seatsLeft === 0 ? 'sold-out' : seatsLeft < 10 ? 'almost-full' : 'available',
      fare,
      isCustom: true,
      updatedAt: isoNow,
    }

    // 3. Update Firestore availability/{routeId}_{date}
    firestoreMeter.recordWrite('availability', docId)
    const availRef = db.collection('availability').doc(docId)
    const availSnap = await availRef.get()
    const existingAvail = availSnap.exists ? (availSnap.data() as AvailabilityDoc) : null

    const existingCustom = existingAvail?.customTrips || []
    // Replace if exists with same tripId, otherwise append
    const updatedCustom = [
      ...existingCustom.filter((t) => t.tripId !== tripId),
      tripItem,
    ]

    await availRef.set(
      {
        route: routeId,
        date,
        weekday: new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-US', { weekday: 'long' }),
        customTrips: updatedCustom,
        updatedAt: isoNow,
      },
      { merge: true }
    )

    // 4. Update Firestore trips/{tripId} document for tracking & dispatch
    firestoreMeter.recordWrite('trips', tripId)
    await db.collection('trips').doc(tripId).set(
      {
        id: tripId,
        tripId,
        routeId,
        busId,
        busNumber,
        busName,
        templateId,
        travelDate: date,
        departureTime,
        arrivalTime: tripItem.arrivalTime,
        fare,
        status: 'active',
        totalSeats: totalCapacity,
        availableSeats: seatsLeft,
        bookedSeats: preAllocatedSeats,
        blockedSeats,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      { merge: true }
    )

    // 5. Seed Firestore bus_seats/{tripId}_{date} and seat_public/{tripId}_{date}
    const seatsDocId = `${tripId}_${date}`
    const seatsMap: Record<string, any> = {}

    template.allSeatIds.forEach((sId) => {
      const state = (seatConfig as Record<string, string>)[sId] || 'available'
      if (state === 'blocked') {
        seatsMap[sId] = { state: 'BLOCKED', updatedAt: isoNow }
      } else if (state === 'female') {
        seatsMap[sId] = { state: 'CONFIRMED', gender: 'female', updatedAt: isoNow }
      } else if (state === 'male') {
        seatsMap[sId] = { state: 'CONFIRMED', gender: 'male', updatedAt: isoNow }
      } else {
        seatsMap[sId] = { state: 'AVAILABLE', updatedAt: isoNow }
      }
    })

    firestoreMeter.recordWrite('bus_seats', seatsDocId)
    await db.collection('bus_seats').doc(seatsDocId).set(
      {
        tripId,
        date,
        busNumber,
        templateId,
        seats: seatsMap,
        updatedAt: isoNow,
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      tripId,
      docId,
      trip: tripItem,
      message: `✓ Route scheduled for ${date}! Assigned ${busName} (${busNumber}, ${templateId}) with ${totalCapacity} seats.`,
    })
  } catch (err: any) {
    console.error('[Admin Schedule POST Error]:', err)
    return NextResponse.json(
      {
        error: {
          code: 'CREATION_FAILED',
          message: err.message || 'Failed to create route schedule',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/schedule?route=AHM_PUN&date=2026-11-20&tripId=...
 * Deletes or cancels a bus departure from the daily route schedule
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const routeId = searchParams.get('route')
  const date = searchParams.get('date')
  const tripId = searchParams.get('tripId')

  if (!routeId || !date || !tripId) {
    return NextResponse.json(
      { error: { message: 'route, date, and tripId are required' } },
      { status: 400 }
    )
  }

  try {
    const docId = `${routeId}_${date}`
    const db = getAdminDb()
    const availRef = db.collection('availability').doc(docId)

    const snap = await availRef.get()
    if (snap.exists) {
      const data = snap.data() as AvailabilityDoc
      const custom = (data.customTrips || []).filter((t) => t.tripId !== tripId)
      const tripsObj = { ...(data.trips || {}) }
      delete tripsObj[tripId]

      await availRef.set(
        {
          customTrips: custom,
          trips: tripsObj,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    }

    // Also mark trip cancelled in trips collection
    try {
      await db.collection('trips').doc(tripId).update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      })
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Bus schedule ${tripId} removed for ${date}.`,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Failed to delete schedule' } },
      { status: 500 }
    )
  }
}
