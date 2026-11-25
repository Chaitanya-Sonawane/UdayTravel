import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import {
  formatDateWithDay,
  formatTime12h,
  formatDateTimeCombined,
  calculateCancellationTimeline,
  compute2575Refund,
} from '../lib/time/cancellation-format'
import { buildCancellationNotification } from '../lib/notifications/cancellation'
import { CancellationModal } from '../components/cancellation/CancellationModal'
import { TicketDoc } from '../lib/schemas/ticket.schema'

describe('Cancellation Screen & Ticket Details (High Priority)', () => {
  const sampleTicket: TicketDoc = {
    ticketNo: 'UT25354',
    grp: 'grp_test_cancel_01',
    uid: 'user_123',
    status: 'CONFIRMED',
    route: {
      from: 'Ahilyanagar',
      to: 'Pune',
      routeId: 'AHM_PUN',
    },
    travelDate: '2026-11-20',
    tripId: 'AHM_PUN_0630',
    busName: 'Uday Royal Express',
    busNumber: 'MH-12-UT-2026',
    seatLayout: '3+2 Seater Coach',
    pickup: {
      pointId: 'pp_office',
      name: 'Office Ekvira Chowk',
      time: '06:30',
      pickupTime: '06:30',
    },
    drop: {
      pointId: 'dp_wakadewadi',
      name: 'Wakadewadi Pune',
      time: '08:45',
    },
    passengers: [
      {
        seat: '12',
        title: 'Mr',
        name: 'Rahul Sharma',
        age: 28,
        gender: 'male',
      },
      {
        seat: '14',
        title: 'Mrs',
        name: 'Pooja Sharma',
        age: 26,
        gender: 'female',
      },
    ],
    contactMobile: '9890066580',
    email: 'rahul@example.com',
    fare: {
      perSeatPaise: 20000,
      seats: 2,
      totalPaise: 40000,
      taxesPaise: 0,
    },
    payment: {
      method: 'CARD',
      razorpayPaymentId: 'pay_123456789',
      razorpayOrderId: 'order_123456789',
      walletDebitPaise: 0,
      razorpayPaise: 40000,
      paidAt: '2026-11-15T10:00:00+05:30',
    },
    bookedAt: '2026-11-15T10:00:00+05:30',
    qrToken: 'UT25354.mocktoken',
    createdAt: '2026-11-15T10:00:00+05:30',
    updatedAt: '2026-11-15T10:00:00+05:30',
    schemaVersion: 1,
  }

  // 1. Day Name Verification
  it('correctly calculates the day name for any travel date in Asia/Kolkata', () => {
    // 2026-11-20 is a Friday
    expect(formatDateWithDay('2026-11-20')).toBe('Friday, 20 Nov 2026')
    // 2026-11-21 is a Saturday
    expect(formatDateWithDay('2026-11-21')).toBe('Saturday, 21 Nov 2026')
    // 2026-11-22 is a Sunday
    expect(formatDateWithDay('2026-11-22')).toBe('Sunday, 22 Nov 2026')
    // 2026-11-23 is a Monday
    expect(formatDateWithDay('2026-11-23')).toBe('Monday, 23 Nov 2026')
  })

  // 2. 12-Hour Time Format in IST
  it('formats departure time into 12-hour AM/PM format in Asia/Kolkata', () => {
    expect(formatTime12h('06:30')).toBe('06:30 AM')
    expect(formatTime12h('18:30')).toBe('06:30 PM')
    expect(formatTime12h('22:30')).toBe('10:30 PM')
    expect(formatDateTimeCombined('2026-11-20', '22:30')).toBe('Friday, 20 Nov 2026, 10:30 PM')
  })

  // 3. Ticket Card Renders All Required Fields
  it('ticket summary card renders all required fields: PNR, date+day, departure time, boarding, bus, route, seats, amount', () => {
    const html = renderToString(
      <CancellationModal
        ticketNo="UT25354"
        isOpen={true}
        onClose={() => {}}
        initialTicket={sampleTicket}
      />
    )

    // Ticket No. / PNR (booking ID)
    expect(html).toContain('UT25354')

    // Journey date WITH day name
    expect(html).toContain('Friday, 20 Nov 2026')

    // Departure time in 12-hour format with AM/PM (largest/boldest text)
    expect(html).toContain('06:30 AM')
    expect(html).toContain('Scheduled Departure Time (IST)')

    // Boarding point and its reporting time
    expect(html).toContain('Office Ekvira Chowk')
    expect(html).toContain('Reporting Time')

    // Bus number and bus type
    expect(html).toContain('MH-12-UT-2026')
    expect(html).toContain('3+2 Seater Coach')
    expect(html).toContain('Uday Royal Express')

    // Route: From -> To, plus arrival time
    expect(html).toContain('Ahilyanagar')
    expect(html).toContain('Pune')
    expect(html).toContain('08:45 AM')

    // Seat numbers and passenger names
    expect(html).toContain('12')
    expect(html).toContain('Rahul Sharma')
    expect(html).toContain('14')
    expect(html).toContain('Pooja Sharma')

    // Amount paid and payment mode
    expect(html).toContain('₹400.00')
    expect(html).toContain('Gateway (UPI / Card)')
  })

  // 4. Cancellation Deadline Box and Countdown behavior
  it('cancellation deadline calculates cutoff time (departure - 2 hours) and live countdown', () => {
    // Departure: 2026-11-20 06:30 AM IST
    // Cutoff: 2026-11-20 04:30 AM IST
    // Now: 2026-11-20 02:15:30 AM IST (2h 14m 30s remaining)
    const mockNow = new Date('2026-11-20T02:15:30+05:30')
    const tl = calculateCancellationTimeline({
      travelDate: '2026-11-20',
      departureTime: '06:30',
      now: mockNow,
    })

    expect(tl.isClosed).toBe(false)
    expect(tl.cutoffTime12h).toBe('04:30 AM')
    expect(tl.allowedUntilFormatted).toContain('04:30 AM')
    expect(tl.allowedUntilFormatted).toContain('Friday, 20 Nov 2026')
    expect(tl.countdownText).toBe('Time left to cancel: 2h 14m 30s')
  })

  // 5. Auto-disable button at cutoff
  it('auto-disables confirm button when countdown hits zero and shows warning', () => {
    // Departure: 2026-11-20 06:30 AM IST
    // Cutoff: 2026-11-20 04:30 AM IST
    // Now: 2026-11-20 04:30:01 AM IST (cutoff passed)
    const mockNowClosed = new Date('2026-11-20T04:30:01+05:30')
    const tlClosed = calculateCancellationTimeline({
      travelDate: '2026-11-20',
      departureTime: '06:30',
      now: mockNowClosed,
    })

    expect(tlClosed.isClosed).toBe(true)
    expect(tlClosed.countdownText).toBe('Cancellation closed. Bus departs at 06:30 AM')

    // Render with closed timeline
    const html = renderToString(
      <CancellationModal
        ticketNo="UT25354"
        isOpen={true}
        onClose={() => {}}
        initialTicket={sampleTicket}
        initialTimeline={tlClosed}
      />
    )

    // Confirm button must have disabled attribute
    expect(html).toContain('disabled=""')
    expect(html).toContain('Cancellation closed. Bus departs at 06:30 AM')
    expect(html).toContain('border-red-400')
  })

  // 6. Refund Breakdown 25% / 75% calculation
  it('correctly calculates 25% refund to original method and 75% to Uday Travels wallet', () => {
    // Total Paid: ₹400.00 (40,000 paise)
    const split = compute2575Refund(40000)
    expect(split.sourceRefundPaise).toBe(10000) // ₹100.00 (25%)
    expect(split.walletCreditPaise).toBe(30000) // ₹300.00 (75%)
    expect(split.sourceRefundFormatted).toBe('₹100.00')
    expect(split.walletCreditFormatted).toBe('₹300.00')

    const html = renderToString(
      <CancellationModal
        ticketNo="UT25354"
        isOpen={true}
        onClose={() => {}}
        initialTicket={sampleTicket}
      />
    )

    expect(html).toContain('₹100.00')
    expect(html).toContain('₹300.00')
    expect(html).toContain('25% Refund to Source Method')
    expect(html).toContain('75% Credited to Uday Wallet')
  })

  // 7. Confirm Button Text
  it('confirm button text renders Cancel Ticket', () => {
    const html = renderToString(
      <CancellationModal
        ticketNo="UT25354"
        isOpen={true}
        onClose={() => {}}
        initialTicket={sampleTicket}
      />
    )

    expect(html).toContain('Cancel Ticket')
  })

  // 8. Timings Match Between Screen and Notification
  it('timings match identically between cancellation screen and SMS/Email notification payload', () => {
    const notif = buildCancellationNotification(sampleTicket)

    expect(notif.ticketNo).toBe('UT25354')
    expect(notif.dateWithDay).toBe('Friday, 20 Nov 2026')
    expect(notif.departureTime).toBe('06:30 AM')
    expect(notif.busNumber).toBe('MH-12-UT-2026')
    expect(notif.refundAmount).toBe('₹100.00')
    expect(notif.walletCredit).toBe('₹300.00')

    // Notification SMS text verification
    expect(notif.smsText).toContain('Ticket UT25354 for Friday, 20 Nov 2026 at 06:30 AM (Bus MH-12-UT-2026) has been cancelled')
    expect(notif.smsText).toContain('Refund: ₹100.00 to your payment source')
    expect(notif.smsText).toContain('₹300.00 credited to your Uday Travels wallet')

    // Email Body verification
    expect(notif.emailBody).toContain('Friday, 20 Nov 2026')
    expect(notif.emailBody).toContain('06:30 AM (IST)')
    expect(notif.emailBody).toContain('MH-12-UT-2026')
    expect(notif.emailBody).toContain('₹100.00')
    expect(notif.emailBody).toContain('₹300.00')
  })
})
