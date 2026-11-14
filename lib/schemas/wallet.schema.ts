import { z } from 'zod'

export const WalletHoldItemSchema = z.object({
  grp: z.string(),
  amountPaise: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
})

export type WalletHoldItem = z.infer<typeof WalletHoldItemSchema>

export const WalletDocSchema = z.object({
  uid: z.string(),
  balancePaise: z.number().int().nonnegative(),
  activeHolds: z.record(z.string(), WalletHoldItemSchema).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.number().int().default(1),
})

export type WalletDoc = z.infer<typeof WalletDocSchema>

export const LedgerEntryTypeSchema = z.enum([
  'HOLD',
  'SPEND',
  'HOLD_RELEASE',
  'REFUND',
  'ADMIN_CREDIT',
  'ADMIN_DEBIT',
])

export type LedgerEntryType = z.infer<typeof LedgerEntryTypeSchema>

export const LedgerEntrySchema = z.object({
  entryId: z.string(),
  uid: z.string(),
  type: LedgerEntryTypeSchema,
  amountPaise: z.number().int(),
  balanceBeforePaise: z.number().int().nonnegative(),
  balanceAfterPaise: z.number().int().nonnegative(),
  referenceId: z.string(),
  description: z.string(),
  createdAt: z.string(),
  schemaVersion: z.number().int().default(1),
})

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>

export const AdminWalletAdjustSchema = z.object({
  uid: z.string().min(1, 'User UID is required'),
  amountPaise: z.number().int().positive('Amount must be a positive integer in paise'),
  type: z.enum(['CREDIT', 'DEBIT']),
  reason: z.string().min(3, 'Adjustment reason is required'),
})

export type AdminWalletAdjust = z.infer<typeof AdminWalletAdjustSchema>

export const AdminWalletMigrateSchema = z.object({
  sourceUid: z.string().min(1, 'Source UID is required'),
  targetUid: z.string().min(1, 'Target UID is required'),
  reason: z.string().min(3).optional(),
})

export type AdminWalletMigrate = z.infer<typeof AdminWalletMigrateSchema>
