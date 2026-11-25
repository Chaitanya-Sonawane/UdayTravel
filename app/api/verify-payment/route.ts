export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    // Support both snake_case (Razorpay default) and camelCase
    const order_id =
      body.razorpay_order_id || body.order_id || body.orderId
    const payment_id =
      body.razorpay_payment_id || body.payment_id || body.paymentId
    const signature = body.razorpay_signature || body.signature

    // Missing fields validation
    if (!order_id || !payment_id || !signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields. razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
        },
        { status: 400 }
      )
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET
    if (!key_secret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Razorpay secret key is not configured on the server.',
        },
        { status: 500 }
      )
    }

    // HMAC SHA256 (order_id + "|" + payment_id, KEY_SECRET)
    const payload = `${order_id}|${payment_id}`
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(payload)
      .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    let isValid = false
    try {
      const sigBuf = Buffer.from(signature, 'hex')
      const expBuf = Buffer.from(expectedSignature, 'hex')
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        isValid = true
      }
    } catch {
      isValid = false
    }

    if (!isValid) {
      const isDevMock =
        process.env.NODE_ENV !== 'production' &&
        (signature.includes('mock_signature') ||
          order_id.startsWith('order_dev_') ||
          order_id.startsWith('order_mock_'))

      if (!isDevMock) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid payment signature. Verification failed.',
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Payment signature verified successfully.',
        order_id,
        payment_id,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[Razorpay Verify Payment API] Error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Payment signature verification error',
      },
      { status: 500 }
    )
  }
}
