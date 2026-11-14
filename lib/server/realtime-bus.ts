import { EventEmitter } from 'events'

// Global event bus singleton across Next.js API route invocations
const globalForBus = global as unknown as { udaySeatBus?: EventEmitter }

export const seatBus = globalForBus.udaySeatBus ?? new EventEmitter()
// Set max listeners to 100 to support multiple concurrent users on the seat chart
seatBus.setMaxListeners(100)
globalForBus.udaySeatBus = seatBus

export interface SeatUpdatePayload {
  route?: string
  date: string
  tripId: string
  busName?: string
  booked?: number
  seatsLeft?: number
  seats?: Record<string, string>
  updatedAt?: string
}

export function notifySeatChartUpdate(payload: SeatUpdatePayload) {
  const route = payload.route || (payload.tripId.includes('_') ? payload.tripId.split('_').slice(0, 2).join('_') : 'AHM_PUN')
  const tripChannel = `seats:${route}_${payload.date}_${payload.tripId}`
  const routeChannel = `availability:${route}_${payload.date}`

  seatBus.emit(tripChannel, payload)
  seatBus.emit(routeChannel, payload)
}
