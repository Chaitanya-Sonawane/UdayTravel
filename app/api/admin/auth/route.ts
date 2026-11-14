import { NextResponse } from 'next/server'
import { getExpectedAdminToken, isValidAdminSecret, requireAdmin } from '@/lib/server/admin-guard'

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const { secretKey } = (body as { secretKey?: string }) || {}

  if (!secretKey || typeof secretKey !== 'string') {
    return NextResponse.json(
      { error: { code: 'MISSING_SECRET', message: 'Admin secret key is required' } },
      { status: 400 }
    )
  }

  if (!isValidAdminSecret(secretKey)) {
    return NextResponse.json(
      { error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect admin secret key' } },
      { status: 401 }
    )
  }

  const token = getExpectedAdminToken()
  const isProd = process.env.NODE_ENV === 'production'

  const res = NextResponse.json({ success: true, message: 'Admin authenticated' }, { status: 200 })
  res.cookies.set('uday_admin_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return res
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req)
  return NextResponse.json({ authenticated: auth.success }, { status: 200 })
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Logged out' }, { status: 200 })
  res.cookies.set('uday_admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
