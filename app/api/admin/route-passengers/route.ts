export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { TripsRepository } from '@/lib/data/trips.repo'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { getBusTemplate, BusTemplateId } from '@/lib/domain/seats/bus-templates'
import {
  AHILYANAGAR_PICKUP_RAW,
  PUNE_DROP_RAW,
  PUNE_PICKUP_RAW,
} from '@/lib/routes/seed-data'
import { TicketDoc } from '@/lib/schemas/ticket.schema'

export interface RoutePassengerRecord {
  srNo: number
  ticketNo: string
  name: string
  age: number
  gender: 'male' | 'female'
  mobile: string
  pickupStop: string
  pickupSequence: number
  pickupTime: string
  dropStop: string
  dropSequence: number
  seatNo: string
  tripId: string
  busNumber: string
  busName: string
  departureTime: string
  fare: number
  bookedAt: string
  boarded: boolean
  boardedAt?: string
  paymentMethod: string
}

export interface StopCountBreakdown {
  stopName: string
  sequence: number
  time?: string
  count: number
}

// Canonical route sequence lookup helpers
function getStopSequence(stopName: string, isAhmPun: boolean): { sequence: number; time: string } {
  const clean = (stopName || '').toLowerCase().trim()
  const pickupList = isAhmPun ? AHILYANAGAR_PICKUP_RAW : PUNE_PICKUP_RAW

  // 1. Exact match
  const exactIdx = pickupList.findIndex((p) => p.name.toLowerCase() === clean)
  if (exactIdx >= 0) {
    return { sequence: exactIdx + 1, time: pickupList[exactIdx]!.time }
  }

  // 2. Substring match
  const subIdx = pickupList.findIndex(
    (p) => clean.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(clean)
  )
  if (subIdx >= 0) {
    return { sequence: subIdx + 1, time: pickupList[subIdx]!.time }
  }

  return { sequence: 999, time: '06:30' }
}

function getDropSequence(dropName: string, isAhmPun: boolean): number {
  const clean = (dropName || '').toLowerCase().trim()
  const dropList = isAhmPun ? PUNE_DROP_RAW : AHILYANAGAR_PICKUP_RAW.map((p) => p.name)

  const exactIdx = dropList.findIndex((d) => d.toLowerCase() === clean)
  if (exactIdx >= 0) return exactIdx + 1

  const subIdx = dropList.findIndex(
    (d) => clean.includes(d.toLowerCase()) || d.toLowerCase().includes(clean)
  )
  if (subIdx >= 0) return subIdx + 1

  return 999
}

