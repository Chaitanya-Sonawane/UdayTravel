import { describe, it, expect } from 'vitest'
import { AccountCreateSchema, AccountUpdateSchema } from '../lib/schema/account'

describe('Account Schema Validation (lib/schema/account.ts)', () => {
  const validBase = {
    name: 'Anil Deshmukh',
    mobile: '9822012345',
    age: 32,
    gender: 'man',
  }

  describe('Mobile number validation', () => {
    it.each(['9822012345', '8123456789', '7000000000', '6999999999'])(
      'accepts valid 10-digit Indian mobile numbers: %s',
      (mobile) => {
        const result = AccountCreateSchema.safeParse({ ...validBase, mobile })
        expect(result.success).toBe(true)
      }
    )

    it.each([
      ['5822012345', 'starts with 5'],
      ['1822012345', 'starts with 1'],
      ['0822012345', 'starts with 0'],
      ['982201234', 'only 9 digits'],
      ['98220123456', '11 digits'],
      ['982201234a', 'contains alphabet'],
      ['+919822012345', 'contains country code prefix'],
      ['', 'empty string'],
    ])('rejects invalid mobile: %s (%s)', (mobile) => {
      const result = AccountCreateSchema.safeParse({ ...validBase, mobile })
      expect(result.success).toBe(false)
    })
  })

  describe('Age validation and coercion', () => {
    it.each([1, 18, 60, 120])('accepts age at boundaries: %d', (age) => {
      const result = AccountCreateSchema.safeParse({ ...validBase, age })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.age).toBe(age)
      }
    })

    it('coerces string age representation from HTML inputs', () => {
      const result = AccountCreateSchema.safeParse({ ...validBase, age: '45' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.age).toBe(45)
      }
    })

    it.each([
      [0, 'less than min 1'],
      [-5, 'negative number'],
      [121, 'greater than max 120'],
      [25.5, 'non-integer decimal'],
      [NaN, 'NaN value'],
      ['not-a-number', 'non-numeric string'],
    ])('rejects invalid age: %s (%s)', (age, _desc) => {
      const result = AccountCreateSchema.safeParse({ ...validBase, age })
      expect(result.success).toBe(false)
    })
  })

  describe('Name and Gender boundaries', () => {
    it('accepts name with exactly 2 characters', () => {
      const result = AccountCreateSchema.safeParse({ ...validBase, name: 'Om' })
      expect(result.success).toBe(true)
    })

    it('accepts name with exactly 60 characters', () => {
      const result = AccountCreateSchema.safeParse({ ...validBase, name: 'A'.repeat(60) })
      expect(result.success).toBe(true)
    })

    it('rejects name with 1 character', () => {
      const result = AccountCreateSchema.safeParse({ ...validBase, name: 'O' })
      expect(result.success).toBe(false)
    })

    it('rejects name exceeding 60 characters', () => {
      const result = AccountCreateSchema.safeParse({ ...validBase, name: 'A'.repeat(61) })
      expect(result.success).toBe(false)
    })

    it('accepts gender "man" and "woman"', () => {
      expect(AccountCreateSchema.safeParse({ ...validBase, gender: 'man' }).success).toBe(true)
      expect(AccountCreateSchema.safeParse({ ...validBase, gender: 'woman' }).success).toBe(true)
    })

    it('rejects invalid gender string', () => {
      expect(AccountCreateSchema.safeParse({ ...validBase, gender: 'other' }).success).toBe(false)
    })
  })

  describe('AccountUpdateSchema partial rules', () => {
    it('accepts updating single fields', () => {
      expect(AccountUpdateSchema.safeParse({ name: 'Sanjay' }).success).toBe(true)
      expect(AccountUpdateSchema.safeParse({ age: 40 }).success).toBe(true)
    })

    it('rejects empty object update', () => {
      expect(AccountUpdateSchema.safeParse({}).success).toBe(false)
    })
  })

  describe('SavedPassengerSchema validation', () => {
    it('accepts valid saved co-passengers with generated id', () => {
      const passenger = {
        id: 'sp_123',
        name: 'Sunita Deshmukh',
        age: 28,
        gender: 'woman',
        isSelf: false,
      }
      expect(AccountCreateSchema.safeParse({
        ...validBase,
        savedPassengers: [passenger],
      }).success).toBe(true)
    })

    it('rejects co-passenger with invalid age or missing name', () => {
      const invalidPassenger = {
        id: 'sp_123',
        name: '',
        age: -5,
        gender: 'woman',
      }
      expect(AccountCreateSchema.safeParse({
        ...validBase,
        savedPassengers: [invalidPassenger],
      }).success).toBe(false)
    })
  })
})
