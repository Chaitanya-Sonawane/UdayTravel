import {
  formatDateWithDay,
  formatTime12h,
  compute2575Refund,
} from '../time/cancellation-format'
import { TicketDoc } from '../schemas/ticket.schema'

export interface CancellationNotificationPayload {
  ticketNo: string
  dateWithDay: string
  departureTime: string
  busNumber: string
  refundAmount: string
  refundAmountPaise: number
  walletCredit: string
  walletCreditPaise: number
  smsText: string
  emailSubject: string
  emailBody: string
}

/**
 * Builds standard cancellation payload for API response, SMS, and Email
 * with identical formatted timings and refund calculations.
 */
export function buildCancellationNotification(
  ticket: TicketDoc,
  customRefund?: { sourceRefundPaise?: number; walletRefundPaise?: number }
): CancellationNotificationPayload {
  const dateWithDay = formatDateWithDay(ticket.travelDate)
  const departureRaw = ticket.pickup?.pickupTime || ticket.pickup?.time || '06:00'
  const departureTime = formatTime12h(departureRaw, ticket.travelDate)
  const busNumber = ticket.busNumber || 'MH-12-UT-2026'

  const totalPaise = ticket.fare?.totalPaise || 20000
  const split = compute2575Refund(totalPaise)

  const refundAmountPaise = customRefund?.sourceRefundPaise !== undefined ? customRefund.sourceRefundPaise : split.sourceRefundPaise
  const walletCreditPaise = customRefund?.walletRefundPaise !== undefined ? customRefund.walletRefundPaise : split.walletCreditPaise
  const refundAmount = `₹${(refundAmountPaise / 100).toFixed(2)}`
  const walletCredit = `₹${(walletCreditPaise / 100).toFixed(2)}`

  const smsText = `Uday Travels: Ticket ${ticket.ticketNo} for ${dateWithDay} at ${departureTime} (Bus ${busNumber}) has been cancelled. Refund: ${refundAmount} to your payment source, ${walletCredit} credited to your Uday Travels wallet. Support: +91 98900 66580`

  const emailSubject = `Booking Cancelled: Ticket ${ticket.ticketNo} - Uday Travels`
  const emailBody = `Dear Passenger,

Your booking has been cancelled as requested. Here is your cancellation summary:

- Ticket No. / PNR: ${ticket.ticketNo}
- Journey Date: ${dateWithDay}
- Departure Time: ${departureTime} (IST)
- Route: ${ticket.route.from} to ${ticket.route.to}
- Bus Number: ${busNumber} (${ticket.seatLayout || '3+2 Seater'})
- Passengers / Seats: ${ticket.passengers.map((p) => `${p.name} (Seat ${p.seat})`).join(', ')}

Refund Breakdown:
- Amount Paid: ₹${(totalPaise / 100).toFixed(2)}
- 25% Refund to Source: ${refundAmount}
- 75% Credited to Wallet: ${walletCredit}

If you have any questions, please contact Uday Travels customer support at care@udaytravel.in or call +91 98900 66580.

Safe travels,
Uday Travels Team`

  return {
    ticketNo: ticket.ticketNo,
    dateWithDay,
    departureTime,
    busNumber,
    refundAmount,
    refundAmountPaise,
    walletCredit,
    walletCreditPaise,
    smsText,
    emailSubject,
    emailBody,
  }
}
