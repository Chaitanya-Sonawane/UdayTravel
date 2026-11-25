export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { listRazorpayPayments, RazorpayPaymentItem } from '@/lib/payments/razorpay'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST } from '@/lib/time/ist'

export interface PaymentAuditRecord {
  transactionId: string
  ticketNo: string
  bookingId: string
  passengerName: string
  passengerMobile: string
  passengerCount: number
  seatNo: string
  routeId: RouteId
  routeName: string
  travelDate: string
  departureTime: string
  busNumber: string
  amount: number
  paymentMethod: string
  paymentMethodCategory: 'CASH' | 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'GATEWAY' | 'OTHER'
  paymentStatus: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'AUTHORIZED' | 'CREATED' | 'FAILED'
  bookedAt: string
  paidAt: string
  bookedAtFormatted: string
  relativeTime: string

  // Razorpay Gateway Details
  isRazorpay: boolean
  razorpayPaymentId?: string
  razorpayOrderId?: string
  razorpayDashboardUrl?: string
  razorpayFee?: number
  razorpayTax?: number
  razorpayInstrument?: string
  gatewayStatus?: string
  source: 'FIRESTORE_TICKET' | 'RAZORPAY_GATEWAY' | 'COMBINED'
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

function categorizeMethod(methodStr: string): { label: string; category: 'CASH' | 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'GATEWAY' | 'OTHER' } {
  const m = (methodStr || '').toUpperCase()
  if (m.includes('CASH') || m === 'OFFICE_COUNTER_CASH' || m === 'COUNTER') {
    return { label: 'Cash at Counter', category: 'CASH' }
  }
  if (m.includes('UPI') || m === 'COUNTER_UPI' || m === 'RAZORPAY_UPI') {
    return { label: 'UPI QR', category: 'UPI' }
  }
  if (m.includes('WALLET')) {
    return { label: 'Wallet', category: 'WALLET' }
  }
  if (m.includes('CARD')) {
    return { label: 'Razorpay Card', category: 'CARD' }
  }
  if (m.includes('NETBANKING')) {
    return { label: 'Razorpay Netbanking', category: 'NETBANKING' }
  }
  if (m.includes('RAZORPAY') || m.includes('GATEWAY') || m.includes('ONLINE')) {
    return { label: 'Razorpay Gateway', category: 'GATEWAY' }
  }
  return { label: methodStr || 'Counter Cash', category: 'CASH' }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date') // YYYY-MM-DD or 'ALL'
  const routeParam = searchParams.get('route') || 'ALL'
  const methodParam = searchParams.get('method') || 'ALL'
  const gatewayFilter = searchParams.get('gateway') || 'ALL' // 'ALL' | 'RAZORPAY' | 'CASH'
  const searchQ = (searchParams.get('q') || '').trim().toLowerCase()

  try {
    // 1. Fetch tickets from Firestore
    const tickets = await TicketsRepository.listAllTickets({
      date: dateParam && dateParam !== 'ALL' ? dateParam : undefined,
      routeId: routeParam !== 'ALL' ? routeParam : undefined,
    })

    // 2. Fetch live Razorpay payment transactions
    const rzpResult = await listRazorpayPayments({ count: 50 }).catch(() => ({ items: [], count: 0 }))
    const rzpItems: RazorpayPaymentItem[] = rzpResult.items || []

    const paymentsMap = new Map<string, PaymentAuditRecord>()

    // 3. Process Firestore Tickets
    for (const t of tickets) {
      const isAhmPun =
        t.route?.routeId === 'AHM_PUN' ||
        t.route?.routeId === 'ahilyanagar_to_pune' ||
        (t.tripId && t.tripId.startsWith('AHM_PUN'))

      const routeId: RouteId = isAhmPun ? 'AHM_PUN' : 'PUN_AHM'
      const routeName = ROUTES[routeId]?.name || (isAhmPun ? 'Ahilyanagar → Pune' : 'Pune → Ahilyanagar')

      const firstPassenger = t.passengers?.[0]
      const passengerName = firstPassenger?.name || 'Passenger'
      const seatNo = t.passengers?.map((p) => p.seat).filter(Boolean).join(', ') || 'A1'
      const mobile = t.contactMobile || ''

      const amount =
        (t.fare?.totalPaise ? t.fare.totalPaise / 100 : 0) ||
        (t.fare?.perSeatPaise ? (t.fare.perSeatPaise * (t.fare.seats || 1)) / 100 : 200)

      const rawMethod = t.payment?.method || 'OFFICE_COUNTER_CASH'
      const { label: paymentMethod, category: paymentMethodCategory } = categorizeMethod(rawMethod)

      const bookedAt = t.bookedAt || t.payment?.paidAt || t.createdAt || new Date().toISOString()
      const paidAt = t.payment?.paidAt || bookedAt
      const bookedAtFormatted = formatIST(bookedAt)
      const relativeTime = getRelativeTime(bookedAt)

      const timeMatch = t.tripId?.match(/\d{4}/)?.[0]
      const departureTime = timeMatch
        ? `${timeMatch.slice(0, 2)}:${timeMatch.slice(2, 4)}`
        : (t as any).departureTime || '06:00'

      const status =
        t.status === 'CONFIRMED' || t.status === 'COMPLETED'
          ? 'CONFIRMED'
          : t.status === 'REFUND_INITIATED'
          ? 'REFUNDED'
          : t.status === 'CANCELLED'
          ? 'CANCELLED'
          : 'CONFIRMED'

      const rzpPaymentId = t.payment?.razorpayPaymentId
      const rzpOrderId = t.payment?.razorpayOrderId
      const isRzp = Boolean(rzpPaymentId || rawMethod.toLowerCase().includes('razorpay'))

      const transactionId = rzpPaymentId || `TX-${t.ticketNo}`

      // Check if we have matched live Razorpay transaction
      const matchedRzp = rzpItems.find(
        (r) =>
          (rzpPaymentId && r.id === rzpPaymentId) ||
          (rzpOrderId && r.order_id === rzpOrderId) ||
          (r.notes?.ticketNo && r.notes.ticketNo === t.ticketNo) ||
          (r.notes?.grp && r.notes.grp === t.grp)
      )

      let instrumentStr = undefined
      if (matchedRzp?.card) {
        instrumentStr = `${matchedRzp.card.network} •••• ${matchedRzp.card.last4} (${matchedRzp.card.issuer})`
      } else if (matchedRzp?.vpa) {
        instrumentStr = `UPI (${matchedRzp.vpa})`
      } else if (matchedRzp?.bank) {
        instrumentStr = `Netbanking (${matchedRzp.bank})`
      }

      const rec: PaymentAuditRecord = {
        transactionId,
        ticketNo: t.ticketNo,
        bookingId: t.grp,
        passengerName,
        passengerMobile: mobile,
        passengerCount: t.passengers?.length || 1,
        seatNo,
        routeId,
        routeName,
        travelDate: t.travelDate,
        departureTime,
        busNumber: t.busNumber || 'MH 16 DP 4951',
        amount,
        paymentMethod: matchedRzp ? `Razorpay ${matchedRzp.method.toUpperCase()}` : paymentMethod,
        paymentMethodCategory: isRzp ? 'GATEWAY' : paymentMethodCategory,
        paymentStatus: status,
        bookedAt,
        paidAt,
        bookedAtFormatted,
        relativeTime,
        isRazorpay: isRzp || Boolean(matchedRzp),
        razorpayPaymentId: rzpPaymentId || matchedRzp?.id,
        razorpayOrderId: rzpOrderId || matchedRzp?.order_id || undefined,
        razorpayDashboardUrl: (rzpPaymentId || matchedRzp?.id) ? `https://dashboard.razorpay.com/app/payments/${rzpPaymentId || matchedRzp?.id}` : undefined,
        razorpayFee: matchedRzp?.fee ? matchedRzp.fee / 100 : undefined,
        razorpayTax: matchedRzp?.tax ? matchedRzp.tax / 100 : undefined,
        razorpayInstrument: instrumentStr,
        gatewayStatus: matchedRzp?.status || (isRzp ? 'captured' : undefined),
        source: matchedRzp ? 'COMBINED' : 'FIRESTORE_TICKET',
      }

      paymentsMap.set(transactionId, rec)
    }

    // 4. Ingest and merge remaining Live Razorpay Gateway Payments
    for (const rzp of rzpItems) {
      if (paymentsMap.has(rzp.id)) continue

      // Filter by travel date if specified
      const rzpDate = new Date(rzp.created_at * 1000).toISOString().slice(0, 10)
      if (dateParam && dateParam !== 'ALL' && dateParam !== rzpDate) {
        // If a specific date filter is selected, respect it
        continue
      }

      let routeId: RouteId = 'AHM_PUN'
      let routeName = 'Ahilyanagar → Pune'
      if (rzp.description && rzp.description.toLowerCase().includes('pune → ahilyanagar')) {
        routeId = 'PUN_AHM'
        routeName = 'Pune → Ahilyanagar'
      }

      if (routeParam !== 'ALL' && routeParam !== routeId) {
        continue
      }

      const seats = rzp.notes?.seats || 'Online Seat'
      const mobile = rzp.contact || '+91 9309210620'
      const passengerName = rzp.notes?.name || (rzp.email && rzp.email !== 'void@razorpay.com' ? rzp.email.split('@')[0] : 'Online Customer')

      const bookedAtIso = new Date(rzp.created_at * 1000).toISOString()
      const bookedAtFormatted = formatIST(bookedAtIso)
      const relativeTime = getRelativeTime(bookedAtIso)

      let instrument = undefined
      if (rzp.card) {
        instrument = `${rzp.card.network} •••• ${rzp.card.last4} (${rzp.card.issuer || 'Debit'})`
      } else if (rzp.vpa) {
        instrument = `UPI (${rzp.vpa})`
      } else if (rzp.bank) {
        instrument = `Netbanking (${rzp.bank})`
      }

      let paymentStatus: PaymentAuditRecord['paymentStatus'] = 'CONFIRMED'
      if (rzp.status === 'captured') paymentStatus = 'CONFIRMED'
      else if (rzp.status === 'created') paymentStatus = 'CREATED'
      else if (rzp.status === 'authorized') paymentStatus = 'AUTHORIZED'
      else if (rzp.status === 'failed') paymentStatus = 'FAILED'
      else if (rzp.status === 'refunded') paymentStatus = 'REFUNDED'

      const rec: PaymentAuditRecord = {
        transactionId: rzp.id,
        ticketNo: rzp.notes?.ticketNo || `RZP-${rzp.id.slice(-6).toUpperCase()}`,
        bookingId: rzp.notes?.grp || rzp.order_id || rzp.id,
        passengerName,
        passengerMobile: mobile,
        passengerCount: 1,
        seatNo: seats,
        routeId,
        routeName: rzp.description || routeName,
        travelDate: rzpDate,
        departureTime: '06:00',
        busNumber: 'MH 16 DP 4951',
        amount: rzp.amount / 100,
        paymentMethod: `Razorpay ${rzp.method ? rzp.method.toUpperCase() : 'GATEWAY'}`,
        paymentMethodCategory: rzp.method === 'upi' ? 'UPI' : rzp.method === 'wallet' ? 'WALLET' : 'GATEWAY',
        paymentStatus,
        bookedAt: bookedAtIso,
        paidAt: bookedAtIso,
        bookedAtFormatted,
        relativeTime,
        isRazorpay: true,
        razorpayPaymentId: rzp.id,
        razorpayOrderId: rzp.order_id || undefined,
        razorpayDashboardUrl: `https://dashboard.razorpay.com/app/payments/${rzp.id}`,
        razorpayFee: rzp.fee ? rzp.fee / 100 : undefined,
        razorpayTax: rzp.tax ? rzp.tax / 100 : undefined,
        razorpayInstrument: instrument,
        gatewayStatus: rzp.status,
        source: 'RAZORPAY_GATEWAY',
      }

      paymentsMap.set(rzp.id, rec)
    }

    let allPayments = Array.from(paymentsMap.values())

    // 5. Gateway filter
    if (gatewayFilter === 'RAZORPAY') {
      allPayments = allPayments.filter((p) => p.isRazorpay)
    } else if (gatewayFilter === 'CASH') {
      allPayments = allPayments.filter((p) => !p.isRazorpay && p.paymentMethodCategory === 'CASH')
    }

    // 6. Payment Method Category filter
    if (methodParam !== 'ALL') {
      allPayments = allPayments.filter((p) => p.paymentMethodCategory === methodParam)
    }

    // 7. Search filter
    if (searchQ) {
      allPayments = allPayments.filter((p) => {
        return (
          p.passengerName.toLowerCase().includes(searchQ) ||
          p.passengerMobile.includes(searchQ) ||
          p.ticketNo.toLowerCase().includes(searchQ) ||
          p.seatNo.toLowerCase().includes(searchQ) ||
          p.transactionId.toLowerCase().includes(searchQ) ||
          (p.razorpayPaymentId && p.razorpayPaymentId.toLowerCase().includes(searchQ)) ||
          (p.razorpayOrderId && p.razorpayOrderId.toLowerCase().includes(searchQ)) ||
          p.paymentMethod.toLowerCase().includes(searchQ)
        )
      })
    }

    // Sort chronologically descending
    allPayments.sort(
      (a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime()
    )

    // Aggregate statistics
    let totalRevenue = 0
    let cashRevenue = 0
    let razorpayRevenue = 0
    let razorpayCapturedCount = 0

    for (const p of allPayments) {
      if (p.paymentStatus === 'CONFIRMED' || p.paymentStatus === 'COMPLETED' || p.gatewayStatus === 'captured') {
        totalRevenue += p.amount
        if (p.isRazorpay) {
          razorpayRevenue += p.amount
          razorpayCapturedCount += 1
        } else if (p.paymentMethodCategory === 'CASH') {
          cashRevenue += p.amount
        }
      }
    }

    const latestBookingTime =
      allPayments.length > 0 ? allPayments[0]!.bookedAtFormatted : 'None'

    return NextResponse.json({
      success: true,
      totalRevenue,
      totalTransactions: allPayments.length,
      cashRevenue,
      onlineRevenue: razorpayRevenue,
      razorpayRevenue,
      razorpayCapturedCount,
      latestBookingTime,
      gatewayProvider: 'RAZORPAY',
      isLiveRazorpayConnected: rzpItems.length > 0,
      payments: allPayments,
    })
  } catch (err: any) {
    console.error('[Admin Payments API] Error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to fetch payments' } },
      { status: 500 }
    )
  }
}
