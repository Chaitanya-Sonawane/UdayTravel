import { describe, it, expect } from 'vitest'
import { evaluate, SeatState, Pax } from '../lib/domain/seats/rules'
import { BUS_55_TEMPLATE } from '../lib/domain/seats/bus-templates'

describe('Seat Selection: Family Mode Neighbour Seats Exemption', () => {
  const tNow = Date.now()
  const tDeparture = tNow + 86400000

  it('rejects male and female from selecting adjacent seats when family is FALSE', () => {
    const seats: Record<string, SeatState> = {}
    const req = {
      family: false,
      acceptAdjacent: false,
      pax: [
        { seatId: 'B1', gender: 'M', age: 34 },
        { seatId: 'B2', gender: 'F', age: 30 },
      ] as Pax[],
    }

    const res = evaluate(seats, req, tNow, tDeparture)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe('SEAT_GENDER_ZONE')
    }
  })

  it('allows male and female of the SAME booking/account to select adjacent neighbour seats when family: true', () => {
    const seats: Record<string, SeatState> = {}
    const req = {
      family: true,
      acceptAdjacent: false,
      pax: [
        { seatId: 'B1', gender: 'M', age: 34 },
        { seatId: 'B2', gender: 'F', age: 30 },
      ] as Pax[],
    }

    const res = evaluate(seats, req, tNow, tDeparture)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.levels['B1']).toBe(0)
      expect(res.levels['B2']).toBe(0)
    }
  })

  it('allows 3-passenger family with mixed genders in right 3-seat block (C3, C4, C5)', () => {
    const seats: Record<string, SeatState> = {}
    const req = {
      family: true,
      acceptAdjacent: false,
      pax: [
        { seatId: 'C3', gender: 'M', age: 40 },
        { seatId: 'C4', gender: 'F', age: 38 },
        { seatId: 'C5', gender: 'F', age: 10 },
      ] as Pax[],
    }

    const res = evaluate(seats, req, tNow, tDeparture)
    expect(res.ok).toBe(true)
  })

  it('strictly preserves gender protection against unrelated passengers on the bus even in family mode', () => {
    const seats: Record<string, SeatState> = {
      B1: { state: 'CONFIRMED', gender: 'F' }, // Unrelated woman already confirmed on the bus
    }

    // A male family member attempts to select B2 adjacent to stranger woman B1
    const req = {
      family: true,
      acceptAdjacent: false,
      pax: [
        { seatId: 'B2', gender: 'M', age: 34 },
      ] as Pax[],
    }

    const res = evaluate(seats, req, tNow, tDeparture)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe('SEAT_GENDER_ZONE')
      expect(res.seatId).toBe('B2')
    }
  })
})
