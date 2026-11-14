import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { runReconciliation } from '@/lib/payments/reconcile'
import { AuditRepository } from '@/lib/data/audit.repo'
import { AppError } from '@/lib/errors/app-error'

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  let maxBatch = 50
  try {
    const body = (await req.json()) as { maxBatch?: number }
    if (body.maxBatch && body.maxBatch > 0) {
      maxBatch = Math.min(100, body.maxBatch)
    }
  } catch {
    // Body is optional
  }

  try {
    const result = await runReconciliation(maxBatch)
    await AuditRepository.log(
      'ADMIN_RECONCILIATION_RUN',
      'admin',
      { ...result }
    )

    return NextResponse.json({ success: true, result }, { status: 200 })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
