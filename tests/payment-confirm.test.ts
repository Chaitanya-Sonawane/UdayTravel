import { describe, it, expect, vi } from 'vitest'
import { confirmBooking } from '../lib/payments/confirm'
import { OrdersRepository } from '../lib/data/orders.repo'
import { SeatsRepository } from '../lib/data/seats.repo'
import { TicketsRepository } from '../lib/data/tickets.repo'
import { AvailabilityRepository } from '../lib/data/availability.repo'
import * as razorpayModule from '../lib/payments/razorpay'

describe('Authoritative Booking Confirmation Engine', () => {
  const grp = 'grp_confirm_test_001'
  const uid = 'traveler_confirm_user'
  const tripId = 'AHM_PUN_0600'
  const date = '2026-11-29'
  const seatIds = ['E1', 'E2']

  it('atomically confirms booking, creates ticket, updates seats and increments availability', async () => {
    // 1. Hold seats first
    await SeatsRepository.placeHold(
      tripId,
      date,
      seatIds,
      uid,
      grp,
      Date.now() + 300000
    )

    // 2. Create order document
    await OrdersRepository.createOrder({
      grp,
      uid,
      routeId: 'AHM_PUN',
      tripId,
      travelDate: date,
      busName: 'Uday Express 01',
      seatIds,
      passengers: [
        { seat: 'E1', name: 'Rohan Sharma', age: 28, gender: 'male' },
        { seat: 'E2', name: 'Pooja Sharma', age: 26, gender: 'female' },
      ],
      perSeatPaise: 20000,
      totalPaise: 40000,
      walletDebitPaise: 0,
      razorpayPaise: 40000,
      status: 'CREATED',
      razorpayOrderId: 'order_mock_rzp_123',
      razorpayPaymentId: 'pay_mock_rzp_456',
      holdExpiresAt: Date.now() + 300000,
      holdExtended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    })

    // Mock fetchRazorpayPayment
    vi.spyOn(razorpayModule, 'fetchRazorpayPayment').mockResolvedValueOnce({
      id: 'pay_mock_rzp_456',
      order_id: 'order_mock_rzp_123',
      amount: 40000,
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      email: 'rohan@example.com',
      contact: '9890066580',
    })

    // 3. Confirm booking
    const result = await confirmBooking({
      grp,
      paymentId: 'pay_mock_rzp_456',
      source: 'VERIFY_API',
    })

    expect(result.ticketNo).toBeDefined()
    expect(result.ticketNo.startsWith('UT')).toBe(true)
    expect(result.isNewConfirmation).toBe(true)

    // 4. Verify ticket in database
    const ticket = await TicketsRepository.getTicket(result.ticketNo)
    expect(ticket).not.toBeNull()
    expect(ticket?.status).toBe('CONFIRMED')
    expect(ticket?.passengers.length).toBe(2)
    expect(ticket?.fare.totalPaise).toBe(40000)

    // 5. Verify seats are CONFIRMED
    const busSeats = await SeatsRepository.getBusSeats(tripId, date)
    expect(busSeats.seats['E1']?.state).toBe('CONFIRMED')
    expect(busSeats.seats['E1']?.ticketNo).toBe(result.ticketNo)
    expect(busSeats.seats['E2']?.state).toBe('CONFIRMED')

    // 6. Test Idempotency: re-confirming returns same ticket without re-execution
    const idempotentResult = await confirmBooking({
      grp,
      paymentId: 'pay_mock_rzp_456',
      source: 'VERIFY_API',
    })

    expect(idempotentResult.ticketNo).toBe(result.ticketNo)
    expect(idempotentResult.isNewConfirmation).toBe(false)
  })
})
