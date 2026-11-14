import { NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'

export interface AdminGuardErrorPayload {
  error: {
    code: string
    message: string
  }
}

export type AdminAuthResult =
  | { success: true }
  | { success: false; response: NextResponse<AdminGuardErrorPayload> }

export function getExpectedAdminToken(): string {
  const secret = process.env.ADMIN_SECRET_KEY || 'uday_admin_secret_2026'
  return createHmac('sha256', secret).update('uday-admin-session-v1').digest('hex')
}

export function isValidAdminSecret(providedSecret: string): boolean {
  const actualSecret = process.env.ADMIN_SECRET_KEY || 'uday_admin_secret_2026'
  return providedSecret.trim() === actualSecret.trim()
}

/**
 * Validates whether the incoming request contains a valid admin session cookie or Authorization header.
 */
export async function requireAdmin(req: Request): Promise<AdminAuthResult> {
  const expectedToken = getExpectedAdminToken()
  const rawAdminKey = process.env.ADMIN_SECRET_KEY || 'uday_admin_secret_2026'

  // 1. Check Authorization header: Bearer <token or key>
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    if (token === expectedToken || token === rawAdminKey) {
      return { success: true }
    }
  }

  // 2. Check Cookie header: uday_admin_token
  const cookieHeader = req.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => Boolean(k))
  )

  const cookieToken = cookies['uday_admin_token']
  if (cookieToken && (cookieToken === expectedToken || cookieToken === rawAdminKey)) {
    return { success: true }
  }

  return {
    success: false,
    response: NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED_ADMIN',
          message: 'Admin authorization required to access this resource.',
        },
      },
      { status: 401 }
    ),
  }
}
