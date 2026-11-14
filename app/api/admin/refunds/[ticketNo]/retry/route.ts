import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { issueRefund } from '@/lib/payments/refund'
import { AuditRepository } from '@/lib/data/audit.repo'
import { AppError } from '@/lib/errors/app-error'

export async function POST(
  req: Request,
  props: { params: Promise<{ ticketNo: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  const { ticketNo } = await props.params
  if (!ticketNo) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'ticketNo is required' } },
      { status: 400 }
    )
  }

  try {
    const result = await issueRefund(ticketNo)
    await AuditRepository.log(
      'ADMIN_REFUND_RETRY',
      'admin',
      { ticketNo, result },
      ticketNo
    )

    return NextResponse.json({ success: true, result }, { status: 200 })
  } catch (err: unknown) {
    await AuditRepository.log(
      'ADMIN_REFUND_RETRY_FAILED',
      'admin',
      { ticketNo, error: String(err) },
      ticketNo
    )
    return AppError.fromUnknown(err).toResponse()
  }
}
