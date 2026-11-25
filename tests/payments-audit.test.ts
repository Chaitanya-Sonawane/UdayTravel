import { describe, it, expect, beforeEach } from 'vitest'
import { GET as getPayments } from '@/app/api/admin/payments/route'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { getAdminDb } from '@/lib/firebase/admin'

describe('Admin Payments & Booking Time Audit API', () => {
  const travelDate = '2026-11-20'

  it('retrieves live payment audit records with who paid, how much, and exact booking completion time', async () => {
    const req = new Request(`http://localhost:3000/api/admin/payments?date=${travelDate}`)
    const res = await getPayments(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(typeof data.totalRevenue).toBe('number')
    expect(typeof data.totalTransactions).toBe('number')
    expect(typeof data.cashRevenue).toBe('number')
    expect(typeof data.onlineRevenue).toBe('number')
    expect(Array.isArray(data.payments)).toBe(true)

    if (data.payments.length > 0) {
      const first = data.payments[0]
      // Who done
      expect(first.passengerName).toBeDefined()
      expect(first.passengerMobile).toBeDefined()
      expect(first.ticketNo).toBeDefined()
      expect(first.seatNo).toBeDefined()

      // How much
      expect(typeof first.amount).toBe('number')
      expect(first.amount).toBeGreaterThan(0)
      expect(first.paymentMethod).toBeDefined()
      expect(first.paymentStatus).toBe('CONFIRMED')

      // At what time for booking
      expect(first.bookedAt).toBeDefined()
      expect(first.bookedAtFormatted).toBeDefined()
      expect(typeof first.relativeTime).toBe('string')
    }
  }, 15000)

  it('filters payment records by route correctly', async () => {
    const req = new Request(`http://localhost:3000/api/admin/payments?date=${travelDate}&route=AHM_PUN`)
    const res = await getPayments(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    data.payments.forEach((p: any) => {
      expect(p.routeId).toBe('AHM_PUN')
    })
  }, 15000)

  it('filters payment records by payment method (CASH vs UPI vs GATEWAY)', async () => {
    const req = new Request(`http://localhost:3000/api/admin/payments?date=${travelDate}&method=CASH`)
    const res = await getPayments(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    data.payments.forEach((p: any) => {
      expect(p.paymentMethodCategory).toBe('CASH')
    })
  })

  it('filters specifically by gateway=RAZORPAY and returns online payment IDs and instruments', async () => {
    const req = new Request('http://localhost:3000/api/admin/payments?gateway=RAZORPAY')
    const res = await getPayments(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.isLiveRazorpayConnected).toBe(true)
    expect(Array.isArray(data.payments)).toBe(true)

    data.payments.forEach((p: any) => {
      expect(p.isRazorpay).toBe(true)
      expect(p.razorpayPaymentId).toMatch(/^pay_/)
      expect(p.razorpayDashboardUrl).toContain('dashboard.razorpay.com')
      expect(p.amount).toBeGreaterThan(0)
    })
  })

  it('supports searching by passenger name or phone number', async () => {
    const req = new Request(`http://localhost:3000/api/admin/payments?date=${travelDate}&q=Ramesh`)
    const res = await getPayments(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    if (data.payments.length > 0) {
      expect(data.payments[0].passengerName.toLowerCase()).toContain('ramesh')
    }
  })
})
