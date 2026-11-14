import { describe, it, expect } from 'vitest'
import { todayIST, isDateInWindow, departureInstant, weekdayLabel } from '../lib/time/ist'

describe('IST Time and Window Engine (lib/time/ist.ts)', () => {
  describe('IST Date Rollover at 00:00:00 IST', () => {
    it('evaluates 23:59:59 IST as current day before midnight rollover', () => {
      // 2026-11-13 23:59:59 IST == 2026-11-13 18:29:59 UTC
      const preMidnight = new Date('2026-11-13T18:29:59.000Z')
      expect(todayIST(preMidnight)).toBe('2026-11-13')
    })

    it('rolls over exactly at 00:00:00 IST (18:30:00 UTC) to the next day', () => {
      // 2026-11-14 00:00:00 IST == 2026-11-13 18:30:00 UTC
      const midnightExact = new Date('2026-11-13T18:30:00.000Z')
      expect(todayIST(midnightExact)).toBe('2026-11-14')
    })

    it('evaluates 00:00:01 IST as the new day', () => {
      const postMidnight = new Date('2026-11-13T18:30:01.000Z')
      expect(todayIST(postMidnight)).toBe('2026-11-14')
    })
  })

  describe('Booking Window Edges (today, today+30, today+31, yesterday)', () => {
    const referenceToday = '2026-11-14'

    it('permits booking on "today"', () => {
      expect(isDateInWindow('2026-11-14', referenceToday)).toBe(true)
    })

    it('permits booking on "today + 30 days" (exact window boundary)', () => {
      // November has 30 days. 14 Nov + 30 days = 14 Dec
      expect(isDateInWindow('2026-12-14', referenceToday)).toBe(true)
    })

    it('rejects booking on "today + 31 days" (outside 30-day window)', () => {
      expect(isDateInWindow('2026-12-15', referenceToday)).toBe(false)
    })

    it('rejects booking on "yesterday" (past date)', () => {
      expect(isDateInWindow('2026-11-13', referenceToday)).toBe(false)
    })

    it('rejects malformed date strings', () => {
      expect(isDateInWindow('invalid-date', referenceToday)).toBe(false)
      expect(isDateInWindow('2026/11/14', referenceToday)).toBe(false)
    })
  })

  describe('Departure instant and formatting', () => {
    it('creates exact UTC date corresponding to IST departure time', () => {
      const instant = departureInstant('2026-11-14', '06:00')
      // 06:00 IST == 00:30 UTC
      expect(instant.toISOString()).toBe('2026-11-14T00:30:00.000Z')
    })

    it('formats weekday label accurately in IST', () => {
      // 2026-11-14 was a Saturday
      const label = weekdayLabel('2026-11-14')
      expect(label).toBe('Sat, 14 Nov')
    })
  })
})
