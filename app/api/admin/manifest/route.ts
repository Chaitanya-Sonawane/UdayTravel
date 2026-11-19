import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { TicketDoc } from '@/lib/schemas/ticket.schema'

export interface ManifestPassenger {
  seatNo: string
  ticketNo: string
  name: string
  age: number
  gender: 'male' | 'female'
  mobile: string
  pickupStop: string
  pickupTime: string
  dropStop: string
  paymentMethod: string
  farePaise: number
  bookedAt: string
  boarded: boolean
  boardedAt?: string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tripId = searchParams.get('tripId')
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  if (!tripId) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'tripId is required' } },
      { status: 400 }
    )
  }

  try {
    const db = getAdminDb()
    const tickets = await TicketsRepository.listTicketsForTrip(tripId, date)
    const confirmedTickets = tickets.filter((t) => t.status === 'CONFIRMED')

    // Read boarding status records from trip_manifest collection
    const manifestDocId = `manifest_${tripId}_${date}`
    firestoreMeter.recordRead('trip_manifest', manifestDocId)
    const manifestSnap = await db.collection('trip_manifest').doc(manifestDocId).get()
    const boardingData = manifestSnap.exists ? (manifestSnap.data()?.boardedSeats || {}) : {}

    // Read live seats to get seat order and capacity
    const busSeats = await SeatsRepository.getBusSeats(tripId, date)

    const passengers: ManifestPassenger[] = []
    let boardedCount = 0

    for (const ticket of confirmedTickets) {
      for (const p of ticket.passengers) {
        const isBoarded = !!boardingData[p.seat]?.boarded
        const boardedAt = boardingData[p.seat]?.boardedAt

        if (isBoarded) boardedCount++

        passengers.push({
          seatNo: p.seat,
          ticketNo: ticket.ticketNo,
          name: p.name,
          age: p.age,
          gender: p.gender,
          mobile: ticket.contactMobile,
          pickupStop: ticket.pickup?.name || 'Maliwada Stand',
          pickupTime: ticket.pickup?.pickupTime || '06:00',
          dropStop: ticket.drop?.name || 'Wakadewadi, Pune',
          paymentMethod: ticket.payment?.method || 'Online Gateway',
          farePaise: ticket.fare?.perSeatPaise || 20000,
          bookedAt: ticket.bookedAt,
          boarded: isBoarded,
          boardedAt,
        })
      }
    }

    // Sort passengers by seat ID (e.g. A1, A2, B1...)
    passengers.sort((a, b) => a.seatNo.localeCompare(b.seatNo, undefined, { numeric: true }))

    const totalSeats = Object.keys(busSeats.seats || {}).length || 55
    const totalBooked = passengers.length
    const pendingBoarding = Math.max(0, totalBooked - boardedCount)

    return NextResponse.json({
      success: true,
      tripId,
      travelDate: date,
      busNumber: confirmedTickets[0]?.busNumber || 'MH 16 DP 4951',
      busName: confirmedTickets[0]?.busName || 'Uday Express',
      totalSeats,
      totalBooked,
      boardedCount,
      pendingBoarding,
      boardingPercentage: totalBooked > 0 ? Math.round((boardedCount / totalBooked) * 100) : 0,
      passengers,
    })
  } catch (err: any) {
    console.error('[Manifest API] Error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to fetch manifest' } },
      { status: 500 }
    )
  }
}

const UpdateBoardingSchema = z.object({
  tripId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seatNo: z.string().min(1),
  ticketNo: z.string().min(1),
  boarded: z.boolean(),
})

export async function PATCH(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parseResult = UpdateBoardingSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: parseResult.error.issues.map((i) => i.message).join(', '),
        },
      },
      { status: 400 }
    )
  }

  const { tripId, date, seatNo, ticketNo, boarded } = parseResult.data
  const db = getAdminDb()
  const manifestDocId = `manifest_${tripId}_${date}`
  const nowIso = new Date().toISOString()

  try {
    const docRef = db.collection('trip_manifest').doc(manifestDocId)
    firestoreMeter.recordWrite('trip_manifest', manifestDocId)

    await docRef.set(
      {
        tripId,
        date,
        updatedAt: nowIso,
        [`boardedSeats.${seatNo}`]: {
          seatNo,
          ticketNo,
          boarded,
          boardedAt: boarded ? nowIso : null,
          updatedAt: nowIso,
        },
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      seatNo,
      ticketNo,
      boarded,
      boardedAt: boarded ? nowIso : null,
      message: boarded ? `Passenger on Seat ${seatNo} marked as Boarded.` : `Passenger on Seat ${seatNo} reverted to Pending.`,
    })
  } catch (err: any) {
    console.error('[Update Boarding API] Error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to update boarding status' } },
      { status: 500 }
    )
  }
}
