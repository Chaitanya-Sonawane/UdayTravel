export type Route = 'nagar-pune' | 'pune-nagar'
export type BusStatus = 'available' | 'almost-full' | 'closed' | 'sold-out'
export type Bus = { id: string; departure: string; arrival: string; name: string; seatsLeft: number; fare: number; duration: string; totalSeats: number }

const outbound: Bus[] = [
  { id: 'express-04', departure: '05:30', arrival: '08:15', name: 'Uday Express 04', seatsLeft: 0, fare: 200, duration: '02h 45m', totalSeats: 58 },
  { id: 'express-01', departure: '06:00', arrival: '08:45', name: 'Uday Express 01', seatsLeft: 16, fare: 200, duration: '02h 45m', totalSeats: 58 },
  { id: 'express-02', departure: '09:30', arrival: '12:15', name: 'Uday Express 02', seatsLeft: 12, fare: 200, duration: '02h 45m', totalSeats: 58 },
  { id: 'express-03', departure: '14:00', arrival: '16:45', name: 'Uday Express 03', seatsLeft: 10, fare: 200, duration: '02h 45m', totalSeats: 58 },
]
const inbound: Bus[] = [
  { id: 'return-01', departure: '06:30', arrival: '09:15', name: 'Uday Express 01', seatsLeft: 18, fare: 200, duration: '02h 45m', totalSeats: 58 },
  { id: 'return-02', departure: '10:00', arrival: '12:45', name: 'Uday Express 02', seatsLeft: 14, fare: 200, duration: '02h 45m', totalSeats: 58 },
  { id: 'return-03', departure: '13:30', arrival: '16:15', name: 'Uday Express 03', seatsLeft: 9, fare: 200, duration: '02h 45m', totalSeats: 58 },
  { id: 'return-04', departure: '17:00', arrival: '19:45', name: 'Uday Express 04', seatsLeft: 6, fare: 200, duration: '02h 45m', totalSeats: 58 },
]
export async function getBuses(route: Route, date: string): Promise<Bus[]> { await new Promise((resolve) => setTimeout(resolve, 150)); const seed = date.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4; return (route === 'nagar-pune' ? outbound : inbound).map((bus, index) => ({ ...bus, seatsLeft: Math.max(0, bus.seatsLeft - ((seed + index) % 3)) })) }
export function getBusStatus(bus: Bus, now = '04:40'): BusStatus { if (bus.seatsLeft === 0) return 'sold-out'; if (now >= `${bus.departure.slice(0, 2)}:${String(Number(bus.departure.slice(3)) - 60).padStart(2, '0')}`) return 'closed'; if (bus.seatsLeft <= 10) return 'almost-full'; return 'available' }
