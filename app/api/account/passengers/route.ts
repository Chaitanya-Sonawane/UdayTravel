export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/server/guard'
import { UsersRepository } from '@/lib/data/users.repo'
import { GenderEnum } from '@/lib/schema/account'

const AddPassengerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  age: z.coerce.number().int().min(1).max(120),
  gender: GenderEnum,
  isSelf: z.boolean().optional(),
})

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const list = await UsersRepository.getSavedPassengers(auth.uid)
    return NextResponse.json({ savedPassengers: list }, { status: 200 })
  } catch (err: unknown) {
    console.error('[Passengers API] Error fetching saved passengers:', err)
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: 'Failed to retrieve saved passengers' } },
      { status: 500 }
    )
  }
}

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
      { error: { code: 'INVALID_JSON', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parsed = AddPassengerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      },
      { status: 400 }
    )
  }

  try {
    const updatedList = await UsersRepository.addSavedPassenger(auth.uid, parsed.data)
    return NextResponse.json(
      {
        success: true,
        savedPassengers: updatedList,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    console.error('[Passengers API] Error saving passenger:', err)
    return NextResponse.json(
      { error: { code: 'SAVE_FAILED', message: 'Failed to save passenger details' } },
      { status: 500 }
    )
  }
}
