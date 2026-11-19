import { z } from 'zod'
import { RouteId, ROUTES } from '../config/routes'
import { AvailabilityStatus } from '../availability/status'

export type SeatState = 'available' | 'male' | 'female' | 'blocked'

export const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const
export const SEAT_COLS = [1, 2, 3, 4, 5] as const

/**
 * Generates standard list of all 50 seat IDs in 3+2 layout.
 * [A1..A5, B1..B5, ..., J1..J5]
 */
export function generateDefaultSeatIds(): string[] {
  const ids: string[] = []
  for (const row of SEAT_ROWS) {
    for (const col of SEAT_COLS) {
      ids.push(`${row}${col}`)
    }
  }
  return ids
}

/**
 * Initializes default seat map with given booked count or clean state.
 */
export function generateDefaultSeatsMap(bookedCount = 0): Record<string, SeatState> {
  const map: Record<string, SeatState> = {}
  const allIds = generateDefaultSeatIds()

  allIds.forEach((id, index) => {
    if (index < bookedCount) {
      // Alternate between male and female for existing booked seeds
      map[id] = index % 3 === 0 ? 'female' : 'male'
    } else {
      map[id] = 'available'
    }
  })

  return map
}

export const AvailabilityQuerySchema = z.object({
  route: z.string().refine((val): val is RouteId => val in ROUTES, {
    message: 'Invalid route. Must be AHM_PUN or PUN_AHM.',
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format.',
  }),
})

export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>

export interface TripScheduleData {
  tripId: string
  busName: string
  busType?: string
  departureTime: string // HH:mm
  arrivalTime: string // HH:mm
  durationMin?: number
  duration?: string
  fare: number
  totalSeats: number
  booked: number
  seats?: Record<string, SeatState>
  updatedAt?: string
}

export interface TripAvailabilityItem {
  tripId: string
  busName: string
  busType?: string
  departure: string // ISO string with +05:30
  arrival: string // ISO string with +05:30
  departureTime: string // HH:mm
  arrivalTime: string // HH:mm
  duration: string
  seatsLeft: number
  totalCapacity: number
  booked: number
  status: AvailabilityStatus
  fare: number
  seats?: Record<string, SeatState>
}

export interface AvailabilityResponse {
  route: RouteId
  date: string
  weekday: string
  asOf: string
  trips: TripAvailabilityItem[]
}

export interface AvailabilityDoc {
  route?: RouteId
  date?: string
  trips?: Record<string, Partial<TripScheduleData> & { booked?: number }>
  customTrips?: TripScheduleData[]
  updatedAt?: string
}
