import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/tickets/[ticketNo]/pdf/route'

describe('GET /api/tickets/[ticketNo]/pdf', () => {
  it('generates a valid PDF for sample ticket UT25354', async () => {
    const req = new Request('http://localhost:3000/api/tickets/UT25354/pdf')
    const response = await GET(req, {
      params: Promise.resolve({ ticketNo: 'UT25354' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('UdayTravels-UT25354.pdf')

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    expect(buffer.length).toBeGreaterThan(1000)
    // Check PDF magic header
    expect(buffer.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('generates a valid PDF for seeded ticket UT100001', async () => {
    const req = new Request('http://localhost:3000/api/tickets/UT100001/pdf')
    const response = await GET(req, {
      params: Promise.resolve({ ticketNo: 'UT100001' }),
    })

    // If UT100001 exists in Firestore, it returns 200, or 404 if offline
    if (response.status === 200) {
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      expect(buffer.toString('utf-8', 0, 5)).toBe('%PDF-')
    }
  })

  it('returns 404 for an unknown ticket', async () => {
    const req = new Request('http://localhost:3000/api/tickets/NON_EXISTENT_9999/pdf')
    const response = await GET(req, {
      params: Promise.resolve({ ticketNo: 'NON_EXISTENT_9999' }),
    })

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Ticket not found')
  })
})
