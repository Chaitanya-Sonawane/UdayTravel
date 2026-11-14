import { NextResponse } from 'next/server'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { AppError, ErrorCodes } from '@/lib/errors/app-error'

export async function GET(
  req: Request,
  props: { params: Promise<{ ticketNo: string }> }
) {
  const { ticketNo } = await props.params
  if (!ticketNo) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'ticketNo is required' } },
      { status: 400 }
    )
  }

  try {
    const ticket = await TicketsRepository.getTicket(ticketNo)
    if (!ticket) {
      throw new AppError(ErrorCodes.NOT_FOUND, `Ticket ${ticketNo} not found`)
    }

    return NextResponse.json(ticket, { status: 200 })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
