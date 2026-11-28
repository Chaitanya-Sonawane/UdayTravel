import { z } from 'zod'

export const SeatIdRegex = /^(?:[A-Ja-j][1-6]|[1-9]\d?)$/

export const HoldPassengerSchema = z.object({
  seatId: z
    .string()
    .trim()
    .regex(SeatIdRegex, 'Invalid seat ID format')
    .transform((s) => s.toUpperCase()),
  gender: z
    .enum(['F', 'M', 'female', 'male'])
    .transform((g) => (g === 'female' || g === 'F' ? 'F' : 'M')),
  age: z.coerce.number().int().min(1).max(120),
})

export type HoldPassenger = z.infer<typeof HoldPassengerSchema>

export const SeatHoldRequestSchema = z.object({
  routeId: z.enum(['AHM_PUN', 'PUN_AHM']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  tripId: z.string().min(1, 'Trip ID is required'),
  family: z.boolean().default(false),
  acceptAdjacent: z.boolean().default(false),
  deviceId: z.string().optional(),
  passengers: z.array(HoldPassengerSchema).min(1).max(6).optional(),
  seatIds: z
    .array(
      z
        .string()
        .trim()
        .regex(SeatIdRegex, 'Invalid seat ID format')
        .transform((s) => s.toUpperCase())
    )
    .min(1)
    .max(6)
    .optional(),
})

export type SeatHoldRequest = z.infer<typeof SeatHoldRequestSchema>

export const PassengerDetailSchema = z.object({
  seat: z
    .string()
    .trim()
    .regex(SeatIdRegex, 'Invalid seat ID format')
    .transform((s) => s.toUpperCase()),
  name: z.string().min(2).max(60),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.enum(['male', 'female']),
})

export type PassengerDetail = z.infer<typeof PassengerDetailSchema>

export const OrderStatusSchema = z.enum([
  'CREATED',
  'CONFIRMED',
  'EXPIRED',
  'CANCELLED',
  'FAILED',
])

export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const OrderDocSchema = z.object({
  grp: z.string().min(1),
  uid: z.string().min(1),
  routeId: z.enum(['AHM_PUN', 'PUN_AHM']),
  tripId: z.string().min(1),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  busName: z.string(),
  seatIds: z.array(z.string().regex(SeatIdRegex)).min(1).max(6),
  passengers: z.array(PassengerDetailSchema).min(1).max(6),
  perSeatPaise: z.number().int().nonnegative(),
  totalPaise: z.number().int().nonnegative(),
  walletDebitPaise: z.number().int().nonnegative(),
  razorpayPaise: z.number().int().nonnegative(),
  status: OrderStatusSchema,
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  ticketNo: z.string().optional(),
  holdExpiresAt: z.number().int().positive(),
  holdExtended: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.number().int().default(1),
})

export type OrderDoc = z.infer<typeof OrderDocSchema>
