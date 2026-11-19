export interface BusDocument {
  id: string
  busNumber: string
  busName: string
  templateId?: 'BUS_55' | 'BUS_44' | 'BUS_33'
  seatLayout: string
  totalSeats: number
  active: boolean
  features: string[]
  driverName?: string
  driverMobile?: string
  createdAt: string
  updatedAt: string
}

export const DEFAULT_BUSES: BusDocument[] = [
  {
    id: 'bus_mh16dp4951',
    busNumber: 'MH 16 DP 4951',
    busName: 'Uday Express 55-Seater (2+3 Layout)',
    templateId: 'BUS_55',
    seatLayout: '2+3 Seater',
    totalSeats: 55,
    active: true,
    features: ['AC', 'Reading Light', 'Charging Point', 'Emergency Exit', 'Luggage Compartment'],
    driverName: 'Suresh Patil',
    driverMobile: '+91 98220 12345',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bus_mh16dv1003',
    busNumber: 'MH 16 DV 1003',
    busName: 'Uday Express 44-Seater (2+2 Layout)',
    templateId: 'BUS_44',
    seatLayout: '2+2 Seater',
    totalSeats: 44,
    active: true,
    features: ['AC', 'Reclining Push-Back Seats', 'USB Charging', 'Emergency Exit'],
    driverName: 'Ganesh More',
    driverMobile: '+91 98220 67890',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bus_mh16dp3951',
    busNumber: 'MH 16 DP 3951',
    busName: 'Uday Express 33-Seater (2+2 Layout)',
    templateId: 'BUS_33',
    seatLayout: '2+2 Seater',
    totalSeats: 33,
    active: true,
    features: ['Air Suspension', 'Push-Back Seats', 'Fast Charging', 'Luggage Boot'],
    driverName: 'Santosh Kadam',
    driverMobile: '+91 98220 54321',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
