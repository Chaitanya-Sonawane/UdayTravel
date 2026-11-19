import { describe, it, expect } from 'vitest'
import { abbr, generateTypeCode, generateColourCode, generateItemCode } from '@/lib/codes'

describe('codes.ts unit tests', () => {
  describe('abbr(word, n)', () => {
    it('abbreviates Pant to PN', () => {
      expect(abbr('Pant', 2)).toBe('PN')
    })

    it('abbreviates Shirt to SH and SHR', () => {
      expect(abbr('Shirt', 2)).toBe('SH')
      expect(abbr('Shirt', 3)).toBe('SHR')
    })

    it('abbreviates Jeans to JN', () => {
      expect(abbr('Jeans', 2)).toBe('JN')
    })

    it('abbreviates Hoodie to HD', () => {
      expect(abbr('Hoodie', 2)).toBe('HD')
    })

    it('abbreviates Grey to GRY', () => {
      expect(abbr('Grey', 3)).toBe('GRY')
    })

    it('abbreviates White to WHT', () => {
      expect(abbr('White', 3)).toBe('WHT')
    })

    it('abbreviates Green to GRN', () => {
      expect(abbr('Green', 3)).toBe('GRN')
    })

    it('abbreviates Blue to BL', () => {
      expect(abbr('Blue', 2)).toBe('BL')
    })
  })

  describe('generateTypeCode', () => {
    it('generates standard single-word type codes', () => {
      expect(generateTypeCode('Pant')).toBe('PN')
      expect(generateTypeCode('Shirt')).toBe('SH')
      expect(generateTypeCode('Jeans')).toBe('JN')
      expect(generateTypeCode('Hoodie')).toBe('HD')
    })

    it('generates standard multi-word type codes', () => {
      expect(generateTypeCode('T-Shirt')).toBe('TSH')
      expect(generateTypeCode('Short Pant')).toBe('SPN')
      expect(generateTypeCode('Track Pant')).toBe('TPN')
    })

    it('lengthens abbreviation if code is already used', () => {
      // If SH is used, Shirt should try SHR
      expect(generateTypeCode('Shirt', ['SH'])).toBe('SHR')
      // If Short Pant SPN is used, lengthen Pant abbr
      expect(generateTypeCode('Short Pant', ['SPN'])).toBe('SPNT')
    })

    it('adds number if all letter abbreviations are taken', () => {
      const code = generateTypeCode('Hoodie', ['HD', 'HDIE', 'HDIO', 'HDIOO'])
      expect(code).toBeDefined()
    })
  })

  describe('generateColourCode', () => {
    it('generates 3-letter codes for single words', () => {
      expect(generateColourCode('Grey')).toBe('GRY')
      expect(generateColourCode('White')).toBe('WHT')
      expect(generateColourCode('Green')).toBe('GRN')
    })

    it('generates multi-word colour codes', () => {
      expect(generateColourCode('Dark Blue')).toBe('DBL')
      expect(generateColourCode('Sky Blue')).toBe('SBL')
      expect(generateColourCode('Bottle Green')).toBe('BGR')
    })

    it('returns empty string for no colour', () => {
      expect(generateColourCode('')).toBe('')
      expect(generateColourCode(undefined)).toBe('')
    })
  })

  describe('generateItemCode', () => {
    it('formats items with colours', () => {
      expect(generateItemCode('PN', 'Grey', '32')).toBe('PN-GRY-32')
      expect(generateItemCode('SH', 'White', 'M')).toBe('SH-WHT-M')
      expect(generateItemCode('PN', 'Dark Blue', '32')).toBe('PN-DBL-32')
    })

    it('formats items without colours', () => {
      expect(generateItemCode('PN', '', '30')).toBe('PN-30')
      expect(generateItemCode('PN', undefined, '30')).toBe('PN-30')
    })

    it('appends -2, -3 if code already exists', () => {
      expect(generateItemCode('PN', 'Grey', '32', ['PN-GRY-32'])).toBe('PN-GRY-32-2')
      expect(generateItemCode('PN', 'Grey', '32', ['PN-GRY-32', 'PN-GRY-32-2'])).toBe('PN-GRY-32-3')
    })
  })
})
