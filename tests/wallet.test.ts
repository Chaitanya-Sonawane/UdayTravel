import { describe, it, expect } from 'vitest'
import { WalletsRepository } from '../lib/data/wallets.repo'
import { getAdminDb } from '../lib/firebase/admin'
import { AppError, ErrorCodes } from '../lib/errors/app-error'

describe('Store Credit Wallet & Ledger Architecture', () => {
  const uid = 'test_traveler_wallet_001'

  it('returns zero balance for a new user with empty ledger', async () => {
    const wallet = await WalletsRepository.getWallet(uid)
    expect(wallet.balancePaise).toBe(0)
    expect(wallet.availablePaise).toBe(0)
    expect(wallet.activeHolds).toEqual({})
  })

  it('credits wallet and appends an immutable ledger entry', async () => {
    const db = getAdminDb()
    await db.runTransaction(async (t) => {
      const doc = await WalletsRepository.getWalletDocInTx(t, uid)
      WalletsRepository.creditInTx(
        t,
        uid,
        50000, // ₹500
        'ADMIN_CREDIT',
        'ref_promo_01',
        'Welcome promotional credit',
        doc
      )
    })

    const wallet = await WalletsRepository.getWallet(uid)
    expect(wallet.balancePaise).toBe(50000)
    expect(wallet.availablePaise).toBe(50000)
  })

  it('places a temporary hold and reduces available balance while preserving total balance', async () => {
    const db = getAdminDb()
    const grp = 'hold_test_grp_1'
    const holdAmount = 20000
    const expiresAt = Date.now() + 300000

    await db.runTransaction(async (t) => {
      const doc = await WalletsRepository.getWalletDocInTx(t, uid)
      WalletsRepository.placeHoldInTx(t, uid, grp, holdAmount, expiresAt, doc)
    })

    const wallet = await WalletsRepository.getWallet(uid)
    expect(wallet.balancePaise).toBe(50000)
    expect(wallet.availablePaise).toBe(30000) // 50000 - 20000
    expect(wallet.activeHolds[grp]?.amountPaise).toBe(20000)
  })

  it('finalizes debit on confirmed booking, releasing the hold and writing a SPEND ledger entry', async () => {
    const db = getAdminDb()
    const grp = 'hold_test_grp_1'
    const debitAmount = 20000

    await db.runTransaction(async (t) => {
      const doc = await WalletsRepository.getWalletDocInTx(t, uid)
      WalletsRepository.finalizeDebitInTx(t, uid, grp, debitAmount, 'UT999000', doc)
    })

    const wallet = await WalletsRepository.getWallet(uid)
    expect(wallet.balancePaise).toBe(30000)
    expect(wallet.availablePaise).toBe(30000)
    expect(wallet.activeHolds[grp]).toBeUndefined()
  })

  it('rejects debit when requested amount exceeds available balance', async () => {
    const db = getAdminDb()
    await expect(
      db.runTransaction(async (t) => {
        const doc = await WalletsRepository.getWalletDocInTx(t, uid)
        WalletsRepository.debitInTx(
          t,
          uid,
          100000, // 100000 > 30000
          'ADMIN_DEBIT',
          'ref_excess',
          'Excess debit attempt',
          doc
        )
      })
    ).rejects.toThrow(AppError)
  })
})
