import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyPaymentSignature(params: {
  orderId: string
  paymentId: string
  signature: string
  secret?: string
}): boolean {
  const secret =
    params.secret ||
    process.env.RAZORPAY_KEY_SECRET ||
    'N160Ry7FB4ByB1k0kvp4trEE'
  const payload = `${params.orderId}|${params.paymentId}`

  try {
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    const bufA = Buffer.from(params.signature, 'hex')
    const bufB = Buffer.from(expected, 'hex')
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export function verifyWebhookSignature(params: {
  rawBody: string
  signature: string
  secret?: string
}): boolean {
  const secret =
    params.secret ||
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    'dummy_webhook_secret_for_tests'

  try {
    const expected = createHmac('sha256', secret).update(params.rawBody).digest('hex')
    const bufA = Buffer.from(params.signature, 'hex')
    const bufB = Buffer.from(expected, 'hex')
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export function generateQrToken(ticketNo: string, travelDate: string, busNumber: string): string {
  const secret = process.env.QR_SECRET || process.env.ADMIN_SECRET_KEY || 'uday_qr_secret_2026'
  const payload = `${ticketNo}|${travelDate}|${busNumber}`
  const signature = createHmac('sha256', secret).update(payload).digest('hex').substring(0, 16)
  return `${ticketNo}.${signature}`
}
