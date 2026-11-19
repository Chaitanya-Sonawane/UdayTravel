import { NextResponse } from 'next/server'
import { TicketsRepository } from '@/lib/data/tickets.repo'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  try {
    const tickets = await TicketsRepository.searchTickets(q)
    return NextResponse.json({
      success: true,
      count: tickets.length,
      tickets,
    })
  } catch (err: any) {
    console.error('[Admin Tickets Search API] Error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to search tickets' } },
      { status: 500 }
    )
  }
}
