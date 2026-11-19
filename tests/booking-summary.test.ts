import { describe, it, expect, vi } from 'vitest'
import { formatCurrency } from '../lib/formatCurrency'

describe('formatCurrency Utility', () => {
  it('formats whole integer rupee amounts without decimals', () => {
    expect(formatCurrency(600)).toBe('₹600')
    expect(formatCurrency(1200)).toBe('₹1,200')
    expect(formatCurrency(0)).toBe('₹0')
  })

  it('formats non-integer rupee amounts with 2 decimal places', () => {
    expect(formatCurrency(600.5)).toBe('₹600.50')
    expect(formatCurrency(1250.75)).toBe('₹1,250.75')
  })
})
