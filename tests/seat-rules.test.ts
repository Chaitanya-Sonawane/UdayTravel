import { describe, it, expect } from 'vitest'
import {
  zoneOf,
  neighbours,
  zoneGender,
  levelFor,
  lowestAvailableLevel,
  evaluate,
  suggestSeats,
  normalizeSeats,
  SeatState,
} from '../lib/domain/seats/rules'
import { T_ADJACENT_MS, T_OPEN_MS, FULLNESS_ADJACENT } from '../lib/config/seat-rules'

describe('Seat Rules Engine (Pure Domain)', () => {
  const baseDeparture = 1_800_000_000_000 // future timestamp
  const tFarBefore = baseDeparture - 24 * 60 * 60 * 1000 // T-24h
  const tAdjacent = baseDeparture - (T_ADJACENT_MS - 1000) // T-5h59m (inside T-6h window)
  const tOpen = baseDeparture - (T_OPEN_MS - 1000) // T-59m (inside T-1h window)

  describe('zoneOf and neighbours', () => {
    it('maps left side seats to <row>-L and right side seats to <row>-R', () => {
      expect(zoneOf('A1')).toBe('A-L')
      expect(zoneOf('A2')).toBe('A-L')
      expect(zoneOf('A3')).toBe('A-R')
      expect(zoneOf('A4')).toBe('A-R')
      expect(zoneOf('A5')).toBe('A-R')
      expect(zoneOf('J1')).toBe('J-L')
      expect(zoneOf('J5')).toBe('J-R')
    })

    it('identifies correct adjacent neighbours', () => {
      expect(neighbours('A1')).toEqual(['A2'])
      expect(neighbours('A2')).toEqual(['A1'])
      expect(neighbours('A3')).toEqual(['A4'])
      expect(neighbours('A4')).toEqual(['A3', 'A5'])
      expect(neighbours('A5')).toEqual(['A4'])
    })
  })

  describe('zoneGender dynamic calculation', () => {
    it('returns null for an empty zone', () => {
      const seats: Record<string, SeatState> = {}
      expect(zoneGender(seats, 'A-L', tFarBefore)).toBeNull()
    })

    it('returns F if a woman is present', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }
      expect(zoneGender(seats, 'A-L', tFarBefore)).toBe('F')
    })

    it('returns M if only men are present', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'M' },
      }
      expect(zoneGender(seats, 'A-L', tFarBefore)).toBe('M')
    })

    it('returns F if both F and M are in zone (woman takes precedence for strangers)', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
        A2: { state: 'CONFIRMED', gender: 'M' },
      }
      expect(zoneGender(seats, 'A-L', tFarBefore)).toBe('F')
    })

    it('ignores BLOCKED seats', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'BLOCKED' },
      }
      expect(zoneGender(seats, 'A-L', tFarBefore)).toBeNull()
    })

    it('recomputes dynamically when a hold expires', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'HELD', gender: 'F', holdExpiresAt: tFarBefore + 5000 },
      }
      // Before expiry
      expect(zoneGender(seats, 'A-L', tFarBefore)).toBe('F')
      // After expiry
      expect(zoneGender(seats, 'A-L', tFarBefore + 6000)).toBeNull()
    })
  })

  describe('Ladder levels: levelFor', () => {
    it('returns Level 0 for free seats without opposite gender neighbours', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }
      // A2 is adjacent to A1 (Female): open for Female (0), but blocked for Male (null)
      expect(levelFor(seats, 'A2', 'F', tFarBefore, baseDeparture)).toBe(0)
      expect(levelFor(seats, 'A2', 'M', tFarBefore, baseDeparture)).toBeNull()
      // B1 is in a different row: open for Male (0)
      expect(levelFor(seats, 'B1', 'M', tFarBefore, baseDeparture)).toBe(0)
    })

    it('returns null for already occupied or held seats', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
        A2: { state: 'HELD', gender: 'M', holdExpiresAt: tFarBefore + 60000 },
        A3: { state: 'BLOCKED' },
      }
      expect(levelFor(seats, 'A1', 'F', tFarBefore, baseDeparture)).toBeNull()
      expect(levelFor(seats, 'A2', 'M', tFarBefore, baseDeparture)).toBeNull()
      expect(levelFor(seats, 'A3', 'F', tFarBefore, baseDeparture)).toBeNull()
    })
  })

  describe('evaluate() validation', () => {
    it('accepts valid solo booking', () => {
      const seats: Record<string, SeatState> = {}
      const res = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: false,
          pax: [{ seatId: 'A1', gender: 'F', age: 25 }],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.levels['A1']).toBe(0)
      }
    })

    it('rejects booking when opposite genders are assigned adjacent seats in same request', () => {
      const seats: Record<string, SeatState> = {}
      const res = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: false,
          pax: [
            { seatId: 'A1', gender: 'M', age: 25 },
            { seatId: 'A2', gender: 'F', age: 25 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('SEAT_GENDER_ZONE')
      }
    })

    it('allows male and female passengers of the same account/booking to select adjacent seats when family: true', () => {
      const seats: Record<string, SeatState> = {}
      const res = evaluate(
        seats,
        {
          family: true,
          acceptAdjacent: false,
          pax: [
            { seatId: 'A1', gender: 'M', age: 25 },
            { seatId: 'A2', gender: 'F', age: 25 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.levels['A1']).toBe(0)
        expect(res.levels['A2']).toBe(0)
      }
    })

    it('still rejects adjacent seat when adjacent to an unrelated stranger of opposite gender even when family: true', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'M' },
      }
      const res = evaluate(
        seats,
        {
          family: true,
          acceptAdjacent: false,
          pax: [{ seatId: 'A2', gender: 'F', age: 25 }],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('SEAT_GENDER_ZONE')
        expect(res.seatId).toBe('A2')
      }
    })

    it('allows same gender passengers on adjacent seats', () => {
      const seats: Record<string, SeatState> = {}
      const res = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: false,
          pax: [
            { seatId: 'A1', gender: 'F', age: 25 },
            { seatId: 'A2', gender: 'F', age: 28 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(true)
    })

    it('allows opposite genders across the aisle (not neighbours)', () => {
      const seats: Record<string, SeatState> = {}
      const res = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: false,
          pax: [
            { seatId: 'A2', gender: 'M', age: 25 },
            { seatId: 'A3', gender: 'F', age: 25 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(true)
    })

    it('strictly rejects male booking adjacent to existing confirmed female seat', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }
      const res = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: false,
          pax: [{ seatId: 'A2', gender: 'M', age: 25 }],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('SEAT_GENDER_ZONE')
        expect(res.seatId).toBe('A2')
      }
    })

    it('strictly rejects female booking adjacent to existing confirmed male seat', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'M' },
      }
      const res = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: false,
          pax: [{ seatId: 'A2', gender: 'F', age: 25 }],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('SEAT_GENDER_ZONE')
        expect(res.seatId).toBe('A2')
      }
    })

    it('rejects when requested seat is already booked', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }
      const res = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: false,
          pax: [{ seatId: 'A1', gender: 'M', age: 25 }],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.code).toBe('SEAT_UNAVAILABLE')
    })
  })

  describe('suggestSeats() Scorer', () => {
    it('suggests available seats matching preferences', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
        B1: { state: 'CONFIRMED', gender: 'M' },
      }
      const suggestions = suggestSeats(
        seats,
        {
          family: false,
          pax: [{ gender: 'F', age: 25, prefs: { seatType: 'window' } }],
        },
        tFarBefore,
        baseDeparture
      )

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0]!.seatIds.length).toBe(1)
    })

    it('suggests family blocks fitting family size with zero orphan seats', () => {
      const seats: Record<string, SeatState> = {}
      // 2 pax family (same gender: can sit in adjacent double seat 1 and 2)
      const sug2 = suggestSeats(
        seats,
        {
          family: true,
          pax: [
            { gender: 'F', age: 30 },
            { gender: 'F', age: 28 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(sug2.length).toBeGreaterThan(0)
      expect(sug2[0]!.reason).toBe('FAMILY_BLOCK')
      expect(sug2[0]!.seatIds.length).toBe(2)
      // Both seats are a 2-seat side (1 and 2)
      expect(sug2[0]!.seatIds[0]!.endsWith('1')).toBe(true)
      expect(sug2[0]!.seatIds[1]!.endsWith('2')).toBe(true)

      // 2 pax mixed-gender companions: suggested across the central aisle (2 and 3)
      const sug2Mixed = suggestSeats(
        seats,
        {
          family: true,
          pax: [
            { gender: 'M', age: 30 },
            { gender: 'F', age: 28 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(sug2Mixed.length).toBeGreaterThan(0)
      expect(sug2Mixed[0]!.seatIds).toEqual(['A2', 'A3'])

      // 3 pax same-gender family
      const sug3 = suggestSeats(
        seats,
        {
          family: true,
          pax: [
            { gender: 'F', age: 30 },
            { gender: 'F', age: 28 },
            { gender: 'F', age: 6 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(sug3.length).toBeGreaterThan(0)
      expect(sug3[0]!.reason).toBe('FAMILY_BLOCK')
      expect(sug3[0]!.seatIds.length).toBe(3)
      // 3-seat side: 3, 4, 5
      expect(sug3[0]!.seatIds[0]!.endsWith('3')).toBe(true)
      expect(sug3[0]!.seatIds[1]!.endsWith('4')).toBe(true)
      expect(sug3[0]!.seatIds[2]!.endsWith('5')).toBe(true)
    })

    it('respects window preferences as a tie-breaker', () => {
      const seats: Record<string, SeatState> = {}
      const suggestions = suggestSeats(
        seats,
        {
          family: false,
          pax: [{ gender: 'M', age: 25, prefs: { seatType: 'window', area: 'front' } }],
        },
        tFarBefore,
        baseDeparture
      )

      expect(suggestions.length).toBeGreaterThan(0)
      // First suggestion should be a window seat in the front (A1 or A5)
      expect(['A1', 'A5']).toContain(suggestions[0]!.seatIds[0])
    })
  })
})
