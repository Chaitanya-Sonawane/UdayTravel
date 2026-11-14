import { z } from 'zod'
import { SeatIdRegex } from './booking.schema'

export const TicketStatusSchema = z.enum([
  'CONFIRMED',
  'CANCELLED',
  'REFUND_INITIATED',
  'COMPLETED',
])

export type TicketStatus = z.infer<typeof TicketStatusSchema>

export const TicketPassengerSchema = z.object({
  seat: z.string().regex(SeatIdRegex),
  title: z.string().default(''),
  name: z.string().min(1),
  age: z.number().int().positive(),
  gender: z.enum(['male', 'female']),
})

export type TicketPassenger = z.infer<typeof TicketPassengerSchema>

export const TicketDocSchema = z.object({
  ticketNo: z.string().regex(/^UT[A-Z0-9]{5,10}$/),
  grp: z.string(),
  uid: z.string(),
  status: TicketStatusSchema,
  route: z.object({
    from: z.string(),
    to: z.string(),
    routeId: z.enum(['AHM_PUN', 'PUN_AHM']),
  }),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tripId: z.string(),
  busName: z.string(),
  busNumber: z.string(),
  seatLayout: z.string().default('3+2 Seater'),
  pickup: z.object({
    name: z.string(),
    time: z.string(),
  }),
  drop: z.object({
    name: z.string(),
    time: z.string(),
  }),
  passengers: z.array(TicketPassengerSchema).min(1).max(6),
  contactMobile: z.string(),
  email: z.string().optional(),
  fare: z.object({
    perSeatPaise: z.number().int().nonnegative(),
    seats: z.number().int().positive(),
    totalPaise: z.number().int().nonnegative(),
    taxesPaise: z.number().int().nonnegative().default(0),
  }),
  payment: z.object({
    method: z.string(),
    razorpayPaymentId: z.string().optional(),
    razorpayOrderId: z.string().optional(),
    walletDebitPaise: z.number().int().nonnegative(),
    razorpayPaise: z.number().int().nonnegative(),
    paidAt: z.string(),
  }),
  bookedAt: z.string(),
  qrToken: z.string(),
  cancelledAt: z.string().optional(),
  cancellationFeePaise: z.number().int().nonnegative().optional(),
  refundPaise: z.number().int().nonnegative().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.number().int().default(1),
})

export type TicketDoc = z.infer<typeof TicketDocSchema>

export const RefundStatusSchema = z.enum(['PENDING', 'PROCESSED', 'FAILED'])
export type RefundStatus = z.infer<typeof RefundStatusSchema>

export const RefundDocSchema = z.object({
  ticketNo: z.string(),
  uid: z.string(),
  grp: z.string(),
  totalPaidPaise: z.number().int().nonnegative(),
  feePaise: z.number().int().nonnegative(),
  netRefundPaise: z.number().int().nonnegative(),
  sourceRefundPaise: z.number().int().nonnegative(),
  walletRefundPaise: z.number().int().nonnegative(),
  razorpayRefundId: z.string().optional(),
  status: RefundStatusSchema,
  failureReason: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.number().int().default(1),
})

export type RefundDoc = z.infer<typeof RefundDocSchema>

export const CancelTicketRequestSchema = z.object({
  reason: z.string().optional(),
})

export type CancelTicketRequest = z.infer<typeof CancelTicketRequestSchema>
