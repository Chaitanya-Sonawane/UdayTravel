import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { SeatHoldRequestSchema } from '@/lib/schemas/booking.schema'
import { placeSeatHold } from '@/lib/domain/seats/hold'
import { AppError } from '@/lib/errors/app-error'

export async function POST(req: Request) {
  const auth = await requireUser(req)
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

  const parsed = SeatHoldRequestSchema.safeParse(body)
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

  try {
    const holdResult = await placeSeatHold({
      uid: auth.uid,
      routeId: parsed.data.routeId,
      date: parsed.data.date,
      tripId: parsed.data.tripId,
      seatIds: parsed.data.seatIds,
    })

    return NextResponse.json(holdResult, { status: 200 })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
