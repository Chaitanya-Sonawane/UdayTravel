import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { SeatsRepository } from '@/lib/data/seats.repo'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  const { searchParams } = new URL(req.url)
  const tripId = searchParams.get('tripId')
  const date = searchParams.get('date')

  if (!tripId || !date) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'tripId and date are required' } },
      { status: 400 }
    )
  }

  const busDoc = await SeatsRepository.getBusSeats(tripId, date)
  return NextResponse.json(
    {
      tripId,
      date,
      departureAt: busDoc.departureAt,
      seats: busDoc.seats,
    },
    { status: 200 }
  )
}
