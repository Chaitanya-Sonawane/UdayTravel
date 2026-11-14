import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'
import { POST as createOrderHandler } from '../app/api/create-order/route'
import { POST as verifyPaymentHandler } from '../app/api/verify-payment/route'

describe('Razorpay Standard Web Checkout API Endpoints', () => {
  const TEST_KEY_SECRET = '2VLkeeJYU5lXfLHDIaoZT3J4'
  const TEST_KEY_ID = 'rzp_test_TzxTR8Wj5xHqso'

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = TEST_KEY_ID
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = TEST_KEY_ID
  })

  describe('POST /api/create-order', () => {
    it('rejects missing or non-integer amount', async () => {
      const req = new Request('http://localhost:3000/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 'invalid' }),
      })
      const res = await createOrderHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Minimum amount is 100 paise')
    })

    it('rejects amount less than 100 paise (minimum ₹1.00)', async () => {
      const req = new Request('http://localhost:3000/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50 }),
      })
      const res = await createOrderHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Minimum amount is 100 paise')
    })

    it('creates order without throwing undefined status error', async () => {
      const req = new Request('http://localhost:3000/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 20000, currency: 'INR', receipt: 'test_rcpt_1' }),
      })
      const res = await createOrderHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.order_id).toBeDefined()
      expect(data.amount).toBe(20000)
    })
  })

  describe('POST /api/verify-payment', () => {
    it('rejects request with missing parameters', async () => {
      const req = new Request('http://localhost:3000/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: 'order_123',
          // missing payment_id and signature
        }),
      })
      const res = await verifyPaymentHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Missing required fields')
    })

    it('rejects tampered or mismatched signature with 400', async () => {
      const req = new Request('http://localhost:3000/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: 'order_ABC123',
          razorpay_payment_id: 'pay_XYZ789',
          razorpay_signature: 'fake_tampered_signature_1234567890abcdef',
        }),
      })
      const res = await verifyPaymentHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.message).toContain('Invalid payment signature')
    })

    it('accepts authentic HMAC-SHA256 signature with 200 success', async () => {
      const orderId = 'order_MOCK_VALID_001'
      const paymentId = 'pay_MOCK_VALID_001'
      const payload = `${orderId}|${paymentId}`
      const validSignature = crypto
        .createHmac('sha256', TEST_KEY_SECRET)
        .update(payload)
        .digest('hex')

      const req = new Request('http://localhost:3000/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        }),
      })
      const res = await verifyPaymentHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.order_id).toBe(orderId)
      expect(data.payment_id).toBe(paymentId)
    })
  })
})
