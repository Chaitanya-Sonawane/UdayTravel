import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type RiderGender = 'woman' | 'man'
export type SeatStatus = 'available' | 'male' | 'female' | 'for-male' | 'for-female' | 'held' | 'booked' | 'blocked'
export type Seat = { id: string; status: SeatStatus }

export interface PassengerPrefs {
  seatType?: 'window' | 'aisle' | 'any'
  area?: 'front' | 'middle' | 'rear' | 'any'
}

export type Passenger = {
  id: string
  name: string
  age: string
  gender?: RiderGender
  seatId?: string
  prefs?: PassengerPrefs
}

export type BookingJourney = {
  from: string
  to: string
  routeId?: string
  tripId?: string
  date: string
  busId: string
  busName: string
  departure: string
  arrival: string
  fare: number
}

type BookingState = {
  journey: BookingJourney
  passengerCount: number
  passengers: Passenger[]
  family: boolean
  acceptAdjacent: boolean
  selected: string[]
  boarding: string
  dropping: string
  holdExpiresAt?: number
  grp?: string
  holdToken?: string
  loadedSeats: Seat[]
  setJourney: (journey: Partial<BookingJourney>) => void
  setPassengerCount: (count: number) => void
  updatePassenger: (id: string, updates: Partial<Passenger>) => void
  setPassengerPrefs: (id: string, prefs: Partial<PassengerPrefs>) => void
  assignSeat: (passengerId: string, seatId: string) => void
  clearSeat: (passengerId: string) => void
  toggleFamily: () => void
  setAcceptAdjacent: (accept: boolean) => void
  setStops: (boarding: string, dropping: string) => void
  setLoadedSeats: (seats: Seat[]) => void
  startHold: () => void
  setHold: (grp: string, holdToken: string, expiresAt: number) => void
  clear: () => void
}

const createPassenger = (index: number): Passenger => ({
  id: `passenger-${index + 1}`,
  name: '',
  age: '',
  prefs: { seatType: 'any', area: 'any' },
})

export const defaultSeats: Seat[] = Array.from({ length: 50 }, (_, index) => {
  const row = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'][Math.floor(index / 5)]
  const number = (index % 5) + 1
  const id = `${row}${number}`
  return { id, status: 'available' }
})

export const mockSeats: Seat[] = defaultSeats

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      journey: {
        from: 'Ahilyanagar',
        to: 'Pune',
        routeId: 'AHM_PUN',
        tripId: '',
        date: '',
        busId: '',
        busName: '',
        departure: '',
        arrival: '',
        fare: 200,
      },
      passengerCount: 1,
      passengers: [createPassenger(0)],
      family: false,
      acceptAdjacent: false,
      selected: [],
      boarding: '',
      dropping: 'Shivajinagar, Pune',
      loadedSeats: defaultSeats,
      setJourney: (journey) => set((state) => ({ journey: { ...state.journey, ...journey } })),
      setPassengerCount: (count) =>
        set((state) => {
          const safeCount = Math.max(1, Math.min(6, count))
          const passengers = Array.from({ length: safeCount }, (_, index) => state.passengers[index] ?? createPassenger(index))
          const selected = passengers.flatMap((passenger) => (passenger.seatId ? [passenger.seatId] : []))
          return { passengerCount: safeCount, passengers, selected }
        }),
      updatePassenger: (id, updates) =>
        set((state) => ({
          passengers: state.passengers.map((passenger) =>
            passenger.id === id ? { ...passenger, ...updates } : passenger
          ),
        })),
      setPassengerPrefs: (id, prefs) =>
        set((state) => ({
          passengers: state.passengers.map((passenger) =>
            passenger.id === id
              ? { ...passenger, prefs: { ...passenger.prefs, ...prefs } }
              : passenger
          ),
        })),
      assignSeat: (passengerId, seatId) =>
        set((state) => {
          const passengers = state.passengers.map((passenger) =>
            passenger.seatId === seatId || passenger.id === passengerId
              ? { ...passenger, seatId: passenger.id === passengerId ? seatId : undefined }
              : passenger
          )
          return { passengers, selected: passengers.flatMap((passenger) => (passenger.seatId ? [passenger.seatId] : [])) }
        }),
      clearSeat: (passengerId) =>
        set((state) => {
          const passengers = state.passengers.map((passenger) =>
            passenger.id === passengerId ? { ...passenger, seatId: undefined } : passenger
          )
          return { passengers, selected: passengers.flatMap((passenger) => (passenger.seatId ? [passenger.seatId] : [])) }
        }),
      toggleFamily: () => set((state) => ({ family: !state.family })),
      setAcceptAdjacent: (acceptAdjacent) => set({ acceptAdjacent }),
      setStops: (boarding, dropping) => set({ boarding, dropping }),
      setLoadedSeats: (loadedSeats) => set({ loadedSeats }),
      startHold: () => set({ holdExpiresAt: Date.now() + 300000 }),
      setHold: (grp, holdToken, expiresAt) => set({ grp, holdToken, holdExpiresAt: expiresAt }),
      clear: () =>
        set({
          passengerCount: 1,
          passengers: [createPassenger(0)],
          selected: [],
          holdExpiresAt: undefined,
          grp: undefined,
          holdToken: undefined,
          family: false,
          acceptAdjacent: false,
          loadedSeats: defaultSeats,
        }),
    }),
    {
      name: 'uday-booking-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.sessionStorage : (null as any))),
    }
  )
)
