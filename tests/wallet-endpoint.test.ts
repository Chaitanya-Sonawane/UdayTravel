import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getWalletHandler } from '@/app/api/wallet/route'
import { WalletsRepository } from '@/lib/data/wallets.repo'
import { getAdminDb } from '@/lib/firebase/admin'

vi.mock('@/lib/server/guard', () => ({
  requireUser: vi.fn(async () => ({
    success: true,
    uid: 'test_traveler_profile_wallet_user',
    token: { uid: 'test_traveler_profile_wallet_user' },
  })),
}))

describe('GET /api/wallet - Profile In-Wallet Remaining Balance API', () => {
  it('returns wallet remaining available balance and total balance for authenticated traveler', async () => {
    const uid = 'test_traveler_profile_wallet_user'
    
    // Check initial zero state
    const req = new NextRequest('http://localhost:3000/api/wallet')
    const res = await getWalletHandler(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.uid).toBe(uid)
    expect(data.balancePaise).toBe(0)
    expect(data.availablePaise).toBe(0)
    expect(data.balanceDisplay).toBe('₹0')
    expect(data.availableDisplay).toBe('₹0')
    expect(data.activeHolds).toEqual({})

    // Credit wallet and verify updated remaining balance
    const db = getAdminDb()
    await db.runTransaction(async (t) => {
      const doc = await WalletsRepository.getWalletDocInTx(t, uid)
      WalletsRepository.creditInTx(
        t,
        uid,
        75000,
        'REFUND',
        'UT-TEST-CANCEL-99',
        'Cancellation refund credit',
        doc
      )
    })

    const req2 = new NextRequest('http://localhost:3000/api/wallet')
    const res2 = await getWalletHandler(req2)
    expect(res2.status).toBe(200)

    const data2 = await res2.json()
    expect(data2.balancePaise).toBe(75000)
    expect(data2.availablePaise).toBe(75000)
    expect(data2.balanceDisplay).toBe('₹750')
    expect(data2.availableDisplay).toBe('₹750')
  })
})
