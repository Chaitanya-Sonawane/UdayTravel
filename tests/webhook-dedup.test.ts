import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyWebhookSignature } from '../lib/payments/signature'
import { WebhookEventsRepository } from '../lib/data/webhook-events.repo'

describe('Razorpay Webhook & Signature Deduplication', () => {
  const secret = 'test_webhook_secret_key_123'
  const rawPayload = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_test_001', amount: 20000 } } },
  })

  it('validates authentic webhook HMAC-SHA256 signature', () => {
    const validSignature = createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex')

    const isValid = verifyWebhookSignature({
      rawBody: rawPayload,
      signature: validSignature,
      secret,
    })
    expect(isValid).toBe(true)
  })

  it('rejects tampered webhook payload or incorrect secret', () => {
    const validSignature = createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex')

    const tamperedPayload = rawPayload.replace('20000', '10000')
    const isValid = verifyWebhookSignature({
      rawBody: tamperedPayload,
      signature: validSignature,
      secret,
    })
    expect(isValid).toBe(false)
  })

  it('atomically deduplicates repeated webhook event deliveries', async () => {
    const eventId = `evt_dedup_${Date.now()}`

    // First delivery -> Accepted
    const firstAttempt = await WebhookEventsRepository.recordEventIfNew(
      eventId,
      'payment.captured'
    )
    expect(firstAttempt).toBe(true)

    // Second delivery (replay) -> Deduplicated
    const secondAttempt = await WebhookEventsRepository.recordEventIfNew(
      eventId,
      'payment.captured'
    )
    expect(secondAttempt).toBe(false)
  })
})
