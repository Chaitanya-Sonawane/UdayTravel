export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { UsersRepository } from '@/lib/data/users.repo'
import { WalletsRepository } from '@/lib/data/wallets.repo'
import { verifyPassword, createLocalSessionToken } from '@/lib/auth/password'

const LoginSchema = z.object({
  identifier: z.string().trim().min(1, 'Mobile number or email is required'),
  password: z.string().min(1, 'Password is required'),
})

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

  const parseResult = LoginSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.issues.map((i) => i.message).join(', '),
        },
      },
      { status: 400 }
    )
  }

  const { identifier, password } = parseResult.data

  try {
    // 1. Look up user by mobile or email
    const user = await UsersRepository.findUserByMobileOrEmail(identifier)
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'auth/user-not-found',
            message: `No passenger profile found for ${identifier}. Please create a new account to book tickets.`,
          },
        },
        { status: 404 }
      )
    }

    // 2. Verify password
    const isPasswordValid = verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: {
            code: 'auth/wrong-password',
            message: 'The mobile number or password entered does not match our passenger records.',
          },
        },
        { status: 401 }
      )
    }

    // 3. Ensure wallet exists
    try {
      await WalletsRepository.getWallet(user.uid)
    } catch (wErr) {
      console.warn('[Login API] Non-fatal wallet initialization warning:', wErr)
    }

    // 4. Generate local session token
    const token = createLocalSessionToken(user.uid, { email: user.email, mobile: user.mobile })

    return NextResponse.json({
      success: true,
      token,
      user: {
        uid: user.uid,
        email: user.email || `${user.mobile}@udaytravel.in`,
        phoneNumber: `+91${user.mobile}`,
        displayName: user.name,
        isAnonymous: false,
      },
      profile: user,
      message: 'Logged in successfully',
    })
  } catch (err: any) {
    console.error('[Login API] Error:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to authenticate user',
        },
      },
      { status: 500 }
    )
  }
}
