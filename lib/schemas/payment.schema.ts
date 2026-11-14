import { z } from 'zod'
import { PassengerDetailSchema } from './booking.schema'

export const CreateOrderRequestSchema = z.object({
  grp: z.string().min(1, 'Hold group ID (grp) is required'),
  holdToken: z.string().min(1, 'Cryptographic holdToken is required'),
  useWallet: z.boolean().default(false),
  passengers: z.array(PassengerDetailSchema).min(1).max(6),
  contactMobile: z.string().min(10).max(15),
  email: z.string().email().optional(),
  routeId: z.enum(['AHM_PUN', 'PUN_AHM']).optional(),
  tripId: z.string().optional(),
  travelDate: z.string().optional(),
  busName: z.string().optional(),
})

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>

export const VerifyPaymentRequestSchema = z.object({
  grp: z.string().min(1, 'Hold group ID (grp) is required'),
  razorpay_payment_id: z.string().optional(),
  razorpay_order_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
})

export type VerifyPaymentRequest = z.infer<typeof VerifyPaymentRequestSchema>

export const PaymentDocSchema = z.object({
  razorpayPaymentId: z.string(),
  razorpayOrderId: z.string().optional(),
  grp: z.string(),
  uid: z.string(),
  amountPaise: z.number().int().nonnegative(),
  currency: z.literal('INR'),
  status: z.enum(['captured', 'failed', 'refunded']),
  method: z.string().optional(),
  email: z.string().optional(),
  contact: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.number().int().default(1),
})

export type PaymentDoc = z.infer<typeof PaymentDocSchema>
