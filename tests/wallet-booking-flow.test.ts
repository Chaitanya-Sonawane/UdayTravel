import { describe, it, expect, vi } from 'vitest'
import { confirmBooking } from '../lib/payments/confirm'
import { cancelBooking } from '../lib/payments/cancel'
import { WalletsRepository } from '../lib/data/wallets.repo'
import { SeatsRepository } from '../lib/data/seats.repo'
import { computeRefund } from '../lib/money/refund'
import * as refundModule from '../lib/payments/refund'

describe('Uday Travels Wallet Booking & Split Payment Flow', () => {
  const tripId = 'AHM_PUN_0600'
  const travelDate = '2026-12-20'

  it('handles 100% Wallet booking payment, debits wallet balance, and creates BOOKING_PAYMENT ledger entry', async () => {
    const uid = 'traveler_wallet_full_user'
    const grp = 'grp_wallet_full_001'
    const seatId = 'A1'
    const nowIso = new Date().toISOString()
    const db = (await import('../lib/firebase/admin')).getAdminDb()

    // 1. Setup user wallet with ₹500 (50,000 paise)
    await db.runTransaction(async (t) => {
      const doc = await WalletsRepository.getWalletDocInTx(t, uid)
      WalletsRepository.creditInTx(
        t,
        uid,
        50000,
        'ADMIN_CREDIT',
        'SEED_WALLET',
        'Seed wallet ₹500',
        doc
      )
    })

    const initialWallet = await WalletsRepository.getWallet(uid)
    expect(initialWallet.balancePaise).toBe(50000)

    // 2. Place hold on seat A1 for ₹200 (20,000 paise)
    await SeatsRepository.placeHold(tripId, travelDate, [seatId], uid, grp, Date.now() + 300000)

    // Setup availability document
    await db.collection('availability').doc(`AHM_PUN_${travelDate}`).set({
      route: 'AHM_PUN',
      date: travelDate,
      trips: {
        [tripId]: { booked: 1, totalSeats: 50 },
      },
    })

    // Setup order doc in Firestore
    await db.collection('orders').doc(grp).set({
      grp,
      orderId: 'INTERNAL_WALLET_ONLY',
      amountPaise: 0,
      totalPaise: 20000,
      walletDebitPaise: 20000,
      paymentMethod: 'WALLET',
      currency: 'INR',
      receipt: `rcpt_${grp}`,
      status: 'CREATED',
      uid,
      tripId,
      travelDate,
      routeId: 'AHM_PUN',
      seatIds: [seatId],
      seats: [seatId],
      passengerCount: 1,
      passengers: [{ seat: seatId, title: 'Mr', name: 'Ramesh Patil', age: 34, gender: 'male' }],
      createdAt: nowIso,
      updatedAt: nowIso,
      schemaVersion: 1,
    })

    // 3. Confirm booking using 100% wallet
    const confirmResult = await confirmBooking({
      grp,
      paymentId: 'INTERNAL_WALLET_ONLY',
      source: 'WALLET_ONLY',
    })

    expect(confirmResult.ticketNo).toMatch(/^UT[A-Z0-9]{6}$/)

    // 4. Verify wallet balance after booking: ₹500 - ₹200 = ₹300 (30,000 paise)
    const postBookingWallet = await WalletsRepository.getWallet(uid)
    expect(postBookingWallet.balancePaise).toBe(30000)

    // 5. Verify ledger contains BOOKING_PAYMENT entry
    const ledgerSnap = await db.collection('wallets').doc(uid).collection('ledger').get()
    const ledger = ledgerSnap.docs.map((d: any) => d.data())
    const bookingPaymentEntry = ledger.find(
      (entry: any) => entry.type === 'BOOKING_PAYMENT'
    )
    expect(bookingPaymentEntry).toBeDefined()
    expect(bookingPaymentEntry?.amountPaise).toBe(-20000)
    expect(bookingPaymentEntry?.balanceBeforePaise).toBe(50000)
    expect(bookingPaymentEntry?.balanceAfterPaise).toBe(30000)
    expect(bookingPaymentEntry?.referenceId).toBe(confirmResult.ticketNo)
  })

  it('splits refund proportionally between Wallet and Razorpay on cancellation', async () => {
    const uid = 'traveler_split_refund_user'
    const ticketNo = 'UT999111'
    const grp = 'grp_split_cancel_001'
    const seatId = 'B2'
    const nowIso = new Date().toISOString()
    const db = (await import('../lib/firebase/admin')).getAdminDb()

    // Fare ₹500 (50,000 paise): Paid ₹300 (30,000 paise) via Wallet + ₹200 (20,000 paise) via Razorpay
    const ticketDoc = {
      ticketNo,
      grp,
      uid,
      status: 'CONFIRMED',
      route: { from: 'Ahilyanagar', to: 'Pune', routeId: 'AHM_PUN' },
      travelDate,
      tripId,
      busName: 'Uday Express 01',
      busNumber: 'MH 16 DP 4951',
      seatLayout: '3+2 Seater',
      pickup: { name: 'Office', time: '06:00' },
      drop: { name: 'Shivajinagar', time: '08:45' },
      passengers: [{ seat: seatId, title: 'Mr', name: 'Suresh More', age: 40, gender: 'male' }],
      contactMobile: '9890066580',
      fare: {
        perSeatPaise: 50000,
        seats: 1,
        totalPaise: 50000,
        taxesPaise: 0,
      },
      payment: {
        method: 'SPLIT',
        walletDebitPaise: 30000,
        razorpayPaise: 20000,
        razorpayPaymentId: 'pay_mock_razorpay_999',
        paidAt: nowIso,
      },
      bookedAt: nowIso,
      qrToken: `${ticketNo}.mock`,
      createdAt: nowIso,
      updatedAt: nowIso,
      schemaVersion: 1,
    }

    await db.collection('tickets').doc(ticketNo).set(ticketDoc)
    await db.collection('availability').doc(`AHM_PUN_${travelDate}`).set({
      route: 'AHM_PUN',
      date: travelDate,
      trips: { [tripId]: { booked: 1, totalSeats: 50 } },
    })

    // Setup seat state
    await SeatsRepository.placeHold(tripId, travelDate, [seatId], uid, grp, Date.now() + 300000)
    await db.runTransaction(async (t) => {
      SeatsRepository.confirmSeatsInTx(t, tripId, travelDate, [seatId], grp, ticketNo, [
        { seat: seatId, gender: 'male' },
      ])
    })

    // Mock issueRefund
    vi.spyOn(refundModule, 'issueRefund').mockResolvedValue({
      ticketNo,
      status: 'PROCESSED',
      razorpayRefundId: 'rfnd_split_mock_123',
    })

    // Cancel booking
    const cancelResult = await cancelBooking({ ticketNo, callerUid: uid })

    // Fee: ₹50 (5000 paise). Net refund: ₹450 (45000 paise)
    expect(cancelResult.refund.netRefundPaise).toBe(45000)
    // Razorpay portion: 200/500 * 450 = ₹180 (18000 paise)
    expect(cancelResult.refund.sourceRefundPaise).toBe(18000)
    // Wallet portion: 450 - 180 = ₹270 (27000 paise)
    expect(cancelResult.refund.walletRefundPaise).toBe(27000)

    // Verify wallet received ₹270 back instantly
    const wallet = await WalletsRepository.getWallet(uid)
    expect(wallet.balancePaise).toBe(27000)

    // Verify ticket is cancelled
    expect(cancelResult.ticket.status).toBe('CANCELLED')

    // Verify seat is released back to AVAILABLE
    const busSeats = await SeatsRepository.getBusSeats(tripId, travelDate)
    expect(busSeats.seats[seatId]?.state).toBe('AVAILABLE')
  })
})
