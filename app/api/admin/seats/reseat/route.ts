import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/server/admin-guard'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { AppError } from '@/lib/errors/app-error'

const ReseatSchema = z.object({
  tripId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fromSeatId: z.string().regex(/^[A-J][1-5]$/),
  toSeatId: z.string().regex(/^[A-J][1-5]$/),
  reason: z.string().min(3, 'A valid reason is required for reseating'),
})

export async function POST(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await req.json()
    const parsed = ReseatSchema.parse(body)

    await SeatsRepository.adminReseat(
      parsed.tripId,
      parsed.date,
      parsed.fromSeatId,
      parsed.toSeatId,
      parsed.reason,
      'admin'
    )

    return NextResponse.json(
      {
        success: true,
        message: `Seat reseated from ${parsed.fromSeatId} to ${parsed.toSeatId}`,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
