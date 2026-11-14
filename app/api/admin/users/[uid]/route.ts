import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { AccountUpdateSchema } from '@/lib/schema/account'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  const { uid } = await params
  if (!uid) {
    return NextResponse.json(
      { error: { code: 'MISSING_UID', message: 'Target user ID is required' } },
      { status: 400 }
    )
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
    firestoreMeter.recordWrite('users', uid)

    const updatePayload = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    }

    await db.collection('users').doc(uid).update(updatePayload)

    return NextResponse.json({ success: true, uid, updated: updatePayload }, { status: 200 })
  } catch (err: unknown) {
    console.error(`[Admin Users API] Error updating user ${uid}:`, err)
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: 'Failed to update user profile' } },
      { status: 500 }
    )
  }
}
