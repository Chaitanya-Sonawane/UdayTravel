import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  rupeesToPaise,
  paiseToRupeesDisplay,
  validatePaise,
  computeBookingTotal,
  splitPayment,
} from '../lib/money'
import { AppError } from '../lib/errors/app-error'

describe('Money Engine (Integer Paise Strict Arithmetic)', () => {
  describe('rupeesToPaise', () => {
    it('converts common rupee amounts to integer paise', () => {
      expect(rupeesToPaise(200)).toBe(20000)
      expect(rupeesToPaise(1)).toBe(100)
      expect(rupeesToPaise(0.5)).toBe(50)
      expect(rupeesToPaise(0)).toBe(0)
      expect(rupeesToPaise(150.75)).toBe(15075)
    })

    it('rejects negative numbers and non-numbers', () => {
      expect(() => rupeesToPaise(-10)).toThrow(AppError)
      expect(() => rupeesToPaise(NaN)).toThrow(AppError)
    })
  })

  describe('paiseToRupeesDisplay', () => {
    it('formats paise to clean Indian Rupee strings', () => {
      expect(paiseToRupeesDisplay(20000)).toBe('₹200')
      expect(paiseToRupeesDisplay(100)).toBe('₹1')
      expect(paiseToRupeesDisplay(50)).toBe('₹0.50')
      expect(paiseToRupeesDisplay(15075)).toBe('₹150.75')
      expect(paiseToRupeesDisplay(0)).toBe('₹0')
    })
  })

  describe('validatePaise', () => {
    it('accepts non-negative safe integers', () => {
      expect(validatePaise(0)).toBe(0)
      expect(validatePaise(20000)).toBe(20000)
      expect(validatePaise(100000000)).toBe(100000000)
    })

    it('rejects floats and negative values', () => {
      expect(() => validatePaise(10.5)).toThrow(AppError)
      expect(() => validatePaise(-100)).toThrow(AppError)
      expect(() => validatePaise('20000')).toThrow(AppError)
    })
  })

  describe('computeBookingTotal', () => {
    it('multiplies per-seat paise with seat count', () => {
      expect(computeBookingTotal(20000, 1)).toBe(20000)
      expect(computeBookingTotal(20000, 3)).toBe(60000)
      expect(computeBookingTotal(20000, 6)).toBe(120000)
    })

    it('rejects invalid seat counts', () => {
      expect(() => computeBookingTotal(20000, 0)).toThrow(AppError)
      expect(() => computeBookingTotal(20000, -2)).toThrow(AppError)
      expect(() => computeBookingTotal(20000, 1.5)).toThrow(AppError)
    })
  })

  describe('splitPayment', () => {
    it('handles zero wallet balance', () => {
      const split = splitPayment(40000, 0)
      expect(split.walletDebitPaise).toBe(0)
      expect(split.razorpayPaise).toBe(40000)
    })

    it('handles partial wallet payment', () => {
      const split = splitPayment(40000, 15000)
      expect(split.walletDebitPaise).toBe(15000)
      expect(split.razorpayPaise).toBe(25000)
      expect(split.walletDebitPaise + split.razorpayPaise).toBe(split.totalPaise)
    })

    it('handles 100% wallet coverage with excess balance', () => {
      const split = splitPayment(40000, 60000)
      expect(split.walletDebitPaise).toBe(40000)
      expect(split.razorpayPaise).toBe(0)
    })
  })

  describe('Property-based testing (fast-check)', () => {
    it('splitPayment always strictly conserves total money without loss or gain', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10_000_000 }),
          fc.integer({ min: 0, max: 10_000_000 }),
          (totalPaise, walletPaise) => {
            const result = splitPayment(totalPaise, walletPaise)
            expect(result.walletDebitPaise + result.razorpayPaise).toBe(totalPaise)
            expect(result.walletDebitPaise).toBeLessThanOrEqual(walletPaise)
            expect(result.walletDebitPaise).toBeGreaterThanOrEqual(0)
            expect(result.razorpayPaise).toBeGreaterThanOrEqual(0)
          }
        )
      )
    })
  })
})
