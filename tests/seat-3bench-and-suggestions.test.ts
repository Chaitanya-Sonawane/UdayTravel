import { describe, it, expect } from 'vitest'
import {
  evaluate,
  levelFor,
  neighbours,
  isThreeSeatSide,
  threeSeatBenchOf,
  suggestSeats,
  SeatState,
  Pax,
} from '../lib/domain/seats/rules'

describe('Strict 3-Seat Bench & Mixed-Gender Suggestion Rules', () => {
  const tNow = Date.now()
  const tDeparture = tNow + 86400000

  describe('1. 3-Seat Bench Gender Homogeneity', () => {
    it('identifies 3-seat side columns 3, 4, 5', () => {
      expect(isThreeSeatSide('A1')).toBe(false)
      expect(isThreeSeatSide('A2')).toBe(false)
      expect(isThreeSeatSide('A3')).toBe(true)
      expect(isThreeSeatSide('A4')).toBe(true)
      expect(isThreeSeatSide('A5')).toBe(true)
      expect(threeSeatBenchOf('B4')).toEqual(['B3', 'B4', 'B5'])
    })

    it('blocks male passenger from selecting any seat in 3-seat bench if ANY seat is occupied by female', () => {
      // Seat C3 is confirmed female (window seat)
      const seats: Record<string, SeatState> = {
        C3: { state: 'CONFIRMED', gender: 'F' },
      }

      // Male tries to book C5 (aisle seat, non-adjacent to C3)
      const resC5 = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'C5', gender: 'M', age: 30 }],
        },
        tNow,
        tDeparture
      )
      expect(resC5.ok).toBe(false)
      if (!resC5.ok) {
        expect(resC5.code).toBe('SEAT_GENDER_ZONE')
        expect(resC5.seatId).toBe('C5')
      }
      expect(levelFor(seats, 'C5', 'M', tNow, tDeparture)).toBeNull()

      // Male tries to book C4 (middle seat)
      const resC4 = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'C4', gender: 'M', age: 30 }],
        },
        tNow,
        tDeparture
      )
      expect(resC4.ok).toBe(false)
      expect(levelFor(seats, 'C4', 'M', tNow, tDeparture)).toBeNull()

      // Female passenger CAN book C4 or C5 (all seats in bench are female)
      const resFemale = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'C5', gender: 'F', age: 26 }],
        },
        tNow,
        tDeparture
      )
      expect(resFemale.ok).toBe(true)
      expect(levelFor(seats, 'C5', 'F', tNow, tDeparture)).toBe(0)
    })

    it('blocks female passenger from selecting any seat in 3-seat bench if ANY seat is occupied by male', () => {
      // Seat D5 is confirmed male
      const seats: Record<string, SeatState> = {
        D5: { state: 'CONFIRMED', gender: 'M' },
      }

      // Female tries to book D3 (window seat in same bench)
      const resD3 = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'D3', gender: 'F', age: 25 }],
        },
        tNow,
        tDeparture
      )
      expect(resD3.ok).toBe(false)
      if (!resD3.ok) {
        expect(resD3.code).toBe('SEAT_GENDER_ZONE')
      }
      expect(levelFor(seats, 'D3', 'F', tNow, tDeparture)).toBeNull()

      // Male CAN book D3 or D4
      const resMale = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'D3', gender: 'M', age: 28 }],
        },
        tNow,
        tDeparture
      )
      expect(resMale.ok).toBe(true)
      expect(levelFor(seats, 'D3', 'M', tNow, tDeparture)).toBe(0)
    })
  })

  describe('2. Suggestion Engine Rules (1st three suggestions, zero opposite-gender neighbour mixing)', () => {
    it('returns up to 3 valid suggestions for 2 mixed-gender passengers without placing them as neighbours', () => {
      const seats: Record<string, SeatState> = {}
      const group = {
        family: true,
        pax: [
          { gender: 'M' as const, age: 30 },
          { gender: 'F' as const, age: 28 },
        ],
      }

      const suggestions = suggestSeats(seats, group, tNow, tDeparture)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.length).toBeLessThanOrEqual(3)

      // Verify that NO suggestion places Male and Female on adjacent seats
      for (const sug of suggestions) {
        expect(sug.seatIds).toHaveLength(2)
        const sA = sug.seatIds[0]!
        const sB = sug.seatIds[1]!
        // Neighbour check: sA must NOT be a direct neighbour of sB
        expect(neighbours(sA)).not.toContain(sB)
        expect(neighbours(sB)).not.toContain(sA)
      }

      // In top suggestion for mixed 2 pax, they should be across the central aisle (s2, s3)
      const top = suggestions[0]!
      expect(top.seatIds[0]!.endsWith('2') || top.seatIds[0]!.endsWith('3')).toBe(true)
      expect(top.seatIds[1]!.endsWith('2') || top.seatIds[1]!.endsWith('3')).toBe(true)
    })

    it('returns suggestions for 3 mixed-gender passengers (e.g. 2 Females + 1 Male) NEVER mixing in the 3-seat bench', () => {
      const seats: Record<string, SeatState> = {}
      const group = {
        family: true,
        pax: [
          { gender: 'F' as const, age: 26 },
          { gender: 'F' as const, age: 50 },
          { gender: 'M' as const, age: 28 },
        ],
      }

      const suggestions = suggestSeats(seats, group, tNow, tDeparture)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.length).toBeLessThanOrEqual(3)

      for (const sug of suggestions) {
        expect(sug.seatIds).toHaveLength(3)

        // Seats for females: indices 0 and 1
        // Seat for male: index 2
        const femaleSeats = [sug.seatIds[0]!, sug.seatIds[1]!]
        const maleSeat = sug.seatIds[2]!

        // 1. Male seat cannot be neighbour with either female seat
        for (const fSeat of femaleSeats) {
          expect(neighbours(maleSeat)).not.toContain(fSeat)
          expect(neighbours(fSeat)).not.toContain(maleSeat)
        }

        // 2. 3-seat bench rule: male seat and female seats CANNOT share the same 3-seat bench
        if (isThreeSeatSide(maleSeat)) {
          const maleBench = threeSeatBenchOf(maleSeat)
          for (const fSeat of femaleSeats) {
            expect(maleBench).not.toContain(fSeat)
          }
        }
      }
    })
  })

  describe('3. Real-Time 3-Seat Bench Selection & Instant Reversal', () => {
    it('propagates female reservation to ALL remaining seats on the 3-seat bench when ANY seat is selected', () => {
      // Simulates the seat evaluation helper in app/seats/page.tsx
      function evaluateSeatStatus(
        seatId: string,
        passengers: Array<{ id: string; seatId?: string; gender: 'woman' | 'man' }>,
        activePaxId: string
      ) {
        const isOccupied = false
        const isSelected = passengers.some((p) => p.seatId === seatId)
        const adjSeats = isThreeSeatSide(seatId)
          ? threeSeatBenchOf(seatId).filter((s) => s !== seatId)
          : neighbours(seatId)

        let hasFemaleNeighbour = false
        let hasMaleNeighbour = false

        for (const adj of adjSeats) {
          const coPax = passengers.find((p) => p.seatId === adj && p.id !== activePaxId)
          if (coPax) {
            if (coPax.gender === 'woman') hasFemaleNeighbour = true
            if (coPax.gender === 'man') hasMaleNeighbour = true
          }
        }

        const isLadiesOnly = !isOccupied && !isSelected && hasFemaleNeighbour && !hasMaleNeighbour
        return { isSelected, isLadiesOnly, hasFemaleNeighbour, hasMaleNeighbour }
      }

      // Initial state: No seats selected
      const pax = [{ id: 'p1', gender: 'woman' as const, seatId: undefined }]
      expect(evaluateSeatStatus('A3', pax, 'p1').isLadiesOnly).toBe(false)
      expect(evaluateSeatStatus('A4', pax, 'p1').isLadiesOnly).toBe(false)
      expect(evaluateSeatStatus('A5', pax, 'p1').isLadiesOnly).toBe(false)

      // Step 1: Woman selects A3 (window seat of 3-seat bench)
      const paxWithA3 = [{ id: 'p1', gender: 'woman' as const, seatId: 'A3' }]
      // A3 is selected
      expect(evaluateSeatStatus('A3', paxWithA3, 'none').isSelected).toBe(true)
      // BOTH A4 AND A5 MUST become ladies-only (pink)
      expect(evaluateSeatStatus('A4', paxWithA3, 'none').isLadiesOnly).toBe(true)
      expect(evaluateSeatStatus('A5', paxWithA3, 'none').isLadiesOnly).toBe(true)

      // Step 2: User unselects A3 (or switches away)
      const paxUnselected = [{ id: 'p1', gender: 'woman' as const, seatId: undefined }]
      // BOTH A4 and A5 instantly revert to available (white/non-pink)
      expect(evaluateSeatStatus('A4', paxUnselected, 'none').isLadiesOnly).toBe(false)
      expect(evaluateSeatStatus('A5', paxUnselected, 'none').isLadiesOnly).toBe(false)

      // Step 3: Woman selects A4 (middle seat of 3-seat bench)
      const paxWithA4 = [{ id: 'p1', gender: 'woman' as const, seatId: 'A4' }]
      expect(evaluateSeatStatus('A3', paxWithA4, 'none').isLadiesOnly).toBe(true)
      expect(evaluateSeatStatus('A5', paxWithA4, 'none').isLadiesOnly).toBe(true)
    })
  })
})
