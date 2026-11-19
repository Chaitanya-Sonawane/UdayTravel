export type RouteId = 'AHM_PUN' | 'PUN_AHM'

export interface RouteConfig {
  id: RouteId
  name: string
  origin: string
  destination: string
  departures: readonly string[]
  durationMin: number
  cancellation: string
  boardingPoints: readonly string[]
  dropPoints: readonly string[]
}

export interface TripConfig {
  tripId: string
  routeId: RouteId
  departureTime: string // HH:mm format, e.g. "06:00"
  durationMin: number
}

export const ROUTES: Record<RouteId, RouteConfig> = {
  AHM_PUN: {
    id: 'AHM_PUN',
    name: 'Ahilyanagar -> Pune',
    origin: 'Ahilyanagar',
    destination: 'Pune',
    departures: ['05:30', '06:00', '09:30', '14:00'] as const,
    durationMin: 165,
    cancellation: 'until 20:00 the day before travel',
    boardingPoints: ['Office · 6:30 AM'],
    dropPoints: ['Shivajinagar, Pune'],
  },
  PUN_AHM: {
    id: 'PUN_AHM',
    name: 'Pune -> Ahilyanagar',
    origin: 'Pune',
    destination: 'Ahilyanagar',
    departures: ['06:30', '10:00', '13:30', '17:00'] as const,
    durationMin: 165,
    cancellation: 'not on travel day (cancel before it)',
    // TODO_CONFIRM: Boarding and drop points for Pune -> Ahilyanagar route pending client confirmation
    boardingPoints: [],
    // TODO_CONFIRM: Drop points for Pune -> Ahilyanagar route pending client confirmation
    dropPoints: [],
  },
} as const

export function getRoute(routeId: string): RouteConfig | undefined {
  if (routeId in ROUTES) {
    return ROUTES[routeId as RouteId]
  }
  return undefined
}

export function listTrips(routeId: string): TripConfig[] {
  const route = getRoute(routeId)
  if (!route) return []

  return route.departures.map((departureTime) => {
    const hhmm = departureTime.replace(':', '')
    const tripId = `${route.id}_${hhmm}`
    return {
      tripId,
      routeId: route.id,
      departureTime,
      durationMin: route.durationMin,
    }
  })
}

export function parseTripId(tripId: string): { routeId: RouteId; departureTime: string; hhmm: string } | null {
  const match = tripId.match(/^(AHM_PUN|PUN_AHM)_(\d{2})(\d{2})$/)
  if (!match) return null

  const [, routeId, hh, mm] = match
  if (!routeId || !hh || !mm) return null

  return {
    routeId: routeId as RouteId,
    departureTime: `${hh}:${mm}`,
    hhmm: `${hh}${mm}`,
  }
}
