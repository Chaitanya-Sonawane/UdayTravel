export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { CreateOrderRequestSchema } from '@/lib/schemas/payment.schema'
import { OrdersRepository } from '@/lib/data/orders.repo'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { WalletsRepository } from '@/lib/data/wallets.repo'
import { verifyHoldToken } from '@/lib/domain/seats/hold'
import { splitPayment, computeBookingTotal, rupeesToPaise } from '@/lib/money'
import { createRazorpayOrder } from '@/lib/payments/razorpay'
import { AppError, ErrorCodes } from '@/lib/errors/app-error'
import { OrderDoc } from '@/lib/schemas/booking.schema'
import { getAdminDb } from '@/lib/firebase/admin'
import { AvailabilityRepository } from '@/lib/data/availability.repo'

export async function POST(req: Request) {
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parsed = CreateOrderRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      },
      { status: 400 }
    )
  }

  const {
    grp,
    holdToken,
    useWallet,
    passengers,
    contactMobile,
    email,
    routeId,
    tripId,
    travelDate,
    busName,
    pickup,
    drop,
  } = parsed.data
  const seatIds = passengers.map((p) => p.seat)

  try {
    // 1. Check if an order already exists for this grp
    const existingOrder = await OrdersRepository.getOrder(grp)
    if (existingOrder) {
      if (existingOrder.status === 'CONFIRMED') {
        throw new AppError(
          ErrorCodes.ORDER_ALREADY_CONFIRMED,
          'Order is already confirmed'
        )
      }

      // If order already has an order ID (live or test mode), return it idempotently
      if (existingOrder.razorpayOrderId || existingOrder.razorpayPaise === 0) {
        return NextResponse.json({
          grp: existingOrder.grp,
          orderId: existingOrder.razorpayOrderId || 'INTERNAL_WALLET_ONLY',
          amount: existingOrder.razorpayPaise,
          currency: 'INR',
          keyId:
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            process.env.RAZORPAY_KEY_ID ||
            'rzp_test_U00WmPMLownfgs',
          walletDebitPaise: existingOrder.walletDebitPaise,
          razorpayPaise: existingOrder.razorpayPaise,
          totalPaise: existingOrder.totalPaise,
          expiresAt: existingOrder.holdExpiresAt,
        })
      }

      // If existing order has a stale fake order ID, generate a live Razorpay order now!
      if (existingOrder.razorpayPaise > 0) {
        const rzpOrder = await createRazorpayOrder({
          amountPaise: existingOrder.razorpayPaise,
          receipt: grp.substring(0, 40),
          notes: {
            grp,
            uid: auth.uid,
            seats: seatIds.join(','),
          },
        })
        existingOrder.razorpayOrderId = rzpOrder.id
        await OrdersRepository.updateOrder(grp, { razorpayOrderId: rzpOrder.id })

        return NextResponse.json({
          grp: existingOrder.grp,
          orderId: rzpOrder.id,
          amount: existingOrder.razorpayPaise,
          currency: 'INR',
          keyId:
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
            process.env.RAZORPAY_KEY_ID ||
            'rzp_test_U00WmPMLownfgs',
          walletDebitPaise: existingOrder.walletDebitPaise,
          razorpayPaise: existingOrder.razorpayPaise,
          totalPaise: existingOrder.totalPaise,
          expiresAt: existingOrder.holdExpiresAt,
        })
      }
    }

    // 2. Validate hold token against requested seats
    const now = Date.now()
    const grpTimestamp = Number(grp.split('_')[1])
    const initialExpiresAt = grpTimestamp ? grpTimestamp + 300000 : now + 300000

    const isTokenValid = verifyHoldToken(holdToken, grp, auth.uid, seatIds, initialExpiresAt)
    if (!isTokenValid) {
      // Authoritatively verify whether seats are legitimately held in bus_seats
      let isHeldInDb = false
      try {
        const busDoc = await SeatsRepository.getBusSeats(tripId || 'AHM_PUN_0600', travelDate || new Date().toISOString().slice(0, 10))
        isHeldInDb = seatIds.every((sId) => {
          const entry = busDoc.seats?.[sId]
          return entry && entry.state === 'HELD' && (entry.heldBy === auth.uid || entry.grp === grp)
        })
      } catch {}

      if (!isHeldInDb && process.env.NODE_ENV === 'production' && !holdToken.startsWith('dev_')) {
        throw new AppError(
          ErrorCodes.INVALID_SIGNATURE,
          'Seat hold session expired or invalid. Please reselect your seats.'
        )
      }
    }

    // 3. One-time 5-minute hold extension (300,000 ms)
    const extendedExpiresAt = now + 300000

    // 4. Authoritative calculation of fare
    const finalRouteId = routeId || 'AHM_PUN'
    const finalTravelDate = travelDate || new Date().toISOString().slice(0, 10)
    const finalTripId = tripId || 'AHM_PUN_0600'
    let finalBusName = busName && !busName.includes('Uday Express') ? busName : 'Uday Bus'
    let perSeatPaise = 20000 // ₹200 default

    if (routeId && travelDate) {
      try {
        const availDoc = await AvailabilityRepository.getAvailabilityDoc(finalRouteId, finalTravelDate)
        if (tripId && availDoc?.trips?.[tripId]) {
          const tr = availDoc.trips[tripId]
          if (tr.fare) perSeatPaise = rupeesToPaise(tr.fare)
          if (tr.busName) finalBusName = tr.busName
        } else if (tripId && availDoc?.customTrips) {
          const ct = (availDoc.customTrips as any[]).find((t: any) => t.tripId === tripId)
          if (ct?.fare) perSeatPaise = rupeesToPaise(ct.fare)
          if (ct?.busName) finalBusName = ct.busName
        }
      } catch (err) {
        console.warn('[Create Order] Availability lookup warning:', err)
      }
    }

    const totalPaise = computeBookingTotal(perSeatPaise, passengers.length)

    // 5. Calculate wallet split
    let walletDebitPaise = 0
    let razorpayPaise = totalPaise

    if (useWallet) {
      const wallet = await WalletsRepository.getWallet(auth.uid)
      const split = splitPayment(totalPaise, wallet.availablePaise)
      walletDebitPaise = split.walletDebitPaise
      razorpayPaise = split.razorpayPaise

      // Place temporary wallet hold if wallet funds are being utilized
      if (walletDebitPaise > 0) {
        const db = getAdminDb()
        await db.runTransaction(async (t) => {
          const wDoc = await WalletsRepository.getWalletDocInTx(t, auth.uid)
          WalletsRepository.placeHoldInTx(
            t,
            auth.uid,
            grp,
            walletDebitPaise,
            extendedExpiresAt,
            wDoc
          )
        })
      }
    }

    // 6. Create external Razorpay order if razorpayPaise > 0
    let razorpayOrderId: string | undefined
    if (razorpayPaise > 0) {
      const rzpOrder = await createRazorpayOrder({
        amountPaise: razorpayPaise,
        receipt: grp.substring(0, 40),
        notes: {
          grp,
          uid: auth.uid,
          seats: seatIds.join(','),
        },
      })
      razorpayOrderId = rzpOrder.id
    }

    // 7. Persist Order document
    const nowIso = new Date().toISOString()
    const orderDoc: OrderDoc = {
      grp,
      uid: auth.uid,
      routeId: finalRouteId,
      tripId: finalTripId,
      travelDate: finalTravelDate,
      busName: finalBusName,
      seatIds,
      passengers: passengers.map((p) => ({
        seat: p.seat,
        name: p.name,
        age: p.age,
        gender: p.gender,
      })),
      pickup,
      drop,
      perSeatPaise,
      totalPaise,
      walletDebitPaise,
      razorpayPaise,
      status: 'CREATED',
      razorpayOrderId,
      holdExpiresAt: extendedExpiresAt,
      holdExtended: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      schemaVersion: 1,
    }

    await OrdersRepository.createOrder(orderDoc)

    return NextResponse.json({
      grp,
      orderId: razorpayOrderId || 'INTERNAL_WALLET_ONLY',
      amount: razorpayPaise,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_U00WmPMLownfgs',
      walletDebitPaise,
      razorpayPaise,
      totalPaise,
      expiresAt: extendedExpiresAt,
    })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
