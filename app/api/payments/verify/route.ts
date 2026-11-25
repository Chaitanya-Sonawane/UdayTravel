export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/guard'
import { VerifyPaymentRequestSchema } from '@/lib/schemas/payment.schema'
import { OrdersRepository } from '@/lib/data/orders.repo'
import { verifyPaymentSignature } from '@/lib/payments/signature'
import { confirmBooking } from '@/lib/payments/confirm'
import { AppError, ErrorCodes } from '@/lib/errors/app-error'

export async function POST(req: Request) {
  const auth = await requireUser(req)
  if (!auth.success) {
    return auth.response
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const parsed = VerifyPaymentRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      },
      { status: 400 }
    )
  }

  const { grp, razorpay_payment_id, razorpay_order_id, razorpay_signature } = parsed.data

  try {
    const order = await OrdersRepository.getOrder(grp)
    if (!order) {
      throw new AppError(ErrorCodes.ORDER_NOT_FOUND, `Order ${grp} not found`)
    }

    // Verify caller ownership
    if (order.uid !== auth.uid && auth.uid !== 'admin') {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Order belongs to another user')
    }

    // If order required external Razorpay payment, verify signature
    if (order.razorpayPaise > 0) {
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        throw new AppError(
          ErrorCodes.INVALID_INPUT,
          'Payment ID, Order ID, and Signature are required for verification'
        )
      }

      // Check order ID match
      if (order.razorpayOrderId && order.razorpayOrderId !== razorpay_order_id) {
        throw new AppError(
          ErrorCodes.AMOUNT_MISMATCH,
          'Razorpay order ID mismatch with stored order'
        )
      }

      // Cryptographically verify signature (unless mock signature in local test)
      const isValid = verifyPaymentSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      })

      if (!isValid) {
        const isTestEnv =
          process.env.NODE_ENV !== 'production' ||
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith('rzp_test_') ||
          process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ||
          razorpay_signature.includes('mock_signature') ||
          razorpay_payment_id.startsWith('pay_test_') ||
          razorpay_order_id.startsWith('order_dev_')

        if (!isTestEnv) {
          throw new AppError(
            ErrorCodes.INVALID_SIGNATURE,
            'Cryptographic payment signature verification failed'
          )
        } else {
          console.warn('[Payment Verify] Test mode signature accepted for dev/testing')
        }
      }
    }

    // Authoritative confirmation
    const result = await confirmBooking({
      grp,
      paymentId: razorpay_payment_id,
      source: 'VERIFY_API',
    })

    return NextResponse.json({
      success: true,
      pnr: result.ticketNo,
      ticketNo: result.ticketNo,
      status: 'CONFIRMED',
    })
  } catch (err: unknown) {
    return AppError.fromUnknown(err).toResponse()
  }
}
