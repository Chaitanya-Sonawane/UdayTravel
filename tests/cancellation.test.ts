import { describe, it, expect, vi } from 'vitest'
import { cancelBooking } from '../lib/payments/cancel'
import { TicketsRepository } from '../lib/data/tickets.repo'
import { SeatsRepository } from '../lib/data/seats.repo'
import { WalletsRepository } from '../lib/data/wallets.repo'
import { TicketDoc } from '../lib/schemas/ticket.schema'
import { AppError } from '../lib/errors/app-error'
import * as refundModule from '../lib/payments/refund'

describe('Cancellation & Refund Transactional Flow', () => {
  const ticketNo = 'UT888777'
  const uid = 'traveler_cancel_test'
  const tripId = 'AHM_PUN_0600'
  // Far future travel date to ensure cancellation window is open
  const travelDate = '2026-12-15'
  const seatIds = ['F1']

  it('cancels confirmed ticket, releases seat, and creates refund/wallet credit', async () => {
    // 1. Setup confirmed ticket in DB
    const nowIso = new Date().toISOString()
    const ticketDoc: TicketDoc = {
      ticketNo,
      grp: 'grp_cancel_001',
      uid,
      status: 'CONFIRMED',
      route: {
        from: 'Ahilyanagar',
        to: 'Pune',
        routeId: 'AHM_PUN',
      },
      travelDate,
      tripId,
      busName: 'Uday Express 01',
      busNumber: 'MH 16 DP 4951',
      seatLayout: '3+2 Seater',
      pickup: { name: 'Office', time: '06:00' },
      drop: { name: 'Shivajinagar', time: '08:45' },
      passengers: [{ seat: 'F1', title: '', name: 'Anita Deshmukh', age: 30, gender: 'female' }],
      contactMobile: '9890066580',
      fare: {
        perSeatPaise: 20000,
        seats: 1,
        totalPaise: 20000,
        taxesPaise: 0,
      },
      payment: {
        method: 'WALLET',
        walletDebitPaise: 20000,
        razorpayPaise: 0,
        paidAt: nowIso,
      },
      bookedAt: nowIso,
      qrToken: 'UT888777.mock',
      createdAt: nowIso,
      updatedAt: nowIso,
      schemaVersion: 1,
    }

    // Persist ticket and seat in test store
    await TicketsRepository.getTicket(ticketNo) // ensure initialized
    const db = (await import('../lib/firebase/admin')).getAdminDb()
    await db.collection('tickets').doc(ticketNo).set(ticketDoc)
    await db.collection('availability').doc(`AHM_PUN_${travelDate}`).set({
      route: 'AHM_PUN',
      date: travelDate,
      trips: {
        [tripId]: { booked: 1, totalSeats: 50 },
      },
    })

    // Set seat to CONFIRMED
    await SeatsRepository.placeHold(tripId, travelDate, seatIds, uid, 'grp_cancel_001', Date.now() + 300000)
    await db.runTransaction(async (t) => {
      SeatsRepository.confirmSeatsInTx(t, tripId, travelDate, seatIds, 'grp_cancel_001', ticketNo, [
        { seat: 'F1', gender: 'female' },
      ])
    })

    // Mock issueRefund so network is not touched
    vi.spyOn(refundModule, 'issueRefund').mockResolvedValue({
      ticketNo,
      status: 'PROCESSED',
      razorpayRefundId: 'rfnd_mock_123',
    })

    // 2. Execute cancel
    const cancelResult = await cancelBooking({
      ticketNo,
      callerUid: uid,
    })

    expect(cancelResult.ticket.status).toBe('CANCELLED')
    expect(cancelResult.refund.feePaise).toBe(5000) // ₹50 fee
    expect(cancelResult.refund.netRefundPaise).toBe(15000) // ₹150 net refund
    expect(cancelResult.refund.walletRefundPaise).toBe(15000)

    // 3. Verify seat is released back to AVAILABLE
    const busSeats = await SeatsRepository.getBusSeats(tripId, travelDate)
    expect(busSeats.seats['F1']?.state).toBe('AVAILABLE')

    // 4. Verify wallet received store credit
    const wallet = await WalletsRepository.getWallet(uid)
    expect(wallet.balancePaise).toBe(15000)

    // 5. Verify double cancellation is rejected
    await expect(
      cancelBooking({
        ticketNo,
        callerUid: uid,
      })
    ).rejects.toThrow(AppError)
  })
})
