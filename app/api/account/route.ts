export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { AccountCreateSchema, AccountUpdateSchema, SavedPassenger } from '@/lib/schema/account'
import { UsersRepository } from '@/lib/data/users.repo'

export async function GET(req: Request) {
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const user = await UsersRepository.getUser(auth.uid)
    if (!user) {
      return NextResponse.json(
        { exists: false, profile: null, savedPassengers: [] },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        exists: true,
        profile: user,
        savedPassengers: user.savedPassengers || [],
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error('[Account API] Error fetching user profile:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user profile' } },
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

  const parsed = AccountCreateSchema.safeParse(body)
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

  const { name, mobile, age, gender, email, savedPassengers } = parsed.data
  const now = new Date().toISOString()
  const initialPassenger: SavedPassenger = {
    id: `sp_self_${auth.uid}`,
    name,
    age,
    gender,
    isSelf: true,
  }
  const finalSavedPassengers = savedPassengers && savedPassengers.length > 0 ? savedPassengers : [initialPassenger]
  const profileData = {
    name,
    mobile,
    age,
    gender,
    email: email || '',
    savedPassengers: finalSavedPassengers,
    createdAt: now,
    updatedAt: now,
  }

  try {
    const db = getAdminDb()
    firestoreMeter.recordWrite('users', auth.uid)

    // Admin create() strictly fails if document already exists without performing any prior read
    await db.collection('users').doc(auth.uid).create(profileData)

    return NextResponse.json(
      {
        created: true,
        profile: {
          uid: auth.uid,
          ...profileData,
        },
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    const errorObj = err as { code?: number | string; message?: string }
    const isAlreadyExists =
      errorObj.code === 6 ||
      errorObj.code === 'already-exists' ||
      (typeof errorObj.message === 'string' && errorObj.message.includes('ALREADY_EXISTS'))

    if (isAlreadyExists) {
      // Free-tier guarantee: return existing profile data with 200 status
      return NextResponse.json(
        {
          created: false,
          profile: {
            uid: auth.uid,
            ...profileData,
          },
        },
        { status: 200 }
      )
    }

    console.error('[Account API] Unexpected error creating user:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create account profile',
        },
      },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
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

  const parsed = AccountUpdateSchema.safeParse(body)
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
    const db = getAdminDb()
    firestoreMeter.recordWrite('users', auth.uid)

    const updateData = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    }

    await db.collection('users').doc(auth.uid).update(updateData)

    return NextResponse.json({ updated: true }, { status: 200 })
  } catch (err: unknown) {
    console.error('[Account API] Unexpected error updating user:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user profile',
        },
      },
      { status: 500 }
    )
  }
}
