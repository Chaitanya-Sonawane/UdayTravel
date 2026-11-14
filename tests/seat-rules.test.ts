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
    it('returns Level 0 for free seat in an empty or same-gender zone', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }
      // Woman looking at A2 (same zone): Level 0
      expect(levelFor(seats, 'A2', 'F', tFarBefore, baseDeparture)).toBe(0)
      // Woman looking at B1 (empty zone): Level 0
      expect(levelFor(seats, 'B1', 'F', tFarBefore, baseDeparture)).toBe(0)
    })

    it('returns Level 1 for free seat with empty buffer in 3-seat side', () => {
      // In row A right side (A3, A4, A5), A3 is occupied by a woman F.
      // A4 is empty buffer.
      // A5 is at the far end.
      const seats: Record<string, SeatState> = {
        A3: { state: 'CONFIRMED', gender: 'F' },
      }
      // Male looking at A4: neighbour A3 is F -> adjacent to F, not level 1
      expect(levelFor(seats, 'A4', 'M', tFarBefore, baseDeparture)).toBeNull()
      // Male looking at A5: neighbour A4 is empty -> Level 1!
      expect(levelFor(seats, 'A5', 'M', tFarBefore, baseDeparture)).toBe(1)
    })

    it('returns null for male at A2 when A1 is occupied by F before T-6h', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }
      expect(levelFor(seats, 'A2', 'M', tFarBefore, baseDeparture)).toBeNull()
    })

    it('returns Level 2 when within T-6h or fullness >= 90%', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }
      // At T-5h59m: Level 2 opens
      expect(levelFor(seats, 'A2', 'M', tAdjacent, baseDeparture)).toBe(2)

      // Or at T-24h if bus is >= 90% full (45 seats taken)
      for (let i = 0; i < 46; i++) {
        const row = String.fromCharCode(65 + Math.floor(i / 5))
        const col = (i % 5) + 1
        seats[`${row}${col}`] = { state: 'CONFIRMED', gender: 'F' }
      }
      // B1 was occupied; delete it so 45 seats remain taken (45 / 50 = 90% full)
      delete seats['B1']
      expect(levelFor(seats, 'B1', 'M', tFarBefore, baseDeparture)).toBe(2)
    })

    it('returns OPEN at T-1h for all free seats', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }
      expect(levelFor(seats, 'A2', 'M', tOpen, baseDeparture)).toBe('OPEN')
    })
  })

  describe('evaluate() validation', () => {
    it('accepts valid Level 0 solo booking', () => {
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

    it('rejects if child under 12 is booked without family flag or without adult', () => {
      const seats: Record<string, SeatState> = {}
      const res1 = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: false,
          pax: [{ seatId: 'A1', gender: 'F', age: 10 }],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res1.ok).toBe(false)
      if (!res1.ok) expect(res1.code).toBe('FAMILY_INVALID')

      // Child with another child without adult
      const res2 = evaluate(
        seats,
        {
          family: true,
          acceptAdjacent: false,
          pax: [
            { seatId: 'A1', gender: 'F', age: 10 },
            { seatId: 'A2', gender: 'M', age: 11 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res2.ok).toBe(false)
      if (!res2.ok) expect(res2.code).toBe('FAMILY_INVALID')
    })

    it('accepts child under 12 with family flag and adult >= 18', () => {
      const seats: Record<string, SeatState> = {}
      const res = evaluate(
        seats,
        {
          family: true,
          acceptAdjacent: false,
          pax: [
            { seatId: 'A1', gender: 'F', age: 10 },
            { seatId: 'A2', gender: 'F', age: 30 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(true)
    })

    it('rejects non-family passengers of different genders in the same zone', () => {
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
      if (!res.ok) expect(res.code).toBe('SEAT_GENDER_ZONE')
    })

    it('allows family members of different genders in an empty zone', () => {
      const seats: Record<string, SeatState> = {}
      const res = evaluate(
        seats,
        {
          family: true,
          acceptAdjacent: false,
          pax: [
            { seatId: 'A1', gender: 'M', age: 30 },
            { seatId: 'A2', gender: 'F', age: 28 },
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

    it('rejects family members mixing gender in a zone that already has a stranger', () => {
      const seats: Record<string, SeatState> = {
        A3: { state: 'CONFIRMED', gender: 'F' }, // Stranger woman in A3
      }
      // Family tries to book A4 (M) and A5 (F) in the same zone with stranger
      const res = evaluate(
        seats,
        {
          family: true,
          acceptAdjacent: false,
          pax: [
            { seatId: 'A4', gender: 'M', age: 35 },
            { seatId: 'A5', gender: 'F', age: 32 },
          ],
        },
        tFarBefore,
        baseDeparture
      )
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.code).toBe('SEAT_GENDER_ZONE')
    })

    it('requires acceptAdjacent for Level 2 seats', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }
      // All other zones are full of women, so lowest available level for M is 2 at tAdjacent
      for (let r = 66; r <= 74; r++) {
        // Rows B..J full
        const row = String.fromCharCode(r)
        for (let c = 1; c <= 5; c++) {
          seats[`${row}${c}`] = { state: 'CONFIRMED', gender: 'F' }
        }
      }
      // Right side of A is also taken
      seats['A3'] = { state: 'CONFIRMED', gender: 'F' }
      seats['A4'] = { state: 'CONFIRMED', gender: 'F' }
      seats['A5'] = { state: 'CONFIRMED', gender: 'F' }
      // Only A2 is free!
      expect(lowestAvailableLevel(seats, 'M', tAdjacent, baseDeparture)).toBe(2)

      // Without consent -> fails
      const resWithout = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: false,
          pax: [{ seatId: 'A2', gender: 'M', age: 25 }],
        },
        tAdjacent,
        baseDeparture
      )
      expect(resWithout.ok).toBe(false)
      if (!resWithout.ok) expect(resWithout.code).toBe('ADJACENT_CONSENT_REQUIRED')

      // With consent -> succeeds
      const resWith = evaluate(
        seats,
        {
          family: false,
          acceptAdjacent: true,
          pax: [{ seatId: 'A2', gender: 'M', age: 25 }],
        },
        tAdjacent,
        baseDeparture
      )
      expect(resWith.ok).toBe(true)
    })
  })

  describe('suggestSeats() Scorer', () => {
    it('suggests seat next to same gender with highest priority', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
        B1: { state: 'CONFIRMED', gender: 'M' },
      }
      const suggestions = suggestSeats(
        seats,
        {
          family: false,
          pax: [{ gender: 'F', age: 25 }],
        },
        tFarBefore,
        baseDeparture
      )

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0]!.seatIds).toEqual(['A2'])
      expect(suggestions[0]!.reason).toBe('NEXT_TO_SAME_GENDER')
    })

    it('suggests family blocks fitting family size with zero orphan seats', () => {
      const seats: Record<string, SeatState> = {}
      // 2 pax family
      const sug2 = suggestSeats(
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
      expect(sug2.length).toBeGreaterThan(0)
      expect(sug2[0]!.reason).toBe('FAMILY_BLOCK')
      expect(sug2[0]!.seatIds.length).toBe(2)
      // Both seats are a 2-seat side (1 and 2)
      expect(sug2[0]!.seatIds[0]!.endsWith('1')).toBe(true)
      expect(sug2[0]!.seatIds[1]!.endsWith('2')).toBe(true)

      // 3 pax family
      const sug3 = suggestSeats(
        seats,
        {
          family: true,
          pax: [
            { gender: 'M', age: 30 },
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
