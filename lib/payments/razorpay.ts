import Razorpay from 'razorpay'
import { AppError, ErrorCodes } from '../errors/app-error'

let razorpayInstance: Razorpay | null = null

export function getRazorpayClient(): Razorpay {
  if (razorpayInstance) return razorpayInstance

  const key_id =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    'rzp_test_dummy_key_id'
  const key_secret =
    process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_secret_for_tests'

  const isProd = process.env.NODE_ENV === 'production'
  if (isProd) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured in production'
      )
    }
  }

  razorpayInstance = new Razorpay({
    key_id,
    key_secret,
  })

  return razorpayInstance
}

export function isRazorpayTestMode(): boolean {
  const key_id =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    ''
  return key_id.startsWith('rzp_test_')
}

export interface RazorpayOrderResult {
  id: string
  amount: number
  currency: string
  receipt?: string
}

export async function createRazorpayOrder(params: {
  amountPaise: number
  receipt: string
  notes?: Record<string, string>
}): Promise<RazorpayOrderResult> {
  const client = getRazorpayClient()
  try {
    const order = await client.orders.create({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes,
    })
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      receipt: order.receipt || undefined,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Razorpay order creation failed'
    throw new AppError(ErrorCodes.INTERNAL_ERROR, `Payment gateway error: ${message}`)
  }
}

export interface RazorpayPaymentDetails {
  id: string
  order_id: string
  amount: number
  currency: string
  status: string
  method?: string
  email?: string
  contact?: string
}

export async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPaymentDetails> {
  const client = getRazorpayClient()
  try {
    const payment = (await client.payments.fetch(paymentId)) as any
    return {
      id: payment.id,
      order_id: payment.order_id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      email: payment.email,
      contact: payment.contact,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch payment'
    throw new AppError(
      ErrorCodes.PAYMENT_NOT_FOUND,
      `Payment ${paymentId} not found on Razorpay: ${message}`
    )
  }
}

export interface RazorpayRefundResult {
  id: string
  payment_id: string
  amount: number
  status: string
}

export async function issueRazorpayRefund(params: {
  paymentId: string
  amountPaise: number
  notes?: Record<string, string>
}): Promise<RazorpayRefundResult> {
  const client = getRazorpayClient()
  try {
    const refund = (await client.payments.refund(params.paymentId, {
      amount: params.amountPaise,
      notes: params.notes,
    })) as any
    return {
      id: refund.id,
      payment_id: refund.payment_id,
      amount: Number(refund.amount),
      status: refund.status,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Razorpay refund failed'
    throw new AppError(ErrorCodes.REFUND_FAILED, `Failed to execute refund: ${message}`)
  }
}
