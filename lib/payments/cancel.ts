import { getAdminDb } from '../firebase/admin'
import { AppError, ErrorCodes } from '../errors/app-error'
import { TicketsRepository } from '../data/tickets.repo'
import { SeatsRepository } from '../data/seats.repo'
import { AvailabilityRepository } from '../data/availability.repo'
import { WalletsRepository } from '../data/wallets.repo'
import { RefundsRepository } from '../data/refunds.repo'
import { BookingsRepository } from '../data/bookings.repo'
import { TripsRepository } from '../data/trips.repo'
import { cancelSeatsInRtdb } from '../firebase/rtdb'
import { isCancellationAllowed, computeRefund, RefundBreakdown } from '../money/refund'
import { compute2575Refund } from '../time/cancellation-format'
import { RefundDoc, TicketDoc } from '../schemas/ticket.schema'
import { notifySeatChartUpdate } from '../server/realtime-bus'
import { issueRefund } from './refund'

export interface CancelBookingParams {
  ticketNo: string
  callerUid: string
  isAnonymous?: boolean
  reason?: string
}

export interface CancelBookingResult {
  ticket: TicketDoc
  refund: RefundBreakdown
  refundDoc?: RefundDoc
}

export async function cancelBooking(
  params: CancelBookingParams
): Promise<CancelBookingResult> {
  const { ticketNo, callerUid, isAnonymous, reason } = params
  const db = getAdminDb()

  const ticket = await TicketsRepository.getTicket(ticketNo)
  if (!ticket) {
    throw new AppError(ErrorCodes.NOT_FOUND, `Ticket ${ticketNo} not found`)
  }

  // Authorize caller: must be ticket owner or admin
  if (ticket.uid !== callerUid && callerUid !== 'admin') {
    throw new AppError(ErrorCodes.FORBIDDEN, 'You do not have permission to cancel this ticket')
  }

  if (ticket.status === 'CANCELLED') {
    throw new AppError(ErrorCodes.ALREADY_CANCELLED, `Ticket ${ticketNo} is already cancelled`)
  }

  if (ticket.status !== 'CONFIRMED') {
    throw new AppError(
      ErrorCodes.INVALID_TICKET_STATE,
      `Cannot cancel ticket in ${ticket.status} status`
    )
  }

  // Resolve departure time from ticket pickup or trip ID
  const departureTime =
    ticket.pickup?.pickupTime ||
    ticket.pickup?.time ||
    (ticket.tripId ? ticket.tripId.split('_')[2] : undefined) ||
    '06:00'

  // Cancellation policy check in IST
  const policyCheck = isCancellationAllowed({
    routeId: ticket.route.routeId,
    travelDate: ticket.travelDate,
    departureTime,
    bookedAtIso: ticket.bookedAt,
    allowAdminOverride: callerUid === 'admin',
  })

  if (!policyCheck.allowed) {
    throw new AppError(
      ErrorCodes.CANCELLATION_WINDOW_CLOSED,
      policyCheck.reason || 'Cancellation window is closed for this journey'
    )
  }

  // Anonymous user check: in production strict mode without verified contact mobile
  if (isAnonymous && callerUid !== 'admin' && process.env.NODE_ENV === 'production' && !ticket.contactMobile) {
    throw new AppError(
      ErrorCodes.ACCOUNT_LINK_REQUIRED,
      'Please sign in or link your phone number to cancel and receive your refund'
    )
  }

  // Compute refund
  let refundBreakdown: RefundBreakdown
  if (ticket.payment.walletDebitPaise === 0 && ticket.payment.razorpayPaise > 0) {
    const split = compute2575Refund(ticket.fare.totalPaise)
    refundBreakdown = {
      totalPaidPaise: ticket.fare.totalPaise,
      feePaise: 0,
      netRefundPaise: ticket.fare.totalPaise,
      sourceRefundPaise: split.sourceRefundPaise,
      walletRefundPaise: split.walletCreditPaise,
      seatCount: ticket.fare.seats,
    }
  } else {
    refundBreakdown = computeRefund({
      totalPaidPaise: ticket.fare.totalPaise,
      seatCount: ticket.fare.seats,
      sourcePaidPaise: ticket.payment.razorpayPaise,
      walletPaidPaise: ticket.payment.walletDebitPaise,
    })
  }

  const nowIso = new Date().toISOString()
  let createdRefundDoc: RefundDoc | undefined

  await db.runTransaction(async (t) => {
    // Re-verify ticket inside transaction
    const txTicket = await TicketsRepository.getTicketInTx(t, ticketNo)
    if (!txTicket || txTicket.status !== 'CONFIRMED') {
      throw new AppError(ErrorCodes.CONFLICT, 'Ticket status changed concurrently')
    }

    // 1. Release seats in bus_seats
    const seatIds = txTicket.passengers.map((p) => p.seat)
    SeatsRepository.releaseSeatsInTx(t, txTicket.tripId, txTicket.travelDate, seatIds)

    // 2. Decrement booked count in availability
    await AvailabilityRepository.adjustBookedInTx(
      t,
      txTicket.route.routeId,
      txTicket.travelDate,
      txTicket.tripId,
      -txTicket.fare.seats
    )

    // 3. Credit store credit wallet if wallet was used or allocated
    if (refundBreakdown.walletRefundPaise > 0) {
      const walletDoc = await WalletsRepository.getWalletDocInTx(t, txTicket.uid)
      WalletsRepository.creditInTx(
        t,
        txTicket.uid,
        refundBreakdown.walletRefundPaise,
        'REFUND',
        ticketNo,
        `Refund for cancelled ticket ${ticketNo}`,
        walletDoc
      )
    }

    // 4. Create Refund record for Razorpay payment refund if applicable
    if (refundBreakdown.sourceRefundPaise > 0) {
      createdRefundDoc = {
        ticketNo,
        uid: txTicket.uid,
        grp: txTicket.grp,
        totalPaidPaise: refundBreakdown.totalPaidPaise,
        feePaise: refundBreakdown.feePaise,
        netRefundPaise: refundBreakdown.netRefundPaise,
        sourceRefundPaise: refundBreakdown.sourceRefundPaise,
        walletRefundPaise: refundBreakdown.walletRefundPaise,
        status: 'PENDING',
        createdAt: nowIso,
        updatedAt: nowIso,
        schemaVersion: 1,
      }
      RefundsRepository.createRefundInTx(t, createdRefundDoc)
    }

    // 5. Update Ticket status to CANCELLED
    TicketsRepository.updateTicketInTx(t, ticketNo, {
      status: 'CANCELLED',
      cancellationFeePaise: refundBreakdown.feePaise,
      refundPaise: refundBreakdown.netRefundPaise,
      cancelledAt: nowIso,
    })
  })

  const seatIds = ticket.passengers.map((p) => p.seat)

  // Update Bookings collection
  try {
    await BookingsRepository.updateBookingStatus(ticket.grp, 'cancelled')
  } catch (bErr) {
    console.warn('[cancelBooking] Booking update warning:', bErr)
  }

  // Update Trips collection
  try {
    await TripsRepository.recordCancellationInTrip(ticket.tripId, ticket.fare.seats, seatIds)
  } catch (tErr) {
    console.warn('[cancelBooking] Trip record warning:', tErr)
  }

  // Update Firebase Realtime Database live seat states
  try {
    await cancelSeatsInRtdb({ tripId: ticket.tripId, seatIds })
  } catch (rErr) {
    console.warn('[cancelBooking] RTDB release warning:', rErr)
  }

  // Post-transaction external calls:
  // If external source refund is pending and payment ID exists, trigger external Razorpay refund
  if (createdRefundDoc && ticket.payment.razorpayPaymentId) {
    try {
      await issueRefund(ticketNo)
    } catch (err) {
      console.warn(`[Cancellation] External Razorpay refund queued as PENDING for ticket ${ticketNo}:`, err)
    }
  }

  // Notify real-time seat chart stream
  notifySeatChartUpdate({
    tripId: ticket.tripId,
    date: ticket.travelDate,
    route: ticket.route.routeId,
  })

  const updatedTicket = (await TicketsRepository.getTicket(ticketNo)) || ticket
  return {
    ticket: updatedTicket,
    refund: refundBreakdown,
    refundDoc: createdRefundDoc,
  }
}
