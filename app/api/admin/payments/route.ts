import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { PaymentsRepository } from '@/lib/data/payments.repo'
import { AppError } from '@/lib/errors/app-error'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const payments = await PaymentsRepository.listRecentPayments(50)
    return NextResponse.json({ payments }, { status: 200 })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
