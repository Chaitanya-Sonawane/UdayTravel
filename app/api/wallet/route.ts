export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { WalletsRepository } from '@/lib/data/wallets.repo'
import { paiseToRupeesDisplay } from '@/lib/money'
import { AppError } from '@/lib/errors/app-error'

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const wallet = await WalletsRepository.getWallet(auth.uid)
    return NextResponse.json({
      uid: auth.uid,
      balancePaise: wallet.balancePaise,
      availablePaise: wallet.availablePaise,
      balanceDisplay: paiseToRupeesDisplay(wallet.balancePaise),
      availableDisplay: paiseToRupeesDisplay(wallet.availablePaise),
      activeHolds: wallet.activeHolds,
    })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
