import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { RefundsRepository } from '@/lib/data/refunds.repo'
import { AppError } from '@/lib/errors/app-error'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const refunds = await RefundsRepository.listRefunds(50)
    return NextResponse.json({ refunds }, { status: 200 })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
