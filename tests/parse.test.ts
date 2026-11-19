import { describe, it, expect } from 'vitest'
import {
  parseSentence,
  toTypeKey,
  formatTypeDisplayName,
  singularise,
} from '@/lib/parse'

describe('parse.ts unit tests', () => {
  describe('Required Prompt Test Cases', () => {
    it('"pant gray 5 size 32" -> Pant, Grey, 32, 5', () => {
      const res = parseSentence('pant gray 5 size 32')
      expect(res).toEqual({
        type: 'Pant',
        colour: 'Grey',
        size: '32',
        qty: 5,
      })
    })

    it('"short pants 10 size medium" -> Short Pant, (no colour), M, 10', () => {
      const res = parseSentence('short pants 10 size medium')
      expect(res).toEqual({
        type: 'Short Pant',
        colour: '',
        size: 'M',
        qty: 10,
      })
    })

    it('"t-shirt black 8 size XL" -> T-Shirt, Black, XL, 8', () => {
      const res = parseSentence('t-shirt black 8 size XL')
      expect(res).toEqual({
        type: 'T-Shirt',
        colour: 'Black',
        size: 'XL',
        qty: 8,
      })
    })

    it('"five shirts white size L" -> Shirt, White, L, 5', () => {
      const res = parseSentence('five shirts white size L')
      expect(res).toEqual({
        type: 'Shirt',
        colour: 'White',
        size: 'L',
        qty: 5,
      })
    })

    it('"pants grey 12 size 34" -> Pant, Grey, 34, 12', () => {
      const res = parseSentence('pants grey 12 size 34')
      expect(res).toEqual({
        type: 'Pant',
        colour: 'Grey',
        size: '34',
        qty: 12,
      })
    })

    it('(Pant exists) "pant maroon 3 size 30" -> Pant, Maroon, 30, 3', () => {
      const res = parseSentence('pant maroon 3 size 30', {
        existingTypes: ['Pant'],
      })
      expect(res).toEqual({
        type: 'Pant',
        colour: 'Maroon',
        size: '30',
        qty: 3,
      })
    })

    it('(Pant exists) "pants 4 size 28 blue" -> Pant, Blue, 28, 4', () => {
      const res = parseSentence('pants 4 size 28 blue', {
        existingTypes: ['Pant'],
      })
      expect(res).toEqual({
        type: 'Pant',
        colour: 'Blue',
        size: '28',
        qty: 4,
      })
    })

    it('(Pant exists) "Pant dark blue five size thirty" -> Pant, Dark Blue, 30, 5', () => {
      const res = parseSentence('Pant dark blue five size thirty', {
        existingTypes: ['Pant'],
      })
      expect(res).toEqual({
        type: 'Pant',
        colour: 'Dark Blue',
        size: '30',
        qty: 5,
      })
    })

    it('(Pant selected) "grey 5 size 32" -> Pant, Grey, 32, 5', () => {
      const res = parseSentence('grey 5 size 32', {
        selectedType: 'Pant',
      })
      expect(res).toEqual({
        type: 'Pant',
        colour: 'Grey',
        size: '32',
        qty: 5,
      })
    })
  })

  describe('Singularisation & Type Formatting', () => {
    it('singularises pants -> Pant, shirts -> Shirt', () => {
      expect(singularise('pants')).toBe('Pant')
      expect(singularise('shirts')).toBe('Shirt')
    })

    it('keeps jeans unchanged', () => {
      expect(singularise('jeans')).toBe('Jeans')
      expect(toTypeKey('jeans')).toBe('jeans')
      expect(formatTypeDisplayName('jeans')).toBe('Jeans')
    })

    it('keeps words ending in ss or us unchanged', () => {
      expect(singularise('dress')).toBe('Dress')
      expect(singularise('focus')).toBe('Focus')
    })

    it('creates correct type keys', () => {
      expect(toTypeKey('Pant')).toBe('pant')
      expect(toTypeKey('pants')).toBe('pant')
      expect(toTypeKey('Short Pant')).toBe('shortpant')
      expect(toTypeKey('short pants')).toBe('shortpant')
      expect(toTypeKey('T-Shirt')).toBe('tshirt')
      expect(toTypeKey('tshirt')).toBe('tshirt')
    })
  })

  describe('Additional parsing edge cases', () => {
    it('handles size without the word "size" when two numbers are given', () => {
      const res = parseSentence('pant grey 5 32')
      expect(res).toEqual({
        type: 'Pant',
        colour: 'Grey',
        size: '32',
        qty: 5,
      })
    })

    it('handles size word without "size" keyword', () => {
      const res = parseSentence('shirt blue 4 xl')
      expect(res).toEqual({
        type: 'Shirt',
        colour: 'Blue',
        size: 'XL',
        qty: 4,
      })
    })

    it('handles unknown colour when type exists', () => {
      const res = parseSentence('pant rust 5 size 32', {
        existingTypes: ['Pant'],
      })
      expect(res).toEqual({
        type: 'Pant',
        colour: 'Rust',
        size: '32',
        qty: 5,
      })
    })

    it('drops filler words and piece/pieces', () => {
      const res = parseSentence('add 10 pieces of t-shirt in black colour size L with stock')
      expect(res).toEqual({
        type: 'T-Shirt',
        colour: 'Black',
        size: 'L',
        qty: 10,
      })
    })
  })
})
