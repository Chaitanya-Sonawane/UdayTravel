import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { WalletsRepository } from '@/lib/data/wallets.repo'
import { getAdminDb } from '@/lib/firebase/admin'
import { LedgerEntry } from '@/lib/schemas/wallet.schema'
import { AppError } from '@/lib/errors/app-error'

export async function GET(
  req: Request,
  props: { params: Promise<{ uid: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  const { uid } = await props.params
  if (!uid) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'uid is required' } },
      { status: 400 }
    )
  }

  try {
    const wallet = await WalletsRepository.getWallet(uid)
    const db = getAdminDb()
    const ledgerSnap = await db
      .collection('wallets')
      .doc(uid)
      .collection('ledger')
      .get()

    const ledger: LedgerEntry[] = []
    ledgerSnap.forEach((doc) => {
      ledger.push(doc.data() as LedgerEntry)
    })

    ledger.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json(
      {
        uid,
        balancePaise: wallet.balancePaise,
        availablePaise: wallet.availablePaise,
        activeHolds: wallet.activeHolds,
        ledger,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
