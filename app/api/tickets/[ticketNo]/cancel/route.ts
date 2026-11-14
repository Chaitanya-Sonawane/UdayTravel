import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { cancelBooking } from '@/lib/payments/cancel'
import { AppError } from '@/lib/errors/app-error'

export async function POST(
  req: Request,
  props: { params: Promise<{ ticketNo: string }> }
) {
  const auth = await requireUser(req)
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

  let body: { reason?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Body is optional
  }

  const isAnonymous = auth.token.firebase?.sign_in_provider === 'anonymous'

  try {
    const result = await cancelBooking({
      ticketNo,
      callerUid: auth.uid,
      isAnonymous,
      reason: body.reason,
    })

    return NextResponse.json({
      success: true,
      ticket: result.ticket,
      refund: result.refund,
      refundDoc: result.refundDoc,
    })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
