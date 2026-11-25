export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { updateTrackingInRtdb, RtdbTrackingState } from '@/lib/firebase/rtdb'
import { requireAdmin } from '@/lib/server/admin-guard'

export async function POST(req: Request) {
  const adminAuth = await requireAdmin(req)
  if (!adminAuth.success) {
    return adminAuth.response
  }

  try {
    const body = await req.json()
    const { tripId, latitude, longitude, speed, heading, status, currentStop, nextStop } = body

    if (!tripId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: 'tripId, latitude, and longitude are required' },
        { status: 400 }
      )
    }

    const trackingState: RtdbTrackingState = {
      tripId,
      latitude,
      longitude,
      speed: Number(speed) || 0,
      heading: Number(heading) || 0,
      status: status || 'in_transit',
      currentStop,
      nextStop,
      timestamp: Date.now(),
      updatedAt: new Date().toISOString(),
    }

    await updateTrackingInRtdb(tripId, trackingState)
    return NextResponse.json({ success: true, tracking: trackingState }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update tracking'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
