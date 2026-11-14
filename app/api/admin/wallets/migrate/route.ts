import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { WalletsRepository } from '@/lib/data/wallets.repo'
import { AdminWalletMigrateSchema } from '@/lib/schemas/wallet.schema'
import { AuditRepository } from '@/lib/data/audit.repo'
import { getAdminDb } from '@/lib/firebase/admin'
import { AppError } from '@/lib/errors/app-error'

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parsed = AdminWalletMigrateSchema.safeParse(body)
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

  const { sourceUid, targetUid, reason = 'Account linking wallet migration' } = parsed.data
  const db = getAdminDb()

  try {
    let transferredPaise = 0

    await db.runTransaction(async (t) => {
      const sourceDoc = await WalletsRepository.getWalletDocInTx(t, sourceUid)
      if (sourceDoc.balancePaise <= 0) {
        return // Nothing to migrate
      }

      transferredPaise = sourceDoc.balancePaise
      const targetDoc = await WalletsRepository.getWalletDocInTx(t, targetUid)

      // Debit source
      WalletsRepository.debitInTx(
        t,
        sourceUid,
        transferredPaise,
        'ADMIN_DEBIT',
        `migrate_to_${targetUid}`,
        `Migrated to user ${targetUid}`,
        sourceDoc
      )

      // Credit target
      WalletsRepository.creditInTx(
        t,
        targetUid,
        transferredPaise,
        'ADMIN_CREDIT',
        `migrate_from_${sourceUid}`,
        `Migrated from user ${sourceUid}`,
        targetDoc
      )
    })

    await AuditRepository.log(
      'ADMIN_WALLET_MIGRATE',
      'admin',
      { sourceUid, targetUid, transferredPaise, reason },
      targetUid
    )

    return NextResponse.json({
      success: true,
      transferredPaise,
      sourceUid,
      targetUid,
    })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
