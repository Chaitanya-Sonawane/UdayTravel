import { describe, it, expect } from 'vitest'
import { GET as getCancellations, POST as postCancellation } from '@/app/api/admin/cancellations/route'

describe('Admin Ticket Cancellations & Refunds API (Manual vs Web App)', () => {
  it('retrieves cancellations ledger with manual vs webapp breakdown and financial metrics', async () => {
    const req = new Request('http://localhost:3000/api/admin/cancellations')
    const res = await getCancellations(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(typeof data.totalCancelledCount).toBe('number')
    expect(typeof data.webAppCount).toBe('number')
    expect(typeof data.manualCount).toBe('number')
    expect(typeof data.totalRefunded).toBe('number')
    expect(typeof data.totalFeeCollected).toBe('number')
    expect(Array.isArray(data.cancellations)).toBe(true)

    if (data.cancellations.length > 0) {
      const record = data.cancellations[0]
      expect(record.ticketNo).toBeDefined()
      expect(record.passengerName).toBeDefined()
      expect(record.cancellationOrigin).toMatch(/^(WEBAPP_USER_SELF_SERVICE|MANUAL_ADMIN_OVERRIDE)$/)
      expect(typeof record.farePaid).toBe('number')
      expect(typeof record.cancellationFee).toBe('number')
      expect(typeof record.netRefundAmount).toBe('number')
      expect(record.refundDestination).toBeDefined()
    }
  })

  it('filters cancellations by origin: WEBAPP vs MANUAL', async () => {
    // Test filter by WEBAPP
    const reqWeb = new Request('http://localhost:3000/api/admin/cancellations?origin=WEBAPP')
    const resWeb = await getCancellations(reqWeb)
    expect(resWeb.status).toBe(200)
    const dataWeb = await resWeb.json()
    expect(dataWeb.success).toBe(true)
    dataWeb.cancellations.forEach((r: any) => {
      expect(r.cancellationOrigin).toBe('WEBAPP_USER_SELF_SERVICE')
    })

    // Test filter by MANUAL
    const reqManual = new Request('http://localhost:3000/api/admin/cancellations?origin=MANUAL')
    const resManual = await getCancellations(reqManual)
    expect(resManual.status).toBe(200)
    const dataManual = await resManual.json()
    expect(dataManual.success).toBe(true)
    dataManual.cancellations.forEach((r: any) => {
      expect(r.cancellationOrigin).toBe('MANUAL_ADMIN_OVERRIDE')
    })
  })

  it('supports searching cancellations by passenger name or ticket number', async () => {
    const req = new Request('http://localhost:3000/api/admin/cancellations?q=NONEXISTENT_QUERY_XYZ_999')
    const res = await getCancellations(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.cancellations.length).toBe(0)
  })

  it('validates manual cancellation input on POST', async () => {
    // Missing required fields
    const req = new Request('http://localhost:3000/api/admin/cancellations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await postCancellation(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('INVALID_INPUT')
  })

  it('handles manual cancellation of a non-existent ticket gracefully', async () => {
    const req = new Request('http://localhost:3000/api/admin/cancellations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketNo: 'NONEXISTENT-9999',
        reason: 'Testing cancellation',
        waiveFee: false,
      }),
    })
    const res = await postCancellation(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('NOT_FOUND')
  })
})
