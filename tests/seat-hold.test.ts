import { describe, it, expect, beforeEach } from 'vitest'
import {
  placeSeatHold,
  signHoldToken,
  verifyHoldToken,
} from '../lib/domain/seats/hold'
import { SeatsRepository } from '../lib/data/seats.repo'
import { AppError, ErrorCodes } from '../lib/errors/app-error'

describe('Seat Hold & State Machine', () => {
  const tripId = 'AHM_PUN_0600'
  const date = '2026-11-28'

  describe('Cryptographic Hold Tokens', () => {
    it('signs and verifies a valid hold token', () => {
      const grp = 'hold_test_123'
      const uid = 'user_abc'
      const seatIds = ['A1', 'A2']
      const expiresAt = Date.now() + 300000

      const token = signHoldToken(grp, uid, seatIds, expiresAt)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      const isValid = verifyHoldToken(token, grp, uid, seatIds, expiresAt)
      expect(isValid).toBe(true)
    })

    it('rejects tampered or mismatched hold parameters', () => {
      const grp = 'hold_test_123'
      const uid = 'user_abc'
      const seatIds = ['A1', 'A2']
      const expiresAt = Date.now() + 300000

      const token = signHoldToken(grp, uid, seatIds, expiresAt)

      // Tampered user ID
      expect(verifyHoldToken(token, grp, 'user_attacker', seatIds, expiresAt)).toBe(false)
      // Tampered seat IDs
      expect(verifyHoldToken(token, grp, uid, ['A1', 'A3'], expiresAt)).toBe(false)
      // Tampered expiration
      expect(verifyHoldToken(token, grp, uid, seatIds, expiresAt + 1000)).toBe(false)
    })
  })

  describe('Seat Hold Acquisition and Conflicts', () => {
    it('successfully acquires a hold on available seats', async () => {
      const result = await placeSeatHold({
        uid: 'user_1',
        routeId: 'AHM_PUN',
        date,
        tripId,
        seatIds: ['B1', 'B2'],
      })

      expect(result.grp).toBeDefined()
      expect(result.holdToken).toBeDefined()
      expect(result.seatIds).toEqual(['B1', 'B2'])
      expect(result.perSeatPaise).toBe(20000)
      expect(result.totalPaise).toBe(40000)

      const doc = await SeatsRepository.getBusSeats(tripId, date)
      expect(doc.seats['B1']?.state).toBe('HELD')
      expect(doc.seats['B1']?.heldBy).toBe('user_1')
      expect(doc.seats['B2']?.state).toBe('HELD')
    })

    it('prevents another user from holding already held unexpired seats', async () => {
      // First user holds C1
      await placeSeatHold({
        uid: 'user_1',
        routeId: 'AHM_PUN',
        date,
        tripId,
        seatIds: ['C1'],
      })

      // Second user attempts to hold C1
      await expect(
        placeSeatHold({
          uid: 'user_2',
          routeId: 'AHM_PUN',
          date,
          tripId,
          seatIds: ['C1'],
        })
      ).rejects.toThrow(AppError)
    })

    it('allows a new hold when prior hold has expired (lazy-expiry)', async () => {
      // Place hold with expired timestamp
      const expiredTime = Date.now() - 1000
      await SeatsRepository.placeHold(tripId, date, ['D1'], 'user_1', 'hold_old', expiredTime)

      // Another user should now be able to hold D1
      const newHold = await placeSeatHold({
        uid: 'user_2',
        routeId: 'AHM_PUN',
        date,
        tripId,
        seatIds: ['D1'],
      })

      expect(newHold.seatIds).toContain('D1')
      const doc = await SeatsRepository.getBusSeats(tripId, date)
      expect(doc.seats['D1']?.heldBy).toBe('user_2')
    })
  })
})
