import { describe, it, expect } from 'vitest'
import {
  evaluate,
  levelFor,
  neighbours,
  zoneOf,
  getActiveSeatGender,
  suggestSeats,
  SeatState,
} from '../lib/domain/seats/rules'
import { BUS_55_TEMPLATE, BUS_44_TEMPLATE, BUS_33_TEMPLATE } from '../lib/domain/seats/bus-templates'

describe('Strict Gender Adjacency Rule Engine: Male & Female Must NEVER Be Neighbours', () => {
  const tNow = Date.now()
  const tDeparture = tNow + 86400000 // tomorrow

  describe('1. Physical Adjacency Mapping', () => {
    it('verifies standard 2+3 bus layout neighbours (MH 16 DP 4951)', () => {
      // Left 2-seat pair
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('A1')).toEqual(['A2'])
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('A2')).toEqual(['A1'])

      // Right 3-seat pair
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('A3')).toEqual(['A4'])
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('A4')).toEqual(['A3', 'A5'])
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('A5')).toEqual(['A4'])

      // Aisle separation: A2 and A3 must NOT be adjacent neighbours
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('A2')).not.toContain('A3')
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('A3')).not.toContain('A2')
    })

    it('verifies 2+2 luxury coach layout neighbours (MH 16 DV 1003)', () => {
      expect(BUS_44_TEMPLATE.adjacentSeatsOf('B1')).toEqual(['B2'])
      expect(BUS_44_TEMPLATE.adjacentSeatsOf('B2')).toEqual(['B1'])
      expect(BUS_44_TEMPLATE.adjacentSeatsOf('B3')).toEqual(['B4'])
      expect(BUS_44_TEMPLATE.adjacentSeatsOf('B4')).toEqual(['B3'])
    })
  })

  describe('2. Booking next to existing confirmed passengers', () => {
    it('STRICTLY BLOCKS male passenger from selecting seat adjacent to confirmed female', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' }, // Booked by Female
      }

      // Male tries to book A2 (adjacent to A1)
      const res = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'A2', gender: 'M', age: 29 }],
        },
        tNow,
        tDeparture
      )

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('SEAT_GENDER_ZONE')
        expect(res.seatId).toBe('A2')
      }

      // levelFor must also return null (blocked for male)
      expect(levelFor(seats, 'A2', 'M', tNow, tDeparture)).toBeNull()
    })

    it('ALLOWS female passenger to select seat adjacent to confirmed female (Ladies Seat)', () => {
      const seats: Record<string, SeatState> = {
        A1: { state: 'CONFIRMED', gender: 'F' },
      }

      // Female books A2
      const res = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'A2', gender: 'F', age: 26 }],
        },
        tNow,
        tDeparture
      )

      expect(res.ok).toBe(true)
      expect(levelFor(seats, 'A2', 'F', tNow, tDeparture)).toBe(0)
    })

    it('STRICTLY BLOCKS female passenger from selecting seat adjacent to confirmed male', () => {
      const seats: Record<string, SeatState> = {
        C1: { state: 'CONFIRMED', gender: 'M' }, // Booked by Male
      }

      // Female tries to book C2
      const res = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'C2', gender: 'F', age: 24 }],
        },
        tNow,
        tDeparture
      )

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('SEAT_GENDER_ZONE')
        expect(res.seatId).toBe('C2')
      }

      expect(levelFor(seats, 'C2', 'F', tNow, tDeparture)).toBeNull()
    })

    it('ALLOWS male passenger to select seat adjacent to confirmed male', () => {
      const seats: Record<string, SeatState> = {
        C1: { state: 'CONFIRMED', gender: 'M' },
      }

      const res = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'C2', gender: 'M', age: 31 }],
        },
        tNow,
        tDeparture
      )

      expect(res.ok).toBe(true)
      expect(levelFor(seats, 'C2', 'M', tNow, tDeparture)).toBe(0)
    })
  })

  describe('3. Multi-Passenger Booking Validation in Same Transaction', () => {
    it('STRICTLY REJECTS male and female co-passengers assigned adjacent double seats', () => {
      const seats: Record<string, SeatState> = {}

      // Passenger 1 (Male in D1), Passenger 2 (Female in adjacent D2)
      const res = evaluate(
        seats,
        {
          family: false,
          pax: [
            { seatId: 'D1', gender: 'M', age: 30 },
            { seatId: 'D2', gender: 'F', age: 28 },
          ],
        },
        tNow,
        tDeparture
      )

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('SEAT_GENDER_ZONE')
      }
    })

    it('ALLOWS male and female co-passengers of same booking to sit together when travelling with family', () => {
      const seats: Record<string, SeatState> = {}

      // Passenger 1 (Male in D1), Passenger 2 (Female in adjacent D2) with family: true
      const res = evaluate(
        seats,
        {
          family: true,
          acceptAdjacent: false,
          pax: [
            { seatId: 'D1', gender: 'M', age: 30 },
            { seatId: 'D2', gender: 'F', age: 28 },
          ],
        },
        tNow,
        tDeparture
      )

      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.levels['D1']).toBe(0)
        expect(res.levels['D2']).toBe(0)
      }
    })

    it('STILL REJECTS male and female from sitting together if adjacent to an unrelated stranger of opposite gender, even in family mode', () => {
      const seats: Record<string, SeatState> = {
        D3: { state: 'CONFIRMED', gender: 'F' }, // Unrelated stranger woman in D3
      }

      // Family tries to seat Male in D4 (adjacent to D3) and Female in D5
      const res = evaluate(
        seats,
        {
          family: true,
          acceptAdjacent: false,
          pax: [
            { seatId: 'D4', gender: 'M', age: 30 },
            { seatId: 'D5', gender: 'F', age: 28 },
          ],
        },
        tNow,
        tDeparture
      )

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('SEAT_GENDER_ZONE')
        expect(res.seatId).toBe('D4')
      }
    })

    it('ALLOWS male and female co-passengers seated across the central aisle', () => {
      const seats: Record<string, SeatState> = {}

      // Passenger 1 (Male in D2 - left aisle), Passenger 2 (Female in D3 - right aisle)
      const res = evaluate(
        seats,
        {
          family: false,
          pax: [
            { seatId: 'D2', gender: 'M', age: 30 },
            { seatId: 'D3', gender: 'F', age: 28 },
          ],
        },
        tNow,
        tDeparture
      )

      expect(res.ok).toBe(true)
    })

    it('ALLOWS same-gender co-passengers on adjacent seats', () => {
      const seats: Record<string, SeatState> = {}

      // Two women on adjacent seats E1 and E2
      const res = evaluate(
        seats,
        {
          family: false,
          pax: [
            { seatId: 'E1', gender: 'F', age: 25 },
            { seatId: 'E2', gender: 'F', age: 52 },
          ],
        },
        tNow,
        tDeparture
      )

      expect(res.ok).toBe(true)
    })

    it('handles 3-seat side adjacency constraints (Seats 3, 4, 5)', () => {
      const seats: Record<string, SeatState> = {
        F3: { state: 'CONFIRMED', gender: 'F' }, // Window (Female)
        F5: { state: 'CONFIRMED', gender: 'M' }, // Aisle (Male)
      }

      // Middle seat F4 has both female and male neighbours:
      // A male cannot sit in F4 (neighbour F3 is female)
      const maleRes = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'F4', gender: 'M', age: 25 }],
        },
        tNow,
        tDeparture
      )
      expect(maleRes.ok).toBe(false)

      // A female cannot sit in F4 (neighbour F5 is male)
      const femaleRes = evaluate(
        seats,
        {
          family: false,
          pax: [{ seatId: 'F4', gender: 'F', age: 25 }],
        },
        tNow,
        tDeparture
      )
      expect(femaleRes.ok).toBe(false)
    })
  })

  describe('4. Active Seat Gender Resolution', () => {
    it('correctly extracts and normalizes gender from various formats', () => {
      expect(getActiveSeatGender({ state: 'CONFIRMED', gender: 'F' }, tNow)).toBe('F')
      expect(getActiveSeatGender({ state: 'CONFIRMED', gender: 'M' }, tNow)).toBe('M')
      expect(getActiveSeatGender({ state: 'CONFIRMED', gender: 'female' as any }, tNow)).toBe('F')
      expect(getActiveSeatGender({ state: 'CONFIRMED', gender: 'woman' as any }, tNow)).toBe('F')
      expect(getActiveSeatGender({ state: 'CONFIRMED', gender: 'male' as any }, tNow)).toBe('M')
      expect(getActiveSeatGender({ state: 'BLOCKED' }, tNow)).toBeNull()
      expect(getActiveSeatGender({ state: 'AVAILABLE' }, tNow)).toBeNull()
    })
  })
})
