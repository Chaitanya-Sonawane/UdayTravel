import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/payments/signature'
import { WebhookEventsRepository } from '@/lib/data/webhook-events.repo'
import { confirmBooking } from '@/lib/payments/confirm'
import { OrdersRepository } from '@/lib/data/orders.repo'
import { RefundsRepository } from '@/lib/data/refunds.repo'
import { getAdminDb } from '@/lib/firebase/admin'

export async function POST(req: Request) {
  const signature = req.headers.get('x-razorpay-signature')
  if (!signature) {
    return NextResponse.json(
      { error: { code: 'INVALID_SIGNATURE', message: 'Missing x-razorpay-signature header' } },
      { status: 400 }
    )
  }

  const rawBody = await req.text()

  // 1. Cryptographic HMAC-SHA256 signature verification
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

  // 2. Webhook Deduplication
  const isNew = await WebhookEventsRepository.recordEventIfNew(eventId, eventType)
  if (!isNew) {
    return NextResponse.json({ received: true, deduplicated: true }, { status: 200 })
  }

  try {
    // 3. Process supported events
    switch (eventType) {
      case 'payment.captured':
      case 'order.paid': {
        const paymentEntity = eventPayload.payload?.payment?.entity
        const orderId = paymentEntity?.order_id || eventPayload.payload?.order?.entity?.id
        const paymentId = paymentEntity?.id
        const grpFromNotes = paymentEntity?.notes?.grp

        let grp = grpFromNotes

        // If grp was not in notes, find order by razorpayOrderId
        if (!grp && orderId) {
          const db = getAdminDb()
          const snap = await db.collection('orders').get()
          snap.forEach((doc) => {
            const o = doc.data()
            if (o.razorpayOrderId === orderId) {
              grp = o.grp
            }
          })
        }

        if (grp) {
          await confirmBooking({
            grp,
            paymentId,
            source: 'WEBHOOK',
          })
        }
        break
      }

      case 'payment.failed': {
        const paymentEntity = eventPayload.payload?.payment?.entity
        const grp = paymentEntity?.notes?.grp
        if (grp) {
          await OrdersRepository.updateOrder(grp, { status: 'FAILED' })
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

      case 'refund.failed': {
        const refundEntity = eventPayload.payload?.refund?.entity
        const ticketNo = refundEntity?.notes?.ticketNo
        if (ticketNo) {
          await RefundsRepository.updateRefund(ticketNo, {
            status: 'FAILED',
            failureReason: refundEntity.error_description || 'Razorpay refund processing failed',
          })
        }
        break
      }

      default:
        // Acknowledge other informational webhook events (refund.created, refund.speed_changed, etc.)
        break
    }

    return NextResponse.json({ received: true, processed: true }, { status: 200 })
  } catch (err: unknown) {
    console.error(`[Webhook Error] Processing ${eventType} (${eventId}) failed:`, err)
    // Return 200 to Razorpay to prevent repeated webhook retry storms for business logic conflicts
    return NextResponse.json({ received: true, error: String(err) }, { status: 200 })
  }
}
