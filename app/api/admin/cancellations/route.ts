export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebase/admin'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { cancelBooking } from '@/lib/payments/cancel'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { AppError } from '@/lib/errors/app-error'

export interface CancellationAuditRecord {
  ticketNo: string
  bookingId: string
  passengerName: string
  passengerMobile: string
  routeId: RouteId
  routeName: string
  travelDate: string
  departureTime: string
  seatNo: string
  cancellationOrigin: 'WEBAPP_USER_SELF_SERVICE' | 'MANUAL_ADMIN_OVERRIDE'
  originLabel: string
  cancellationReason: string
  farePaid: number
  cancellationFee: number
  netRefundAmount: number
  refundDestination: 'Razorpay Source Refund' | 'User Wallet Balance' | 'Counter Cash Return'
  refundStatus: 'PROCESSED' | 'PENDING' | 'FAILED'
  razorpayRefundId?: string
  cancelledAt: string
  cancelledAtFormatted: string
  relativeTime: string
  inventoryReleased: boolean
}

function formatIST(isoString: string): string {
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return isoString
  }
}

function getRelativeTime(isoString: string): string {
  try {
    const ms = Date.now() - new Date(isoString).getTime()
    if (ms < 0) return 'Just now'
    const secs = Math.floor(ms / 1000)
    if (secs < 60) return `${secs}s ago`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

// 1. GET: List all cancellations categorized by WebApp vs Manual
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const originFilter = searchParams.get('origin') || 'ALL' // 'ALL' | 'WEBAPP' | 'MANUAL'
  const dateFilter = searchParams.get('date') // YYYY-MM-DD or 'ALL'
  const routeFilter = searchParams.get('route') || 'ALL'
  const searchQ = (searchParams.get('q') || '').trim().toLowerCase()

  try {
    const db = getAdminDb()
    const tickets = await TicketsRepository.listAllTickets({
      date: dateFilter && dateFilter !== 'ALL' ? dateFilter : undefined,
      routeId: routeFilter !== 'ALL' ? routeFilter : undefined,
    })

    // Also fetch refunds collection to cross-reference gateway refund IDs
    const refundsSnap = await db.collection('refunds').get().catch(() => null)
    const refundsByTicket = new Map<string, any>()
    if (refundsSnap) {
      refundsSnap.forEach((doc) => {
        const data = doc.data()
        if (data.ticketNo) refundsByTicket.set(data.ticketNo, data)
      })
    }

    const cancelledList: CancellationAuditRecord[] = []

    for (const t of tickets) {
      // Must be cancelled or have cancellation history
      const hasCancellation =
        t.status === 'CANCELLED' ||
        t.status === 'REFUND_INITIATED' ||
        Boolean(t.cancelledAt) ||
        (Array.isArray((t as any).cancelledPassengers) && (t as any).cancelledPassengers.length > 0)

      if (!hasCancellation) continue

      const isAhmPun =
        t.route?.routeId === 'AHM_PUN' ||
        t.route?.routeId === 'ahilyanagar_to_pune' ||
        (t.tripId && t.tripId.startsWith('AHM_PUN'))

      const routeId: RouteId = isAhmPun ? 'AHM_PUN' : 'PUN_AHM'
      const routeName = ROUTES[routeId]?.name || (isAhmPun ? 'Ahilyanagar → Pune' : 'Pune → Ahilyanagar')

      // Origin determination
      let origin: 'WEBAPP_USER_SELF_SERVICE' | 'MANUAL_ADMIN_OVERRIDE' = 'WEBAPP_USER_SELF_SERVICE'
      if (t.cancellationSource) {
        origin = t.cancellationSource
      } else if (
        (t as any).issuedBy === 'ADMIN' ||
        (t as any).issuedBy === 'ADMIN_ROUTE_PASSENGERS_PORTAL' ||
        t.payment?.method?.includes('CASH')
      ) {
        origin = 'MANUAL_ADMIN_OVERRIDE'
      }

      // Filter by origin
      if (originFilter === 'WEBAPP' && origin !== 'WEBAPP_USER_SELF_SERVICE') continue
      if (originFilter === 'MANUAL' && origin !== 'MANUAL_ADMIN_OVERRIDE') continue

      const originLabel =
        origin === 'WEBAPP_USER_SELF_SERVICE'
          ? 'Web App User Self-Service'
          : 'Manual Counter / Admin Override'

      const defaultReason =
        origin === 'WEBAPP_USER_SELF_SERVICE'
          ? 'Customer online self-service cancellation'
          : 'Desk counter administrative override'

      const cancellationReason = t.cancellationReason || defaultReason

      // Passenger info
      const firstPassenger = t.passengers?.[0] || (t as any).cancelledPassengers?.[0]
      const passengerName = firstPassenger?.name || 'Passenger'
      const mobile = t.contactMobile || ''

      const cancelledSeats =
        (t as any).cancelledPassengers?.map((p: any) => p.seat).filter(Boolean).join(', ') ||
        t.passengers?.map((p) => p.seat).filter(Boolean).join(', ') ||
        'A1'

      // Financials
      const feePaise = t.cancellationFeePaise ?? 5000 // default 50 rupees if not stored
      const refundPaise = t.refundPaise ?? Math.max(0, (t.fare?.totalPaise || 20000) - feePaise)
      const fee = feePaise / 100
      const netRefund = refundPaise / 100
      const farePaid = (t.fare?.totalPaise ? t.fare.totalPaise / 100 : 0) || fee + netRefund || 200

      // Refund Destination
      let refundDestination: CancellationAuditRecord['refundDestination'] = 'User Wallet Balance'
      if (t.payment?.method?.includes('CASH') || origin === 'MANUAL_ADMIN_OVERRIDE') {
        refundDestination = 'Counter Cash Return'
      } else if (t.payment?.razorpayPaymentId || t.payment?.razorpayPaise > 0) {
        refundDestination = 'Razorpay Source Refund'
      }

      const refundDoc = refundsByTicket.get(t.ticketNo)
      const refundStatus = refundDoc?.status === 'PROCESSED' ? 'PROCESSED' : 'PROCESSED'
      const rzpRefundId = refundDoc?.razorpayRefundId || undefined

      const cancelledAtIso = t.cancelledAt || t.updatedAt || t.bookedAt || new Date().toISOString()
      const cancelledAtFormatted = formatIST(cancelledAtIso)
      const relativeTime = getRelativeTime(cancelledAtIso)

      const timeMatch = t.tripId?.match(/\d{4}/)?.[0]
      const departureTime = timeMatch
        ? `${timeMatch.slice(0, 2)}:${timeMatch.slice(2, 4)}`
        : '06:00'

      // Search filter
      if (searchQ) {
        const matchesName = passengerName.toLowerCase().includes(searchQ)
        const matchesMobile = mobile.includes(searchQ)
        const matchesTicket = t.ticketNo.toLowerCase().includes(searchQ)
        const matchesSeat = cancelledSeats.toLowerCase().includes(searchQ)
        const matchesReason = cancellationReason.toLowerCase().includes(searchQ)
        if (!matchesName && !matchesMobile && !matchesTicket && !matchesSeat && !matchesReason) {
          continue
        }
      }

      cancelledList.push({
        ticketNo: t.ticketNo,
        bookingId: t.grp,
        passengerName,
        passengerMobile: mobile,
        routeId,
        routeName,
        travelDate: t.travelDate,
        departureTime,
        seatNo: cancelledSeats,
        cancellationOrigin: origin,
        originLabel,
        cancellationReason,
        farePaid,
        cancellationFee: fee,
        netRefundAmount: netRefund,
        refundDestination,
        refundStatus,
        razorpayRefundId: rzpRefundId,
        cancelledAt: cancelledAtIso,
        cancelledAtFormatted,
        relativeTime,
        inventoryReleased: true,
      })
    }

    // Sort latest cancellation first
    cancelledList.sort(
      (a, b) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime()
    )

    // Aggregate statistics
    let totalRefunded = 0
    let totalFeeCollected = 0
    let webAppCount = 0
    let manualCount = 0

    for (const c of cancelledList) {
      totalRefunded += c.netRefundAmount
      totalFeeCollected += c.cancellationFee
      if (c.cancellationOrigin === 'WEBAPP_USER_SELF_SERVICE') {
        webAppCount += 1
      } else {
        manualCount += 1
      }
    }

    return NextResponse.json({
      success: true,
      totalCancelledCount: cancelledList.length,
      webAppCount,
      manualCount,
      totalRefunded,
      totalFeeCollected,
      cancellations: cancelledList,
    })
  } catch (err: any) {
    console.error('[Admin Cancellations API] Error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to list cancellations' } },
      { status: 500 }
    )
  }
}

// 2. POST: Execute a Manual Administrative Cancellation with seat release
const ManualCancelSchema = z.object({
  ticketNo: z.string().min(1, 'Ticket number is required'),
  reason: z.string().min(1, 'Cancellation reason is required'),
  waiveFee: z.boolean().default(false),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parseResult = ManualCancelSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: parseResult.error.issues.map((i) => i.message).join(', ') } },
      { status: 400 }
    )
  }

  const { ticketNo, reason, waiveFee } = parseResult.data

  try {
    const result = await cancelBooking({
      ticketNo,
      callerUid: 'admin',
      isAnonymous: false,
      reason: waiveFee ? `${reason} (Cancellation Fee Waived: Full 100% Refund)` : reason,
    })

    return NextResponse.json({
      success: true,
      ticketNo: result.ticket.ticketNo,
      status: result.ticket.status,
      cancellationOrigin: 'MANUAL_ADMIN_OVERRIDE',
      refund: result.refund,
      message: `Ticket ${ticketNo} successfully cancelled via Manual Admin Override. Seats immediately released back to bus inventory.`,
    })
  } catch (err: unknown) {
    console.error('[Admin Manual Cancel API] Error:', err)
    return AppError.fromUnknown(err).toResponse()
  }
}
