import { getAdminDb } from '../firebase/admin'
import { AppError, ErrorCodes } from '../errors/app-error'
import { OrdersRepository } from '../data/orders.repo'
import { SeatsRepository, BusSeatsDoc } from '../data/seats.repo'
import { AvailabilityRepository } from '../data/availability.repo'
import { TicketsRepository } from '../data/tickets.repo'
import { WalletsRepository } from '../data/wallets.repo'
import { PaymentsRepository } from '../data/payments.repo'
import { BookingsRepository, BookingDocument } from '../data/bookings.repo'
import { TripsRepository } from '../data/trips.repo'
import { bookSeatsInRtdb } from '../firebase/rtdb'
import { OrderDoc } from '../schemas/booking.schema'
import { TicketDoc } from '../schemas/ticket.schema'
import { PaymentDoc } from '../schemas/payment.schema'
import { generateQrToken } from './signature'
import { fetchRazorpayPayment, issueRazorpayRefund } from './razorpay'
import { notifySeatChartUpdate } from '../server/realtime-bus'
import { getRoute } from '../config/routes'

export interface ConfirmBookingParams {
  grp: string
  paymentId?: string
  source: 'VERIFY_API' | 'WEBHOOK' | 'WALLET_ONLY'
}

export interface ConfirmBookingResult {
  ticketNo: string
  order: OrderDoc
  isNewConfirmation: boolean
}

