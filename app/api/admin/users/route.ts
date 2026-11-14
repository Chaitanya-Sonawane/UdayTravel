import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin-guard'
import { getAdminDb } from '@/lib/firebase/admin'
import { firestoreMeter } from '@/lib/firebase/meter'
import { UserProfile } from '@/lib/schema/account'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  if (!auth.success) {
    return auth.response
  }

  try {
    const db = getAdminDb()
    firestoreMeter.recordRead('users', '*')
    const snapshot = await db.collection('users').get()

    const users: UserProfile[] = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        uid: doc.id,
        name: data['name'] ?? '',
        mobile: data['mobile'] ?? '',
        age: Number(data['age'] ?? 0),
        gender: data['gender'] ?? 'man',
        createdAt: data['createdAt'] ?? '',
        updatedAt: data['updatedAt'] ?? '',
      }
    })

    // Sort by createdAt descending (newest first)
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ users }, { status: 200 })
  } catch (err: unknown) {
    console.error('[Admin Users API] Error fetching users:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve users' } },
      { status: 500 }
    )
  }
}
