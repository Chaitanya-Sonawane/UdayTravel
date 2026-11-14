import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/server/admin-guard'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { AppError } from '@/lib/errors/app-error'

const BlockSchema = z.object({
  tripId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seatId: z.string().regex(/^[A-J][1-5]$/),
  blocked: z.boolean(),
})

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await req.json()
    const parsed = BlockSchema.parse(body)

    await SeatsRepository.adminBlockSeat(
      parsed.tripId,
      parsed.date,
      parsed.seatId,
      parsed.blocked,
      'admin'
    )

    return NextResponse.json(
      {
        success: true,
        message: `Seat ${parsed.seatId} ${parsed.blocked ? 'blocked' : 'unblocked'}`,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
