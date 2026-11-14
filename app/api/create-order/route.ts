import { NextResponse } from 'next/server'
import { getRazorpayClient } from '@/lib/payments/razorpay'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { amount, currency = 'INR', receipt, notes } = body

    // 1. Validate amount: must be integer paise and >= 100 paise (₹1.00 minimum)
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum amount is 100 paise (₹1.00).' },
        { status: 400 }
      )
    }

    const key_id =
      process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET

    if (!key_id || !key_secret) {
      return NextResponse.json(
        { error: 'Razorpay credentials not configured on server.' },
        { status: 500 }
      )
    }

    const client = getRazorpayClient()
    const order = await client.orders.create({
      amount,
      currency: currency.toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    })

    return NextResponse.json({
      order_id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      key_id,
    })
  } catch (err: any) {
    console.error('[Razorpay Create Order API] Error:', err)
    const statusCode =
      err.statusCode ||
      (err.error && err.error.code === 'BAD_REQUEST_ERROR' ? 400 : 500)
    return NextResponse.json(
      {
        error:
          err.message ||
          (err.error && err.error.description) ||
          'Failed to create Razorpay order',
      },
      { status: statusCode }
    )
  }
}
