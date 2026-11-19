import { NextResponse } from 'next/server'
import { BookingsRepository } from '@/lib/data/bookings.repo'
import { requireUser } from '@/lib/server/guard'
import { requireAdmin } from '@/lib/server/admin-guard'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const all = searchParams.get('all') === 'true'

    if (all) {
      const adminAuth = await requireAdmin(req)
      if (adminAuth.success) {
        const bookings = await BookingsRepository.getAllBookings()
        return NextResponse.json({ success: true, bookings }, { status: 200 })
      }
    }

    const auth = await requireUser(req)
    if (!auth.success) {
      return auth.response
    }

    const bookings = await BookingsRepository.getBookingsByUser(auth.uid)
    return NextResponse.json({ success: true, bookings }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch bookings'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
