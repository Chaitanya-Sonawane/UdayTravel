export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { WalletsRepository } from '@/lib/data/wallets.repo'
import { AppError } from '@/lib/errors/app-error'

export async function POST(req: Request) {
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  let body: { grp?: string } = {}
  try {
    body = await req.json()
  } catch {
    // optional body
  }

  try {
    if (body.grp) {
      await WalletsRepository.releaseHold(auth.uid, body.grp)
    }
    return NextResponse.json({ success: true, message: 'Hold released' }, { status: 200 })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
