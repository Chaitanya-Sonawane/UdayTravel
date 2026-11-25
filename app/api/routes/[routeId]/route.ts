export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { RoutesRepository } from '@/lib/data/routes.repo'
import { resolveRouteId, PickupPoint, DropPoint } from '@/lib/types/route'
import { requireAdmin } from '@/lib/server/admin-guard'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ routeId: string }> }
) {
  try {
    const { routeId } = await params
    const canonicalId = resolveRouteId(routeId) || routeId
    const { searchParams } = new URL(req.url)
    const clientVersion = searchParams.get('v') ? Number(searchParams.get('v')) : null

    const route = await RoutesRepository.getRouteById(canonicalId)
    if (!route) {
      return NextResponse.json(
        { success: false, error: `Route '${routeId}' not found` },
        { status: 404 }
      )
    }

    if (
      clientVersion !== null &&
      !isNaN(clientVersion) &&
      route.version &&
      clientVersion === route.version
    ) {
      return NextResponse.json(
        { success: true, notModified: true, version: route.version },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: true, route }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch route'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ routeId: string }> }
) {
  const adminAuth = await requireAdmin(req)
  if (!adminAuth.success) {
    return adminAuth.response
  }

  try {
    const { routeId } = await params
    const canonicalId = resolveRouteId(routeId) || routeId
    const existing = await RoutesRepository.getRouteById(canonicalId)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Route '${canonicalId}' not found` },
        { status: 404 }
      )
    }

    const body = await req.json()
    const { pickupPoints, dropPoints, active } = body

    if (!Array.isArray(pickupPoints) || !Array.isArray(dropPoints)) {
      return NextResponse.json(
        { success: false, error: 'pickupPoints and dropPoints must be arrays' },
        { status: 400 }
      )
    }

    // Validation: Unique names per list
    const pickupNames = new Set<string>()
    for (const p of pickupPoints as PickupPoint[]) {
      const name = p.name?.trim()
      if (!name) {
        return NextResponse.json(
          { success: false, error: 'Pickup point name is required' },
          { status: 400 }
        )
      }
      if (pickupNames.has(name.toLowerCase())) {
        return NextResponse.json(
          { success: false, error: `Duplicate pickup point name: "${name}"` },
          { status: 400 }
        )
      }
      pickupNames.add(name.toLowerCase())

      if (!p.pickupTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.pickupTime)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid pickupTime "${p.pickupTime}" for "${name}". Must be HH:mm (24h).`,
          },
          { status: 400 }
        )
      }
    }

    const dropNames = new Set<string>()
    for (const d of dropPoints as DropPoint[]) {
      const name = d.name?.trim()
      if (!name) {
        return NextResponse.json(
          { success: false, error: 'Drop point name is required' },
          { status: 400 }
        )
      }
      if (dropNames.has(name.toLowerCase())) {
        return NextResponse.json(
          { success: false, error: `Duplicate drop point name: "${name}"` },
          { status: 400 }
        )
      }
      dropNames.add(name.toLowerCase())
    }

    // Hard delete check: verify if any removed point is referenced in future bookings
    const newPickupIds = new Set(pickupPoints.map((p) => p.id).filter(Boolean))
    for (const oldP of existing.pickupPoints) {
      if (oldP.id && !newPickupIds.has(oldP.id)) {
        const hasBookings = await RoutesRepository.hasFutureBookingsForPoint(canonicalId, oldP.id)
        if (hasBookings) {
          return NextResponse.json(
            {
              success: false,
              error: `Pickup point "${oldP.name}" cannot be permanently deleted because active future bookings reference it. Please deactivate (soft delete) it instead.`,
            },
            { status: 409 }
          )
        }
      }
    }

    const newDropIds = new Set(dropPoints.map((d) => d.id).filter(Boolean))
    for (const oldD of existing.dropPoints) {
      if (oldD.id && !newDropIds.has(oldD.id)) {
        const hasBookings = await RoutesRepository.hasFutureBookingsForPoint(canonicalId, oldD.id)
        if (hasBookings) {
          return NextResponse.json(
            {
              success: false,
              error: `Drop point "${oldD.name}" cannot be permanently deleted because active future bookings reference it. Please deactivate (soft delete) it instead.`,
            },
            { status: 409 }
          )
        }
      }
    }

    // Single Firestore transaction write: version + 1, updatedAt
    const updated = await RoutesRepository.updateRoutePoints(
      canonicalId,
      pickupPoints,
      dropPoints
    )

    // If active flag was also updated
    if (typeof active === 'boolean' && active !== existing.active) {
      await RoutesRepository.saveRoute({ ...updated, active })
      updated.active = active
    }

    return NextResponse.json({ success: true, route: updated }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update route'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
