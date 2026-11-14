import { describe, it, expect } from 'vitest'
import { computeStatus } from '../lib/availability/status'

describe('Availability Status Machine (computeStatus)', () => {
  const departureInstant = new Date('2026-11-20T10:00:00+05:30')

  describe('Seat boundary thresholds (when not closed)', () => {
    // Evaluation time: 120 minutes before departure (well within booking window)
    const nowBeforeClose = new Date('2026-11-20T08:00:00+05:30')

    it('returns "available" when 11 seats left (above threshold of 10)', () => {
      const status = computeStatus({
        seatsLeft: 11,
        departure: departureInstant,
        now: nowBeforeClose,
      })
      expect(status).toBe('available')
    })

    it('returns "almost-full" when exactly 10 seats left', () => {
      const status = computeStatus({
        seatsLeft: 10,
        departure: departureInstant,
        now: nowBeforeClose,
      })
      expect(status).toBe('almost-full')
    })

    it('returns "almost-full" when exactly 1 seat left', () => {
      const status = computeStatus({
        seatsLeft: 1,
        departure: departureInstant,
        now: nowBeforeClose,
      })
      expect(status).toBe('almost-full')
    })

    it('returns "sold-out" when 0 seats left', () => {
      const status = computeStatus({
        seatsLeft: 0,
        departure: departureInstant,
        now: nowBeforeClose,
      })
      expect(status).toBe('sold-out')
    })

    it('returns "sold-out" when negative seats (overbooked edge case)', () => {
      const status = computeStatus({
        seatsLeft: -1,
        departure: departureInstant,
        now: nowBeforeClose,
      })
      expect(status).toBe('sold-out')
    })
  })

  describe('Departure and 60-minute cutoff thresholds', () => {
    it('returns "available" when 61 minutes before departure with seats', () => {
      const now61MinBefore = new Date(departureInstant.getTime() - 61 * 60 * 1000)
      const status = computeStatus({
        seatsLeft: 25,
        departure: departureInstant,
        now: now61MinBefore,
      })
      expect(status).toBe('available')
    })

    it('returns "closed" when exactly 60 minutes before departure regardless of seatsLeft', () => {
      const nowExactly60Min = new Date(departureInstant.getTime() - 60 * 60 * 1000)
      const status = computeStatus({
        seatsLeft: 50,
        departure: departureInstant,
        now: nowExactly60Min,
      })
      expect(status).toBe('closed')
    })

    it('returns "closed" when 30 minutes before departure', () => {
      const now30Min = new Date(departureInstant.getTime() - 30 * 60 * 1000)
      const status = computeStatus({
        seatsLeft: 20,
        departure: departureInstant,
        now: now30Min,
      })
      expect(status).toBe('closed')
    })

    it('returns "closed" when trip has already departed', () => {
      const nowAfterDeparture = new Date(departureInstant.getTime() + 15 * 60 * 1000)
      const status = computeStatus({
        seatsLeft: 10,
        departure: departureInstant,
        now: nowAfterDeparture,
      })
      expect(status).toBe('closed')
    })
  })
})
