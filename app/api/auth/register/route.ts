export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { UsersRepository } from '@/lib/data/users.repo'
import { WalletsRepository } from '@/lib/data/wallets.repo'
import { hashPassword, createLocalSessionToken } from '@/lib/auth/password'
import { GenderEnum } from '@/lib/schema/account'

const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  age: z.coerce.number().int().min(1).max(120),
  gender: GenderEnum,
  email: z.string().trim().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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

  const parseResult = RegisterSchema.safeParse(body)
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

  const { name, mobile, age, gender, email, password } = parseResult.data

  try {
    // 1. Check if user already exists
    const existing = await UsersRepository.findUserByMobileOrEmail(mobile)
    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: 'auth/email-already-in-use',
            message: `An account for +91 ${mobile} already exists with Uday Travels. Please log in instead.`,
          },
        },
        { status: 409 }
      )
    }

    // 2. Generate a clean UID and hash password
    const uid = `u_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const pwdHash = hashPassword(password)
    const emailToUse = email || `${mobile}@udaytravel.in`

    // 3. Create user in database
    const createdProfile = await UsersRepository.createUser(uid, {
      name,
      mobile,
      age,
      gender,
      email: emailToUse,
      passwordHash: pwdHash,
    } as any)

    // 4. Ensure wallet exists
    try {
      await WalletsRepository.getWallet(uid)
    } catch (wErr) {
      console.warn('[Register API] Non-fatal wallet initialization warning:', wErr)
    }

    // 5. Generate secure session token
    const token = createLocalSessionToken(uid, { email: emailToUse, mobile })

    return NextResponse.json({
      success: true,
      token,
      user: {
        uid,
        email: emailToUse,
        phoneNumber: `+91${mobile}`,
        displayName: name,
        isAnonymous: false,
      },
      profile: createdProfile,
      message: 'Account created successfully',
    })
  } catch (err: any) {
    console.error('[Register API] Error:', err)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Failed to complete registration',
        },
      },
      { status: 500 }
    )
  }
}
