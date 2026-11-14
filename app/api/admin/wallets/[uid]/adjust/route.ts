import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { WalletsRepository } from '@/lib/data/wallets.repo'
import { AdminWalletAdjustSchema } from '@/lib/schemas/wallet.schema'
import { AuditRepository } from '@/lib/data/audit.repo'
import { getAdminDb } from '@/lib/firebase/admin'
import { AppError } from '@/lib/errors/app-error'

export async function POST(
  req: Request,
  props: { params: Promise<{ uid: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  const { uid } = await props.params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parsed = AdminWalletAdjustSchema.safeParse({ ...(body as object), uid })
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      },
      { status: 400 }
    )
  }

  const { amountPaise, type, reason } = parsed.data
  const db = getAdminDb()

  try {
    await db.runTransaction(async (t) => {
      const currentDoc = await WalletsRepository.getWalletDocInTx(t, uid)
      if (type === 'CREDIT') {
        WalletsRepository.creditInTx(
          t,
          uid,
          amountPaise,
          'ADMIN_CREDIT',
          `admin_adj_${Date.now()}`,
          reason,
          currentDoc
        )
      } else {
        WalletsRepository.debitInTx(
          t,
          uid,
          amountPaise,
          'ADMIN_DEBIT',
          `admin_adj_${Date.now()}`,
          reason,
          currentDoc
        )
      }
    })

    await AuditRepository.log(
      'ADMIN_WALLET_ADJUST',
      'admin',
      { uid, amountPaise, type, reason },
      uid
    )

    const updatedWallet = await WalletsRepository.getWallet(uid)
    return NextResponse.json(
      {
        success: true,
        wallet: updatedWallet,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
