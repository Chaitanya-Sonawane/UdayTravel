import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cancelBooking } from '@/lib/payments/cancel'
import { AppError } from '@/lib/errors/app-error'

const OverrideCancelSchema = z.object({
  ticketNo: z.string().min(1, 'Ticket number is required'),
  reason: z.string().default('Administrative cancellation override from dashboard'),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parseResult = OverrideCancelSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.issues.map((i) => i.message).join(', ') } },
      { status: 400 }
    )
  }

  const { ticketNo, reason } = parseResult.data

  try {
    // Note: callerUid is 'admin', which bypasses cutoff restrictions in cancelBooking
    const result = await cancelBooking({
      ticketNo,
      callerUid: 'admin',
      isAnonymous: false,
      reason,
    })

    return NextResponse.json({
      success: true,
      ticketNo: result.ticket.ticketNo,
      status: result.ticket.status,
      refund: result.refund,
      message: `Ticket ${ticketNo} successfully cancelled with Admin Override. Seats released back to inventory.`,
    })
  } catch (err: unknown) {
    console.error('[Admin Override Cancel API] Error:', err)
    return AppError.fromUnknown(err).toResponse()
  }
}
