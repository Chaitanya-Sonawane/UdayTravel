import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { suggestSeats, evaluate, ALL_SEAT_IDS } from '../lib/domain/seats/rules'
import { getHoldSecret, signHoldToken } from '../lib/domain/seats/hold'

describe('Extra seats & suggestion patterns specification', () => {
  const tNow = Date.now()
  const tDeparture = tNow + 86400000

  it('includes front row seats 1, 2, 3, 4 and rear bench J1-J6 in ALL_SEAT_IDS', () => {
    expect(ALL_SEAT_IDS).toContain('1')
    expect(ALL_SEAT_IDS).toContain('2')
    expect(ALL_SEAT_IDS).toContain('3')
    expect(ALL_SEAT_IDS).toContain('4')
    expect(ALL_SEAT_IDS).toContain('J1')
    expect(ALL_SEAT_IDS).toContain('J5')
    expect(ALL_SEAT_IDS).toContain('J6')
  })

  it('evaluates seat 1 as valid and free when no bookings exist', () => {
    const res = evaluate(
      {},
      { family: false, pax: [{ seatId: '1', gender: 'M', age: 30 }] },
      tNow
    )
    expect(res.ok).toBe(true)
  })

  it('suggests front row solo seat 1 for single passenger with front preference', () => {
    const group = {
      family: false,
      pax: [{ gender: 'M' as const, age: 25, prefs: { area: 'front' as const } }],
    }
    const suggestions = suggestSeats({}, group, tNow, tDeparture)
    expect(suggestions.length).toBeGreaterThan(0)
    const hasSeat1 = suggestions.some((s) => s.seatIds.includes('1'))
    expect(hasSeat1).toBe(true)
  })

  it('suggests front row across-aisle pair [1, 2] for mixed gender 2-pax with front preference', () => {
    const group = {
      family: true,
      pax: [
        { gender: 'M' as const, age: 30, prefs: { area: 'front' as const } },
        { gender: 'F' as const, age: 28, prefs: { area: 'front' as const } },
      ],
    }
    const suggestions = suggestSeats({}, group, tNow, tDeparture)
    expect(suggestions.length).toBeGreaterThan(0)
    const hasFrontAislePair = suggestions.some(
      (s) =>
        (s.seatIds[0] === '1' && s.seatIds[1] === '2') ||
        (s.seatIds[0] === '2' && s.seatIds[1] === '1')
    )
    expect(hasFrontAislePair).toBe(true)
  })

  it('suggests front row bench [2, 3, 4] for 3 same-gender passengers with front preference', () => {
    const group = {
      family: true,
      pax: [
        { gender: 'M' as const, age: 30, prefs: { area: 'front' as const } },
        { gender: 'M' as const, age: 28, prefs: { area: 'front' as const } },
        { gender: 'M' as const, age: 26, prefs: { area: 'front' as const } },
      ],
    }
    const suggestions = suggestSeats({}, group, tNow, tDeparture)
    expect(suggestions.length).toBeGreaterThan(0)
    const hasFrontTrio = suggestions.some(
      (s) => s.seatIds.length === 3 && ['2', '3', '4'].every((seat) => s.seatIds.includes(seat))
    )
    expect(hasFrontTrio).toBe(true)
  })

  it('suggests rear bench 6-seat block [J1, J2, J3, J4, J5, J6] for 6 passengers with rear preference', () => {
    const group = {
      family: true,
      pax: [
        { gender: 'M' as const, age: 30, prefs: { area: 'rear' as const } },
        { gender: 'M' as const, age: 28, prefs: { area: 'rear' as const } },
        { gender: 'M' as const, age: 26, prefs: { area: 'rear' as const } },
        { gender: 'M' as const, age: 24, prefs: { area: 'rear' as const } },
        { gender: 'M' as const, age: 22, prefs: { area: 'rear' as const } },
        { gender: 'M' as const, age: 20, prefs: { area: 'rear' as const } },
      ],
    }
    const suggestions = suggestSeats({}, group, tNow, tDeparture)
    expect(suggestions.length).toBeGreaterThan(0)
    const hasRearBench6 = suggestions.some(
      (s) =>
        s.seatIds.length === 6 &&
        ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'].every((seat) => s.seatIds.includes(seat))
    )
    expect(hasRearBench6).toBe(true)
  })

  describe('HOLD_SIGNING_SECRET resilience in hold.ts', () => {
    const originalEnv = process.env.HOLD_SIGNING_SECRET

    beforeEach(() => {
      delete process.env.HOLD_SIGNING_SECRET
    })

    afterEach(() => {
      if (originalEnv) {
        process.env.HOLD_SIGNING_SECRET = originalEnv
      }
    })

    it('getHoldSecret returns fallback and signs hold token without throwing error when HOLD_SIGNING_SECRET is unset', () => {
      expect(process.env.HOLD_SIGNING_SECRET).toBeUndefined()
      const secret = getHoldSecret()
      expect(secret).toBeTruthy()
      expect(typeof secret).toBe('string')

      const token = signHoldToken('grp1', 'user1', ['1', '2'], Date.now() + 600000)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
    })
  })
})