export async function confirmBooking(
  params: ConfirmBookingParams
): Promise<ConfirmBookingResult> {
  const { grp, paymentId, source } = params
  const db = getAdminDb()

  // 1. First transactional read to check existing confirmation (Idempotency)
  const existingOrder = await OrdersRepository.getOrder(grp)
  if (!existingOrder) {
    throw new AppError(ErrorCodes.ORDER_NOT_FOUND, `Order for group ${grp} not found`)
  }

  if (existingOrder.status === 'CONFIRMED' && existingOrder.ticketNo) {
    return {
      ticketNo: existingOrder.ticketNo,
      order: existingOrder,
      isNewConfirmation: false,
    }
  }

  if (existingOrder.status !== 'CREATED') {
    throw new AppError(
      ErrorCodes.INVALID_TICKET_STATE,
      `Cannot confirm order with status ${existingOrder.status}`
    )
  }

  // 2. If Razorpay payment is expected, verify external payment
  let paymentDetails:
    | {
        id: string
        order_id: string
        amount: number
        status: string
        method?: string
        email?: string
        contact?: string
      }
    | undefined

  if (existingOrder.razorpayPaise > 0) {
    const rzpId = paymentId || existingOrder.razorpayPaymentId
    if (!rzpId) {
      throw new AppError(
        ErrorCodes.PAYMENT_NOT_FOUND,
        'Payment ID required to confirm order with external payable amount'
      )
    }

    paymentDetails = await fetchRazorpayPayment(
      rzpId,
      existingOrder.razorpayPaise,
      existingOrder.razorpayOrderId
    )
    if (paymentDetails.status !== 'captured') {
      throw new AppError(
        ErrorCodes.PAYMENT_NOT_CAPTURED,
        `Payment ${rzpId} is not captured (status: ${paymentDetails.status})`
      )
    }

    if (paymentDetails.amount !== existingOrder.razorpayPaise) {
      throw new AppError(
        ErrorCodes.PAYMENT_AMOUNT_MISMATCH,
        `Captured payment amount (${paymentDetails.amount} paise) does not match expected (${existingOrder.razorpayPaise} paise)`
      )
    }
  }

  // 3. Execute authoritative Firestore confirmation transaction
  const ticketNo = TicketsRepository.generateTicketNo(existingOrder.routeId)
  const nowIso = new Date().toISOString()
  const busNumber = 'MH 16 DP 4951'
  const qrToken = generateQrToken(ticketNo, existingOrder.travelDate, busNumber)

  const routeConfig = getRoute(existingOrder.routeId)
  const timePart = existingOrder.tripId.split('_')[2]
  const pickupTime =
    timePart && timePart.length >= 4
      ? `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`
      : '06:00'
  const pickup = {
    pointId: existingOrder.pickup?.pointId || '',
    name: existingOrder.pickup?.name || routeConfig?.boardingPoints[0] || 'Office · 6:30 AM',
    pickupTime: existingOrder.pickup?.pickupTime || pickupTime,
    time: existingOrder.pickup?.pickupTime || pickupTime,
  }
  const drop = {
    pointId: existingOrder.drop?.pointId || '',
    name: existingOrder.drop?.name || routeConfig?.dropPoints[0] || 'Wakadewadi',
  }

  try {
    await db.runTransaction(async (t) => {
      // Re-read order inside transaction
      const order = await OrdersRepository.getOrderInTx(t, grp)
      if (!order) {
        throw new AppError(ErrorCodes.ORDER_NOT_FOUND, `Order ${grp} not found in transaction`)
      }
      if (order.status === 'CONFIRMED') {
        return // Already confirmed by concurrent request
      }

      // Verify seats are still held by this grp
      const busSeatsSnap = await t.get(
        db.collection('bus_seats').doc(`${order.tripId}_${order.travelDate}`)
      )
      const busSeatsData = busSeatsSnap.exists
        ? (busSeatsSnap.data() as BusSeatsDoc).seats || {}
        : {}

      for (const seatId of order.seatIds) {
        const seat = busSeatsData[seatId]
        if (!seat || seat.state !== 'HELD' || seat.grp !== grp) {
          throw new AppError(
            ErrorCodes.SEAT_OWNERSHIP_FAILED,
            `Seat ${seatId} hold is no longer valid or owned by this order`
          )
        }
      }

      // Process wallet debit if applicable
      if (order.walletDebitPaise > 0) {
        const walletDoc = await WalletsRepository.getWalletDocInTx(t, order.uid)
        WalletsRepository.finalizeDebitInTx(
          t,
          order.uid,
          grp,
          order.walletDebitPaise,
          ticketNo,
          walletDoc
        )
      }

      // Transition seats to CONFIRMED
      SeatsRepository.confirmSeatsInTx(
        t,
        order.tripId,
        order.travelDate,
        order.seatIds,
        grp,
        ticketNo,
        order.passengers,
        order.uid
      )

      // Adjust availability counter
      await AvailabilityRepository.adjustBookedInTx(
        t,
        order.routeId,
        order.travelDate,
        order.tripId,
        order.seatIds.length
      )

      // Create Ticket Document
      const ticketDoc: TicketDoc = {
        ticketNo,
        grp,
        uid: order.uid,
        status: 'CONFIRMED',
        route: {
          from: order.routeId === 'AHM_PUN' ? 'Ahilyanagar' : 'Pune',
          to: order.routeId === 'AHM_PUN' ? 'Pune' : 'Ahilyanagar',
          routeId: order.routeId,
        },
        travelDate: order.travelDate,
        tripId: order.tripId,
        busName: order.busName || 'Uday Express',
        busNumber,
        seatLayout: '3+2 Seater',
        pickup,
        drop,
        passengers: order.passengers.map((p) => ({
          seat: p.seat,
          title: '',
          name: p.name,
          age: p.age,
          gender: p.gender,
        })),
        contactMobile: paymentDetails?.contact || '9876543210',
        email: paymentDetails?.email,
        fare: {
          perSeatPaise: order.perSeatPaise,
          seats: order.seatIds.length,
          totalPaise: order.totalPaise,
          taxesPaise: 0,
        },
        payment: {
          method: paymentDetails?.method || (order.walletDebitPaise > 0 ? 'WALLET' : 'ONLINE'),
          razorpayPaymentId: paymentDetails?.id,
          razorpayOrderId: paymentDetails?.order_id || order.razorpayOrderId,
          walletDebitPaise: order.walletDebitPaise,
          razorpayPaise: order.razorpayPaise,
          paidAt: nowIso,
        },
        bookedAt: nowIso,
        qrToken,
        createdAt: nowIso,
        updatedAt: nowIso,
        schemaVersion: 1,
      }
      TicketsRepository.createTicketInTx(t, ticketDoc)

      // Create Payment Document if external payment was made
      if (paymentDetails) {
        const paymentDoc: PaymentDoc = {
          razorpayPaymentId: paymentDetails.id,
          razorpayOrderId: paymentDetails.order_id,
          grp,
          uid: order.uid,
          amountPaise: paymentDetails.amount,
          currency: 'INR',
          status: 'captured',
          method: paymentDetails.method,
          email: paymentDetails.email,
          contact: paymentDetails.contact,
          createdAt: nowIso,
          updatedAt: nowIso,
          schemaVersion: 1,
        }
        PaymentsRepository.createPaymentInTx(t, paymentDoc)
      }

      // Mark Order as CONFIRMED
      OrdersRepository.updateOrderInTx(t, grp, {
        status: 'CONFIRMED',
        ticketNo,
        razorpayPaymentId: paymentDetails?.id,
      })
    })

    // 4. Update permanent Firestore collections: bookings and trips
    try {
      const bookingDoc: BookingDocument = {
        id: grp,
        bookingId: grp,
        userId: existingOrder.uid,
        tripId: existingOrder.tripId,
        routeId: existingOrder.routeId,
        busId: 'bus_mh16dp4951',
        travelDate: existingOrder.travelDate,
        departureTime: pickup.pickupTime || pickupTime,
        pickup: {
          pointId: pickup.pointId,
          name: pickup.name,
          pickupTime: pickup.pickupTime || pickupTime,
        },
        drop: {
          pointId: drop.pointId,
          name: drop.name,
        },
        pickupPoint: { name: pickup.name, time: pickup.pickupTime || pickupTime },
        dropPoint: { name: drop.name },
        seats: existingOrder.seatIds,
        passengers: existingOrder.passengers.map((p) => ({
          name: p.name,
          age: p.age,
          gender: p.gender,
          seat: p.seat,
        })),
        fare: {
          perSeat: existingOrder.perSeatPaise / 100,
          seats: existingOrder.seatIds.length,
          total: existingOrder.totalPaise / 100,
        },
        totalAmount: existingOrder.totalPaise / 100,
        status: 'confirmed',
        paymentId: paymentDetails?.id || existingOrder.razorpayPaymentId,
        ticketId: ticketNo,
        ticketNo,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
      await BookingsRepository.createBooking(bookingDoc)
      await TripsRepository.recordBookingInTrip(
        existingOrder.tripId,
        existingOrder.seatIds.length,
        existingOrder.seatIds
      )
    } catch (bookingSaveErr) {
      console.warn('[confirmBooking] Non-blocking bookings/trips Firestore write warning:', bookingSaveErr)
    }

    // 5. Update Firebase Realtime Database live seat states
    try {
      await bookSeatsInRtdb({
        tripId: existingOrder.tripId,
        seatIds: existingOrder.seatIds,
        userId: existingOrder.uid,
        ticketId: ticketNo,
        ticketNo,
        bookingId: grp,
      })
    } catch (rtdbErr) {
      console.warn('[confirmBooking] RTDB seat update warning:', rtdbErr)
    }

    // Notify real-time SSE stream listeners
    notifySeatChartUpdate({
      tripId: existingOrder.tripId,
      date: existingOrder.travelDate,
      route: existingOrder.routeId,
    })

    const updatedOrder = (await OrdersRepository.getOrder(grp)) || existingOrder
    return {
      ticketNo,
      order: updatedOrder,
      isNewConfirmation: true,
    }
  } catch (err: unknown) {
    // If confirmation failed because seats were lost after payment, issue auto-refund intent
    if (paymentDetails && err instanceof AppError && err.code === ErrorCodes.SEAT_OWNERSHIP_FAILED) {
      console.error(
        `[Fulfillment Failure] Seat lost for grp ${grp} after payment ${paymentDetails.id}. Initiating auto-refund.`
      )
      try {
        await issueRazorpayRefund({
          paymentId: paymentDetails.id,
          amountPaise: paymentDetails.amount,
          notes: { reason: 'FULFILLMENT_SEAT_LOST', grp },
        })
      } catch (refundErr) {
        console.error('[Fulfillment Auto-Refund Error]', refundErr)
      }
    }
    throw err
  }
}
