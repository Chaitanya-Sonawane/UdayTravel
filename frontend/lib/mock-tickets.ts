import { z } from 'zod'

export const passengerSchema = z.object({
  seat: z.string(),
  title: z.string().optional(),
  name: z.string(),
  age: z.number(),
  gender: z.enum(['female', 'male']),
})

export const ticketSchema = z.object({
  ticketNo: z.string(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'REFUND_INITIATED', 'COMPLETED']),
  route: z.object({ from: z.string(), to: z.string() }),
  travelDate: z.string(),
  busName: z.string(),
  busNumber: z.string(),
  seatLayout: z.string(),
  pickup: z.object({ name: z.string(), time: z.string(), pickupTime: z.string().optional() }),
  drop: z.object({ name: z.string(), time: z.string() }),
  passengers: z.array(passengerSchema),
  contactMobile: z.string(),
  email: z.string().optional(),
  fare: z.object({
    perSeat: z.number(),
    seats: z.number(),
    total: z.number(),
    taxes: z.number(),
    perSeatPaise: z.number().optional(),
    totalPaise: z.number().optional(),
  }),
  payment: z.object({
    method: z.string(),
    razorpayPaymentId: z.string(),
    paidAt: z.string(),
  }),
  bookedAt: z.string(),
  qrToken: z.string(),
})

export type Ticket = z.infer<typeof ticketSchema>

export const mockTicket: Ticket = {
  ticketNo: 'UT-AP-X8B4BR',
  status: 'CONFIRMED',
  route: { from: 'Ahilyanagar', to: 'Pune' },
  travelDate: '2026-11-25',
  busName: 'Uday Express',
  busNumber: 'MH 16 DP 4951',
  seatLayout: '3+2 Seater',
  pickup: { name: 'Ekvira Chowk', time: '06:30', pickupTime: '06:30' },
  drop: { name: 'Four Points', time: '09:30' },
  passengers: [
    { seat: 'A3', name: 'Chaitanya Sonawane', age: 22, gender: 'male' },
    { seat: 'B3', name: 'ShreeNidhi', age: 5, gender: 'female' },
    { seat: 'A4', name: 'Manav', age: 32, gender: 'male' },
  ],
  contactMobile: '+91 98900 66580',
  email: 'care@udaytravel.in',
  fare: { perSeat: 200, seats: 3, total: 600, taxes: 0, perSeatPaise: 20000, totalPaise: 60000 },
  payment: { method: 'UPI', razorpayPaymentId: 'pay_Nxxxxxxxx', paidAt: '2026-11-24T15:42:00' },
  bookedAt: '2026-11-24T15:42:00',
  qrToken: 'UT-AP-X8B4BR',
}

export function getTicket(ticketNo: string): Ticket | null {
  if (
    ticketNo === 'UT-ACTIVE-TEST' ||
    ticketNo === 'UT25354' ||
    ticketNo === 'UT100001' ||
    ticketNo === 'UT-AP-QCS2UE'
  ) {
    return { ...mockTicket, ticketNo }
  }
  if (ticketNo === 'UT-CANCELLED-01') {
    return { ...mockTicket, ticketNo, status: 'CANCELLED' }
  }
  return null
}
