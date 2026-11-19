import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { SeatsRepository } from '@/lib/data/seats.repo'
import { releaseSeatInRtdb } from '@/lib/firebase/rtdb'
import { AppError } from '@/lib/errors/app-error'

export async function POST(req: Request) {
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await req.json()
    const { tripId, date, seatIds, grp } = body

    if (!tripId || !date || !Array.isArray(seatIds) || seatIds.length === 0 || !grp) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'tripId, date, seatIds, and grp are required' } },
        { status: 400 }
      )
    }

    await SeatsRepository.releaseHold(tripId, date, seatIds, auth.uid, grp)

    // Sync release to Realtime Database
    try {
      await Promise.all(
        seatIds.map((seatId: string) =>
          releaseSeatInRtdb({
            tripId,
            seatId,
            userId: auth.uid,
          })
        )
      )
    } catch (rtdbErr) {
      console.warn('[releaseHold] RTDB release sync warning:', rtdbErr)
    }

    return NextResponse.json({ success: true, released: seatIds }, { status: 200 })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
