import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { AppError } from '@/lib/errors/app-error'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ticketNo = searchParams.get('ticketNo')

  // If specific ticket search requested
  if (ticketNo) {
    const cleanTicket = ticketNo.trim().toUpperCase()
    const ticket = await TicketsRepository.getTicket(cleanTicket)
    if (!ticket) {
      return NextResponse.json({ tickets: [] }, { status: 200 })
    }
    return NextResponse.json({ tickets: [ticket] }, { status: 200 })
  }

  // Otherwise, require authenticated user to list their bookings
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const tickets = await TicketsRepository.listUserTickets(auth.uid)
    return NextResponse.json({ tickets }, { status: 200 })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
