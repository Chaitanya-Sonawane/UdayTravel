import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  computeRefund,
  isCancellationAllowed,
  CANCELLATION_FEE_PER_SEAT_PAISE,
} from '../lib/money/refund'
import { AppError } from '../lib/errors/app-error'

describe('Refund & Cancellation Policy Engine', () => {
  describe('isCancellationAllowed', () => {
    it('allows cancellation for AHM_PUN prior to 20:00 IST the day before travel', () => {
      const travelDate = '2026-11-20'
      // 19th Nov 15:00 IST (before cutoff)
      const now = new Date('2026-11-19T15:00:00+05:30')
      const check = isCancellationAllowed({ routeId: 'AHM_PUN', travelDate, now })
      expect(check.allowed).toBe(true)
    })

    it('rejects cancellation for AHM_PUN after 20:00 IST the day before travel', () => {
      const travelDate = '2026-11-20'
      // 19th Nov 21:00 IST (after 20:00 cutoff)
      const now = new Date('2026-11-19T21:00:00+05:30')
      const check = isCancellationAllowed({ routeId: 'AHM_PUN', travelDate, now })
      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('closed')
    })

    it('allows cancellation for same-day travel if departureTime is > 2 hours away', () => {
      const travelDate = '2026-11-18'
      const departureTime = '18:30' // 06:30 PM
      const now = new Date('2026-11-18T13:00:00+05:30') // 1:00 PM (5.5 hrs before departure)
      const check = isCancellationAllowed({
        routeId: 'PUN_AHM',
        travelDate,
        departureTime,
        now,
      })
      expect(check.allowed).toBe(true)
    })

    it('rejects cancellation for same-day travel if within 2 hours of departure', () => {
      const travelDate = '2026-11-18'
      const departureTime = '18:30'
      const now = new Date('2026-11-18T17:00:00+05:30') // 5:00 PM (1.5 hrs before departure)
      const check = isCancellationAllowed({
        routeId: 'PUN_AHM',
        travelDate,
        departureTime,
        now,
      })
      expect(check.allowed).toBe(false)
      expect(check.reason).toContain('closed')
    })

    it('rejects cancellation for PUN_AHM on travel day if booked on same day', () => {
      const travelDate = '2026-11-20'
      const bookedAtIso = '2026-11-20T08:00:00+05:30'
      const now = new Date('2026-11-20T09:00:00+05:30')
      const check = isCancellationAllowed({
        routeId: 'PUN_AHM',
        travelDate,
        bookedAtIso,
        now,
      })
      expect(check.allowed).toBe(false)
    })
  })

  describe('computeRefund', () => {
    it('deducts ₹50 (5000 paise) per seat and refunds remaining amount', () => {
      // 1 seat paid ₹200 (20000 paise)
      const refund = computeRefund({
        totalPaidPaise: 20000,
        seatCount: 1,
        sourcePaidPaise: 20000,
        walletPaidPaise: 0,
      })
      expect(refund.feePaise).toBe(5000)
      expect(refund.netRefundPaise).toBe(15000)
      expect(refund.sourceRefundPaise).toBe(15000)
      expect(refund.walletRefundPaise).toBe(0)
    })

    it('splits refund proportionally when payment was split between source and wallet', () => {
      // 2 seats: total 40000 paise (20000 wallet + 20000 card)
      // Fee: 10000 paise. Net refund: 30000 paise.
      // Expected split: 15000 source + 15000 wallet.
      const refund = computeRefund({
        totalPaidPaise: 40000,
        seatCount: 2,
        sourcePaidPaise: 20000,
        walletPaidPaise: 20000,
      })
      expect(refund.feePaise).toBe(10000)
      expect(refund.netRefundPaise).toBe(30000)
      expect(refund.sourceRefundPaise).toBe(15000)
      expect(refund.walletRefundPaise).toBe(15000)
      expect(refund.sourceRefundPaise + refund.walletRefundPaise).toBe(30000)
    })

    it('throws error if sourcePaid + walletPaid does not match totalPaid', () => {
      expect(() =>
        computeRefund({
          totalPaidPaise: 40000,
          seatCount: 2,
          sourcePaidPaise: 10000,
          walletPaidPaise: 10000, // mismatch: 20000 !== 40000
        })
      ).toThrow(AppError)
    })
  })

  describe('Property-based testing (fast-check)', () => {
    it('sourceRefundPaise + walletRefundPaise always strictly equals netRefundPaise', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 6 }), // seatCount
          fc.integer({ min: 5000, max: 100000 }), // sourcePaid
          fc.integer({ min: 0, max: 100000 }), // walletPaid
          (seatCount, sourcePaid, walletPaid) => {
            const totalPaid = sourcePaid + walletPaid
            const refund = computeRefund({
              totalPaidPaise: totalPaid,
              seatCount,
              sourcePaidPaise: sourcePaid,
              walletPaidPaise: walletPaid,
            })

            expect(refund.sourceRefundPaise + refund.walletRefundPaise).toBe(
              refund.netRefundPaise
            )
            expect(refund.sourceRefundPaise).toBeLessThanOrEqual(sourcePaid)
            expect(refund.walletRefundPaise).toBeLessThanOrEqual(walletPaid)
            expect(refund.feePaise).toBe(CANCELLATION_FEE_PER_SEAT_PAISE * seatCount)
          }
        )
      )
    })
  })
})
