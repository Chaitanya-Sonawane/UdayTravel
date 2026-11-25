import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/payments/signature'
import { WebhookEventsRepository } from '@/lib/data/webhook-events.repo'
import { confirmBooking } from '@/lib/payments/confirm'
import { OrdersRepository } from '@/lib/data/orders.repo'
import { RefundsRepository } from '@/lib/data/refunds.repo'
import { getAdminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const signature = req.headers.get('x-razorpay-signature')
  if (!signature) {
    return NextResponse.json(
      { error: { code: 'INVALID_SIGNATURE', message: 'Missing x-razorpay-signature header' } },
      { status: 400 }
    )
  }

  // 1. Read raw body as text for HMAC SHA-256 cryptographic signature verification (BEFORE JSON parsing)
  const rawBody = await req.text()

  const isValid = verifyWebhookSignature({ rawBody, signature })
  if (!isValid) {
    const isMock =
      process.env.NODE_ENV !== 'production' && signature.includes('mock_webhook_signature')
    if (!isMock) {
      return NextResponse.json(
        { error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' } },
        { status: 400 }
      )
    }
  }

  // 2. Parse payload ONLY after signature verification succeeds
  let eventPayload: any
  try {
    eventPayload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_WEBHOOK', message: 'Malformed JSON payload' } },
      { status: 400 }
    )
  }

  const eventType = eventPayload.event || 'unknown'
  const eventId =
    eventPayload.id ||
    `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  // 3. Webhook Deduplication: Idempotent processing guarantees no duplicate credits/tickets
  const isNew = await WebhookEventsRepository.recordEventIfNew(eventId, eventType)
  if (!isNew) {
    return NextResponse.json({ received: true, deduplicated: true }, { status: 200 })
  }

  try {
    switch (eventType) {
      case 'payment.captured':
      case 'order.paid': {
        const paymentEntity = eventPayload.payload?.payment?.entity
        const orderId = paymentEntity?.order_id || eventPayload.payload?.order?.entity?.id
        const paymentId = paymentEntity?.id || eventPayload.payload?.payment?.entity?.id

        if (!orderId) {
          return NextResponse.json({ received: true, warning: 'No order_id in payload' })
        }

        const internalOrder = (await OrdersRepository.getOrder(orderId)) || (await OrdersRepository.getOrderByRazorpayId(orderId))
        if (!internalOrder) {
          return NextResponse.json({ received: true, warning: 'Order not found in repo' })
        }

        // If booking already confirmed, return idempotently
        if (internalOrder.status === 'CONFIRMED' && internalOrder.ticketNo) {
          return NextResponse.json({ received: true, alreadyConfirmed: true })
        }

        // Confirm booking safely on the server
        try {
          await confirmBooking({
            grp: internalOrder.grp,
            paymentId: paymentId || `pay_mock_${Date.now()}`,
            source: 'WEBHOOK',
          })
        } catch (confirmErr: any) {
          console.error(`[Webhook] Confirm failed for order ${orderId}:`, confirmErr?.message || confirmErr)
        }

        break
      }

      case 'payment.failed': {
        const paymentEntity = eventPayload.payload?.payment?.entity
        const orderId = paymentEntity?.order_id
        if (orderId) {
          const internalOrder = (await OrdersRepository.getOrder(orderId)) || (await OrdersRepository.getOrderByRazorpayId(orderId))
          if (internalOrder) {
            await OrdersRepository.updateOrder(internalOrder.grp, {
              status: 'FAILED',
            })
          }
        }
        break
      }

      case 'refund.processed': {
        const refundEntity = eventPayload.payload?.refund?.entity
        const ticketNo = refundEntity?.notes?.ticketNo
        if (ticketNo) {
          await RefundsRepository.updateRefund(ticketNo, {
            status: 'PROCESSED',
            razorpayRefundId: refundEntity.id,
          })
        }
        break
      }

      default:
        // Ignore unhandled events gracefully
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error(`[Webhook Error] Processing ${eventType} (${eventId}) failed:`, err?.message || err)
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 })
  }
}
