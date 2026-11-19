import { NextResponse } from 'next/server'
import { RoutesRepository } from '@/lib/data/routes.repo'
import { requireAdmin } from '@/lib/server/admin-guard'

export async function GET() {
  try {
    const routes = await RoutesRepository.getRoutes()
    return NextResponse.json({ success: true, routes }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch routes'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const adminAuth = await requireAdmin(req)
  if (!adminAuth.success) {
    return adminAuth.response
  }

  try {
    const body = await req.json()
    if (!body.id || !body.source || !body.destination) {
      return NextResponse.json(
        { success: false, error: 'id, source, and destination are required' },
        { status: 400 }
      )
    }

    await RoutesRepository.saveRoute(body)
    return NextResponse.json({ success: true, route: body }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save route'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
