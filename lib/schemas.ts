import { z } from 'zod'
export const createOrderSchema = z.object({ bookingId: z.string().min(1) })
export const verifyPaymentSchema = z.object({ bookingId: z.string().min(1), razorpay_payment_id: z.string(), razorpay_order_id: z.string(), razorpay_signature: z.string() })
export const webhookSchema = z.object({ event: z.string(), payload: z.record(z.string(), z.unknown()).optional() })
export type PaymentState = 'idle' | 'creating_order' | 'checkout_open' | 'verifying' | 'success' | 'failed' | 'dismissed' | 'expired'
