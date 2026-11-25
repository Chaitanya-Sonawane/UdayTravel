export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { UsersRepository } from '@/lib/data/users.repo'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { error: { code: 'INVALID_ID', message: 'Passenger ID is required' } },
      { status: 400 }
    )
  }

  try {
    const updatedList = await UsersRepository.removeSavedPassenger(auth.uid, id)
    return NextResponse.json(
      {
        success: true,
        savedPassengers: updatedList,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error('[Passengers API] Error removing passenger:', err)
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: 'Failed to delete passenger' } },
      { status: 500 }
    )
  }
}
