export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { SeatsRepository, BusSeatsDoc } from '@/lib/data/seats.repo'
import { AvailabilityRepository } from '@/lib/data/availability.repo'
import { generateQrToken } from '@/lib/payments/signature'
import { bookSeatsInRtdb } from '@/lib/firebase/rtdb'
import { TicketDoc } from '@/lib/schemas/ticket.schema'
import { AppError, ErrorCodes } from '@/lib/errors/app-error'
import { neighbours } from '@/lib/domain/seats/rules'

const ManualPassengerSchema = z.object({
  seat: z.string().min(1, 'Seat ID is required'),
  name: z.string().min(1, 'Passenger name is required'),
  age: z.coerce.number().min(1).max(120),
  gender: z.enum(['male', 'female', 'M', 'F']),
})

const ManualBookingRequestSchema = z.object({
  routeId: z.enum(['AHM_PUN', 'PUN_AHM']),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  tripId: z.string().min(1, 'Trip ID is required'),
  busName: z.string().default('Uday Express'),
  busNumber: z.string().default('MH 16 DP 4951'),
  seatLayout: z.string().default('3+2 Seater'),
  pickup: z.object({
    name: z.string().min(1, 'Pickup point is required'),
    pickupTime: z.string().optional(),
    pointId: z.string().optional(),
  }),
  drop: z.object({
    name: z.string().min(1, 'Drop point is required'),
    pointId: z.string().optional(),
  }),
  passengers: z.array(ManualPassengerSchema).min(1, 'At least 1 passenger is required').max(10),
  contactMobile: z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits'),
  email: z.string().email().optional().or(z.literal('')),
  paymentMethod: z.enum(['CASH', 'COUNTER_UPI', 'COMPLIMENTARY', 'GATEWAY']).default('CASH'),
  farePerSeat: z.coerce.number().min(0).max(5000).default(200),
  notes: z.string().optional(),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parseResult = ManualBookingRequestSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
        },
      },
      { status: 400 }
    )
  }

  const {
    routeId,
    travelDate,
    tripId,
    busName,
    busNumber,
    seatLayout,
    pickup,
    drop,
    passengers,
    contactMobile,
    email,
    paymentMethod,
    farePerSeat,
    notes,
  } = parseResult.data

  const db = getAdminDb()
  const ticketNo = TicketsRepository.generateTicketNo(routeId)
  const grp = `manual_${Date.now()}_${ticketNo}`
  const nowIso = new Date().toISOString()
  const perSeatPaise = Math.round(farePerSeat * 100)
  const totalPaise = perSeatPaise * passengers.length
  const seatIds = passengers.map((p) => p.seat)
  const docId = `${tripId}_${travelDate}`
  const qrToken = generateQrToken(ticketNo, travelDate, busNumber)

  const ticketDoc: TicketDoc = {
    ticketNo,
    grp,
    uid: 'admin_manual_booking',
    status: 'CONFIRMED',
    route: {
      from: routeId === 'AHM_PUN' ? 'Ahilyanagar' : 'Pune',
      to: routeId === 'AHM_PUN' ? 'Pune' : 'Ahilyanagar',
      routeId,
    },
    travelDate,
    tripId,
    busName,
    busNumber,
    seatLayout,
    pickup: {
      pointId: pickup.pointId || '',
      name: pickup.name,
      pickupTime: pickup.pickupTime || '06:00',
      time: pickup.pickupTime || '06:00',
    },
    drop: {
      pointId: drop.pointId || '',
      name: drop.name,
    },
    passengers: passengers.map((p) => ({
      seat: p.seat,
      title: '',
      name: p.name.trim(),
      age: p.age,
      gender: p.gender === 'female' || p.gender === 'F' ? 'female' : 'male',
    })),
    contactMobile,
    email: email || undefined,
    fare: {
      perSeatPaise,
      seats: passengers.length,
      totalPaise,
      taxesPaise: 0,
    },
    payment: {
      method: paymentMethod === 'CASH' ? 'Cash at Counter' : paymentMethod === 'COUNTER_UPI' ? 'Counter UPI QR' : 'Admin Pass',
      paidAt: nowIso,
      razorpayPaise: totalPaise, // Source paid at counter
      walletDebitPaise: 0,
    },
    bookedAt: nowIso,
    qrToken,
    createdAt: nowIso,
    updatedAt: nowIso,
    schemaVersion: 1,
  }

  try {
    await db.runTransaction(async (t) => {
      // 1. Verify seat availability
      const busDocRef = db.collection('bus_seats').doc(docId)
      const busSnap = await t.get(busDocRef)
      const busData = busSnap.exists ? (busSnap.data() as BusSeatsDoc) : null
      const existingSeats = busData?.seats || {}

      for (const sId of seatIds) {
        const existing = existingSeats[sId]
        if (existing && existing.state === 'CONFIRMED') {
          throw new AppError(
            ErrorCodes.SEAT_UNAVAILABLE,
            `Seat ${sId} is already booked on this bus.`
          )
        }
      }

      // 1b. Verify gender adjacency rules (Male and Female cannot be neighbours)
      for (const p of passengers) {
        const pGender = p.gender === 'female' || p.gender === 'F' ? 'F' : 'M'
        const adjSeats = neighbours(p.seat)
        for (const adj of adjSeats) {
          // Check existing confirmed seats on the bus
          const existingAdj = existingSeats[adj]
          if (existingAdj && existingAdj.state === 'CONFIRMED' && existingAdj.gender) {
            const adjGender = existingAdj.gender === 'F' ? 'F' : 'M'
            if (adjGender !== pGender) {
              throw new AppError(
                ErrorCodes.INVALID_INPUT,
                `Seat ${p.seat} (${pGender === 'F' ? 'Female' : 'Male'}) is adjacent to Seat ${adj} (${adjGender === 'F' ? 'Female' : 'Male'}). Male and female passengers cannot sit next to each other.`
              )
            }
          }
          // Check other passengers in this booking
          const coPax = passengers.find((o) => o.seat === adj && o !== p)
          if (coPax) {
            const coGender = coPax.gender === 'female' || coPax.gender === 'F' ? 'F' : 'M'
            if (coGender !== pGender) {
              throw new AppError(
                ErrorCodes.INVALID_INPUT,
                `Seats ${p.seat} and ${adj} are adjacent, but assigned to different genders (${p.name || 'P1'} and ${coPax.name || 'P2'}). Male and female passengers cannot sit next to each other.`
              )
            }
          }
        }
      }

      // 2. Write confirmed seats to bus_seats
      const updatedSeatsMap: Record<string, unknown> = {
        updatedAt: nowIso,
        rulesVersion: 2,
        tripId,
        date: travelDate,
      }

      for (const p of passengers) {
        const genderMapped = p.gender === 'female' || p.gender === 'F' ? 'F' : 'M'
        updatedSeatsMap[`seats.${p.seat}`] = {
          state: 'CONFIRMED',
          grp,
          ticketNo,
          gender: genderMapped,
          heldBy: 'admin',
          updatedAt: nowIso,
        }
      }

      firestoreMeter.recordWrite('bus_seats', docId)
      if (busSnap.exists) {
        t.update(busDocRef, updatedSeatsMap as any)
      } else {
        t.set(
          busDocRef,
          {
            tripId,
            date: travelDate,
            departureAt: Date.now(),
            rulesVersion: 2,
            v: 1,
            seats: {},
            updatedAt: nowIso,
            ...updatedSeatsMap,
          },
          { merge: true }
        )
      }

      // 3. Update public mirror seat_public
      const publicDocRef = db.collection('seat_public').doc(docId)
      const publicUpdate: Record<string, unknown> = {
        updatedAt: nowIso,
      }
      for (const p of passengers) {
        const genderMapped = p.gender === 'female' || p.gender === 'F' ? 'F' : 'M'
        publicUpdate[`taken.${p.seat}`] = genderMapped
        publicUpdate[`held.${p.seat}`] = null
      }
      firestoreMeter.recordWrite('seat_public', docId)
      t.set(publicDocRef, publicUpdate, { merge: true })

      // 4. Update availability booked counter
      await AvailabilityRepository.adjustBookedInTx(t, routeId, travelDate, tripId, passengers.length)

      // 5. Create Ticket Document
      TicketsRepository.createTicketInTx(t, ticketDoc)

      // 6. Create Booking Document
      const bookingRef = db.collection('bookings').doc(grp)
      firestoreMeter.recordWrite('bookings', grp)
      t.set(bookingRef, {
        id: grp,
        bookingId: grp,
        userId: 'admin_manual_booking',
        ticketId: ticketNo,
        ticketNo,
        tripId,
        routeId,
        busId: busNumber,
        travelDate,
        departureTime: pickup.pickupTime || '06:00',
        seatIds,
        pickup,
        drop,
        passengers: ticketDoc.passengers,
        totalAmount: totalPaise / 100,
        fare: {
          perSeat: farePerSeat,
          seats: passengers.length,
          total: totalPaise / 100,
        },
        paymentMode: paymentMethod,
        status: 'confirmed',
        source: 'ADMIN_OFFICE_COUNTER',
        notes: notes || 'Booked at office counter',
        createdAt: nowIso,
        updatedAt: nowIso,
      })
    })

    // Async non-blocking RTDB mirror
    bookSeatsInRtdb({
      tripId,
      seatIds,
      userId: 'admin',
      ticketNo,
      bookingId: grp,
    }).catch((err) => console.warn('[Manual Booking] RTDB broadcast warning:', err))

    return NextResponse.json({
      success: true,
      ticketNo,
      pnr: ticketNo,
      ticket: ticketDoc,
      qrToken,
      message: `Ticket ${ticketNo} successfully booked and confirmed for ${passengers.length} passenger(s).`,
    })
  } catch (err: unknown) {
    console.error('[Manual Booking API] Error:', err)
    return AppError.fromUnknown(err).toResponse()
  }
}