const CreateRoutePassengerSchema = z.object({
  routeId: z.enum(['AHM_PUN', 'PUN_AHM']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  tripId: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().min(10, 'Valid 10-digit mobile number required'),
  pickupStop: z.string().min(2, 'Pickup stop is required'),
  dropStop: z.string().min(2, 'Drop stop is required'),
  seatNo: z.string().optional(),
  age: z.coerce.number().min(1).max(120).default(30),
  gender: z.enum(['male', 'female']).default('male'),
  fare: z.coerce.number().min(50).max(5000).default(200),
})

/**
 * GET /api/admin/route-passengers?route=AHM_PUN&date=2026-11-20&tripId=...
 * Returns all confirmed booking passengers for the selected route in ROUTE-WISE SORTED ORDER.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const routeParam = searchParams.get('route') || 'AHM_PUN'
  const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const tripFilter = searchParams.get('tripId') || null

  const isAhmPun = routeParam === 'AHM_PUN' || routeParam === 'ahilyanagar_to_pune'

  try {
    const db = getAdminDb()
    const tickets = await TicketsRepository.listTicketsForRoute(routeParam, dateParam)
    const confirmedTickets = tickets.filter((t) => t.status === 'CONFIRMED')

    // Read boarding status records from trip_manifest
    const manifestSnap = await db.collection('trip_manifest').get()
    const manifestMap: Record<string, any> = {}
    manifestSnap.forEach((doc) => {
      const data = doc.data()
      if (data?.boardedSeats) {
        Object.entries(data.boardedSeats).forEach(([sId, val]: [string, any]) => {
          manifestMap[`${doc.id}_${sId}`] = val
        })
      }
    })

    const rawList: Omit<RoutePassengerRecord, 'srNo'>[] = []

    for (const ticket of confirmedTickets) {
      if (tripFilter && ticket.tripId !== tripFilter) {
        continue
      }

      const pStop = ticket.pickup?.name || (isAhmPun ? 'Office' : 'Wakadewadi')
      const dStop = ticket.drop?.name || (isAhmPun ? 'Wakadewadi' : 'Delhigate')
      const { sequence: pSeq, time: pTime } = getStopSequence(pStop, isAhmPun)
      const dSeq = getDropSequence(dStop, isAhmPun)

      for (const p of ticket.passengers) {
        const boardedKey = `manifest_${ticket.tripId}_${ticket.travelDate}_${p.seat}`
        const boardedEntry = manifestMap[boardedKey]
        const isBoarded = !!boardedEntry?.boarded

        rawList.push({
          ticketNo: ticket.ticketNo,
          name: p.name,
          age: p.age,
          gender: p.gender,
          mobile: ticket.contactMobile || '+91 98220 00000',
          pickupStop: pStop,
          pickupSequence: pSeq,
          pickupTime: ticket.pickup?.pickupTime || ticket.pickup?.time || pTime,
          dropStop: dStop,
          dropSequence: dSeq,
          seatNo: p.seat,
          tripId: ticket.tripId || `${routeParam}_0600`,
          busNumber: ticket.busNumber || 'MH 16 DP 4951',
          busName: ticket.busName && !ticket.busName.includes('Uday Express') ? ticket.busName : 'Uday Bus',
          departureTime: ticket.tripId?.includes('_')
            ? ticket.tripId.split('_')[2]?.replace(/(\d{2})(\d{2})/, '$1:$2') || '06:00'
            : '06:00',
          fare: ticket.fare?.perSeatPaise ? Math.round(ticket.fare.perSeatPaise / 100) : 200,
          bookedAt: ticket.bookedAt || ticket.createdAt || new Date().toISOString(),
          boarded: isBoarded,
          boardedAt: boardedEntry?.boardedAt,
          paymentMethod: ticket.payment?.method || 'CASH',
        })
      }
    }

    // STRICT ROUTE-WISE SORTING:
    // 1. Pickup stop route sequence ascending (Stop #1 -> Stop #2 -> Stop #3...)
    // 2. Pickup stop scheduled reporting time
    // 3. Drop stop route sequence ascending
    // 4. Seat number alphabetical/numerical
    rawList.sort((a, b) => {
      if (a.pickupSequence !== b.pickupSequence) {
        return a.pickupSequence - b.pickupSequence
      }
      if (a.pickupTime !== b.pickupTime) {
        return a.pickupTime.localeCompare(b.pickupTime)
      }
      if (a.dropSequence !== b.dropSequence) {
        return a.dropSequence - b.dropSequence
      }
      return a.seatNo.localeCompare(b.seatNo, undefined, { numeric: true })
    })

    // Assign sequential Sr No in route-wise order
    const passengers: RoutePassengerRecord[] = rawList.map((p, idx) => ({
      ...p,
      srNo: idx + 1,
    }))

    // Calculate Stop-by-Stop Boarding Breakdown
    const canonicalStops = isAhmPun ? AHILYANAGAR_PICKUP_RAW : PUNE_PICKUP_RAW
    const stopCountMap: Record<string, number> = {}
    passengers.forEach((p) => {
      stopCountMap[p.pickupStop] = (stopCountMap[p.pickupStop] || 0) + 1
    })

    const stopBreakdown: StopCountBreakdown[] = canonicalStops
      .map((item, idx) => ({
        stopName: item.name,
        sequence: idx + 1,
        time: item.time,
        count: stopCountMap[item.name] || 0,
      }))
      .filter((s) => s.count > 0 || s.sequence <= 5) // Show active stops or first 5 key stops

    return NextResponse.json({
      success: true,
      routeId: routeParam,
      date: dateParam,
      totalPassengers: passengers.length,
      stopBreakdown,
      passengers,
    })
  } catch (err: any) {
    console.error('[Route Passengers GET Error]:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch route passengers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/route-passengers
 * Creates & saves booking person information for the selected route.
 * Automatically saves Sr No, Name, Pickup, Drop, Phone Number & Seat into the database.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = CreateRoutePassengerSchema.safeParse(body)

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
      tripId: inputTripId,
      name,
      mobile,
      pickupStop,
      dropStop,
      seatNo: inputSeatNo,
      age,
      gender,
      fare,
    } = parsed.data

    const isAhmPun = routeId === 'AHM_PUN'
    const db = getAdminDb()
    const isoNow = new Date().toISOString()

    // 1. Resolve Trip ID
    let tripId = inputTripId
    let busNumber = isAhmPun ? 'MH 16 DP 4951' : 'MH 16 DV 1003'
    let busName = 'Uday Bus'
    let templateId: BusTemplateId = isAhmPun ? 'BUS_55' : 'BUS_44'
    let departureTime = isAhmPun ? '06:00' : '06:30'

    if (!tripId) {
      const repoTrips = await TripsRepository.getTripsByDate(date, routeId)
      const activeTrip = repoTrips.find((t) => t.status !== 'cancelled') || repoTrips[0]
      if (activeTrip) {
        tripId = activeTrip.tripId || activeTrip.id
        busNumber = activeTrip.busNumber || busNumber
        busName = activeTrip.busName || busName
        departureTime = activeTrip.departureTime || departureTime
        if (activeTrip.totalSeats === 44) templateId = 'BUS_44'
        else if (activeTrip.totalSeats === 33) templateId = 'BUS_33'
      } else {
        tripId = `${routeId}_0600_4951`
      }
    } else {
      const tripDoc = await TripsRepository.getTripById(tripId)
      if (tripDoc) {
        busNumber = tripDoc.busNumber || busNumber
        busName = tripDoc.busName || busName
        departureTime = tripDoc.departureTime || departureTime
        if (tripDoc.totalSeats === 44) templateId = 'BUS_44'
        else if (tripDoc.totalSeats === 33) templateId = 'BUS_33'
      }
    }

    const template = getBusTemplate(templateId)

    // 2. Resolve & Allocate Seat
    const seatsDocId = `${tripId}_${date}`
    const busSeatsDoc = await SeatsRepository.getBusSeats(tripId, date)
    const takenSeats = busSeatsDoc?.seats || {}

    let assignedSeat = inputSeatNo?.toUpperCase().trim()

    if (assignedSeat) {
      const currentState = takenSeats[assignedSeat]?.state
      if (currentState === 'CONFIRMED' || (currentState as string) === 'BOOKED') {
        return NextResponse.json(
          { error: { code: 'SEAT_TAKEN', message: `Seat ${assignedSeat} is already booked on this bus.` } },
          { status: 409 }
        )
      }
    } else {
      // Auto-assign next open seat in template order
      const openSeat = template.allSeatIds.find((sId) => {
        const s = takenSeats[sId]
        return !s || (s.state as string) === 'AVAILABLE' || (s.state as string) === 'available'
      })

      if (!openSeat) {
        return NextResponse.json(
          { error: { code: 'BUS_FULL', message: 'All seats on this bus are already booked.' } },
          { status: 409 }
        )
      }
      assignedSeat = openSeat
    }

    // 3. Format Mobile & Generate Canonical Ticket
    const digitsOnly = mobile.replace(/\D/g, '')
    const normalizedMobile = digitsOnly.length === 10 ? `+91 ${digitsOnly}` : digitsOnly.startsWith('91') && digitsOnly.length === 12 ? `+91 ${digitsOnly.slice(2)}` : mobile
    const ticketNo = TicketsRepository.generateTicketNo(routeId)
    const bookingId = `bk_route_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`
    const { time: pickupTime } = getStopSequence(pickupStop, isAhmPun)

    // 4. Save Ticket Document in Firestore
    const ticketDoc: TicketDoc = {
      ticketNo,
      grp: bookingId,
      uid: `usr_route_${digitsOnly.slice(-10)}`,
      status: 'CONFIRMED',
      route: {
        from: isAhmPun ? 'Ahilyanagar' : 'Pune',
        to: isAhmPun ? 'Pune' : 'Ahilyanagar',
        routeId,
      },
      travelDate: date,
      tripId,
      busName,
      busNumber,
      seatLayout: `${template.layoutType} Seater`,
      pickup: {
        pointId: `pp_${pickupStop.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: pickupStop,
        time: pickupTime,
        pickupTime,
      },
      drop: {
        pointId: `dp_${dropStop.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: dropStop,
      },
      passengers: [
        {
          seat: assignedSeat,
          title: '',
          name: name.trim(),
          age,
          gender,
        },
      ],
      contactMobile: normalizedMobile,
      fare: {
        perSeatPaise: fare * 100,
        seats: 1,
        totalPaise: fare * 100,
        taxesPaise: 0,
      },
      payment: {
        method: 'OFFICE_COUNTER_CASH',
        walletDebitPaise: 0,
        razorpayPaise: 0,
        paidAt: isoNow,
      },
      bookedAt: isoNow,
      qrToken: `qr_${ticketNo}_${Date.now()}`,
      createdAt: isoNow,
      updatedAt: isoNow,
      schemaVersion: 1,
    }

    firestoreMeter.recordWrite('tickets', ticketNo)
    await db.collection('tickets').doc(ticketNo).set(ticketDoc)

    // 5. Update Seat Map in bus_seats & seat_public
    firestoreMeter.recordWrite('bus_seats', seatsDocId)
    await db.collection('bus_seats').doc(seatsDocId).set(
      {
        tripId,
        date,
        busNumber,
        templateId,
        seats: {
          ...takenSeats,
          [assignedSeat]: {
            state: 'CONFIRMED',
            gender,
            ticketNo,
            passengerName: name.trim(),
            pickupStop,
            dropStop,
            updatedAt: isoNow,
          },
        },
        updatedAt: isoNow,
      },
      { merge: true }
    )

    firestoreMeter.recordWrite('seat_public', seatsDocId)
    await db.collection('seat_public').doc(seatsDocId).set(
      {
        seats: {
          [assignedSeat]: 'CONFIRMED',
        },
        updatedAt: isoNow,
      },
      { merge: true }
    )

    // 6. Record booking in trip document
    try {
      await TripsRepository.recordBookingInTrip(tripId, 1, [assignedSeat])
    } catch {}

    const { sequence: pickupSeq } = getStopSequence(pickupStop, isAhmPun)
    const dropSeq = getDropSequence(dropStop, isAhmPun)

    return NextResponse.json({
      success: true,
      message: `✓ Saved ${name} to Route ${ROUTES[routeId].name}! Assigned Seat ${assignedSeat} (${ticketNo}).`,
      ticketNo,
      passenger: {
        name: name.trim(),
        mobile: normalizedMobile,
        pickupStop,
        pickupSequence: pickupSeq,
        pickupTime,
        dropStop,
        dropSequence: dropSeq,
        seatNo: assignedSeat,
        ticketNo,
        tripId,
        busNumber,
        fare,
        bookedAt: isoNow,
      },
    })
  } catch (err: any) {
    console.error('[Route Passengers POST Error]:', err)
    return NextResponse.json(
      {
        error: {
          code: 'CREATION_FAILED',
          message: err.message || 'Failed to save passenger to route',
        },
      },
      { status: 500 }
    )
  }
}
