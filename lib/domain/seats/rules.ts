import {
  T_ADJACENT_MS,
  FULLNESS_ADJACENT,
  T_OPEN_MS,
  FAMILY_MAX,
  FAMILY_MIN_ADULT_AGE,
  CHILD_MAX_AGE,
  SEATS_TOTAL,
} from '../../config/seat-rules'

export type Gender = 'F' | 'M'

export interface Pax {
  seatId: string
  gender: Gender
  age: number
}

export type ErrorCode =
  | 'SEAT_UNAVAILABLE'
  | 'SEAT_GENDER_ZONE'
  | 'ADJACENT_CONSENT_REQUIRED'
  | 'FAMILY_INVALID'

export interface SeatState {
  state: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'BLOCKED'
  gender?: Gender
  fam?: string
  holdExpiresAt?: number
  level?: 0 | 1 | 2
}

export interface Prefs {
  seatType?: 'window' | 'aisle' | 'any'
  area?: 'front' | 'middle' | 'rear' | 'any'
}

export interface Suggestion {
  seatIds: string[]
  score: number
  reason: 'NEXT_TO_SAME_GENDER' | 'SAME_ZONE' | 'FRESH_ZONE' | 'FAMILY_BLOCK'
}

export const ALL_SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const
export const ALL_SEAT_COLS = [1, 2, 3, 4, 5] as const

export const ALL_SEAT_IDS: string[] = ALL_SEAT_ROWS.flatMap((r) =>
  ALL_SEAT_COLS.map((c) => `${r}${c}`)
)

/**
 * Normalizes input from either bus_seats.seats or seat_public doc into Record<string, SeatState>.
 */
export function normalizeSeats(
  input?:
    | Record<string, any>
    | {
        taken?: Record<string, Gender>
        held?: Record<string, { gender: Gender; expiresAt: number }>
        blocked?: string[]
      }
): Record<string, SeatState> {
  if (!input) return {}
  if ('taken' in input || 'held' in input || 'blocked' in input) {
    const res: Record<string, SeatState> = {}
    if (input.taken) {
      for (const [s, g] of Object.entries(input.taken)) {
        res[s] = { state: 'CONFIRMED', gender: g as Gender }
      }
    }
    if (input.held) {
      for (const [s, h] of Object.entries(
        input.held as Record<string, { gender: Gender; expiresAt: number }>
      )) {
        res[s] = { state: 'HELD', gender: h.gender, holdExpiresAt: h.expiresAt }
      }
    }
    if (Array.isArray(input.blocked)) {
      for (const s of input.blocked) {
        res[s] = { state: 'BLOCKED' }
      }
    }
    return res
  }
  return input as Record<string, SeatState>
}

/**
 * Returns zone ID: <row>-L (seats 1, 2) or <row>-R (seats 3, 4, 5).
 */
export function zoneOf(seatId: string): string {
  const row = seatId.charAt(0)
  const col = seatId.slice(1)
  if (col === '1' || col === '2') {
    return `${row}-L`
  }
  return `${row}-R`
}

/**
 * Returns seats in a given zone.
 */
export function seatsInZone(zoneId: string): string[] {
  const [row, side] = zoneId.split('-')
  if (side === 'L') {
    return [`${row}1`, `${row}2`]
  }
  return [`${row}3`, `${row}4`, `${row}5`]
}

/**
 * Returns directly adjacent neighbours:
 * In Left zone: 1 <-> 2
 * In Right zone: 3 <-> 4 <-> 5 (3 and 5 are not directly adjacent)
 */
export function neighbours(seatId: string): string[] {
  const row = seatId.charAt(0)
  const col = seatId.slice(1)
  switch (col) {
    case '1':
      return [`${row}2`]
    case '2':
      return [`${row}1`]
    case '3':
      return [`${row}4`]
    case '4':
      return [`${row}3`, `${row}5`]
    case '5':
      return [`${row}4`]
    default:
      return []
  }
}

/**
 * Checks if a seat is currently free (not confirmed, not blocked, not held with active expiry).
 */
export function isSeatFree(entry: SeatState | undefined, now: number): boolean {
  if (!entry) return true
  if (entry.state === 'AVAILABLE') return true
  if (entry.state === 'HELD') {
    return typeof entry.holdExpiresAt === 'number' && entry.holdExpiresAt <= now
  }
  return false
}

/**
 * Checks if a seat is an active occupant with a known gender.
 * Blocked seats are ignored.
 */
export function getActiveSeatGender(entry: SeatState | undefined, now: number): Gender | null {
  if (!entry) return null
  if (entry.state === 'BLOCKED') return null
  if (entry.state === 'CONFIRMED' && entry.gender) {
    return entry.gender
  }
  if (
    entry.state === 'HELD' &&
    entry.gender &&
    (!entry.holdExpiresAt || entry.holdExpiresAt > now)
  ) {
    return entry.gender
  }
  return null
}

/**
 * Computes the zone gender dynamically:
 * Any woman present => 'F'
 * Else any man present => 'M'
 * Else => null (open zone)
 */
export function zoneGender(
  seats: Record<string, SeatState>,
  zoneId: string,
  now: number
): Gender | null {
  const normalized = normalizeSeats(seats)
  const seatsList = seatsInZone(zoneId)
  let hasF = false
  let hasM = false

  for (const s of seatsList) {
    const g = getActiveSeatGender(normalized[s], now)
    if (g === 'F') hasF = true
    if (g === 'M') hasM = true
  }

  if (hasF) return 'F'
  if (hasM) return 'M'
  return null
}

/**
 * Counts total taken seats (CONFIRMED, BLOCKED, or actively HELD).
 */
export function countTakenSeats(seats: Record<string, SeatState>, now: number): number {
  const normalized = normalizeSeats(seats)
  let count = 0
  for (const s of ALL_SEAT_IDS) {
    if (!isSeatFree(normalized[s], now)) {
      count++
    }
  }
  return count
}

/**
 * Evaluates seat level:
 * When standard seat rules are applied, any free seat is level 0 (open for any passenger).
 * Occupied or blocked seats return null.
 */
export function levelFor(
  seats: Record<string, SeatState>,
  seatId: string,
  _gender?: Gender,
  now: number = Date.now(),
  _departureAt?: number
): 0 | 1 | 2 | 'OPEN' | null {
  const normalized = normalizeSeats(seats)
  const entry = normalized[seatId]

  if (!isSeatFree(entry, now)) {
    return null
  }

  return 0
}

/**
 * Returns the lowest available level on the coach (0 for open seating).
 */
export function lowestAvailableLevel(
  _seats?: Record<string, SeatState>,
  _gender?: Gender,
  _now?: number,
  _departureAt?: number
): 0 | 1 | 2 | 'OPEN' {
  return 0
}

/**
 * Validates a seat booking request:
 * Verifies valid seat IDs, uniqueness, and that all requested seats are currently free.
 * Free seats are available to all passengers without gender or adjacent restrictions.
 */
export function evaluate(
  seats: Record<string, SeatState>,
  req: { family?: boolean; acceptAdjacent?: boolean; pax: Pax[] },
  now: number,
  _departureAt?: number
): { ok: true; levels: Record<string, 0 | 1 | 2 | 'OPEN'> } | { ok: false; code: ErrorCode; seatId?: string } {
  const normalized = normalizeSeats(seats)

  if (!req.pax || req.pax.length === 0 || req.pax.length > FAMILY_MAX) {
    return { ok: false, code: 'FAMILY_INVALID' }
  }

  // Unique seat selection check and valid seat ID check
  const seatIdSet = new Set<string>()
  for (const p of req.pax) {
    if (!ALL_SEAT_IDS.includes(p.seatId)) {
      return { ok: false, code: 'SEAT_UNAVAILABLE', seatId: p.seatId }
    }
    if (seatIdSet.has(p.seatId)) {
      return { ok: false, code: 'SEAT_UNAVAILABLE', seatId: p.seatId }
    }
    seatIdSet.add(p.seatId)
  }

  // Ensure all requested seats are currently free
  for (const p of req.pax) {
    if (!isSeatFree(normalized[p.seatId], now)) {
      return { ok: false, code: 'SEAT_UNAVAILABLE', seatId: p.seatId }
    }
  }

  // All requested seats are free: booking is completely permitted
  const levels: Record<string, 0 | 1 | 2 | 'OPEN'> = {}
  for (const p of req.pax) {
    levels[p.seatId] = 0
  }

  return { ok: true, levels }
}

function getSeatCol(seatId: string): number {
  return parseInt(seatId.slice(1), 10)
}

function getSeatRow(seatId: string): string {
  return seatId.charAt(0)
}

function matchesSeatType(seatId: string, pref?: 'window' | 'aisle' | 'any'): boolean {
  if (!pref || pref === 'any') return true
  const col = getSeatCol(seatId)
  if (pref === 'window') return col === 1 || col === 5
  if (pref === 'aisle') return col === 2 || col === 3
  return false
}

function matchesArea(seatId: string, pref?: 'front' | 'middle' | 'rear' | 'any'): boolean {
  if (!pref || pref === 'any') return true
  const row = getSeatRow(seatId)
  if (pref === 'front') return ['A', 'B', 'C'].includes(row)
  if (pref === 'middle') return ['D', 'E', 'F', 'G'].includes(row)
  if (pref === 'rear') return ['H', 'I', 'J'].includes(row)
  return false
}

/**
 * Suggests up to 3 seat blocks for the group, best first.
 */
export function suggestSeats(
  seats: Record<string, SeatState>,
  group: {
    family: boolean
    pax: { gender: Gender; age: number; prefs?: Prefs }[]
  },
  now: number,
  departureAt: number
): Suggestion[] {
  const normalized = normalizeSeats(seats)
  const nPax = group.pax.length
  if (nPax === 0 || nPax > FAMILY_MAX) return []

  const suggestions: Suggestion[] = []
  const seenCombos = new Set<string>()

  // Helper to add suggestion if valid under evaluate()
  const tryAddSuggestion = (
    seatIds: string[],
    baseScore: number,
    reason: Suggestion['reason']
  ) => {
    if (seatIds.length !== nPax) return
    const key = [...seatIds].sort().join(',')
    if (seenCombos.has(key)) return

    const evalPax: Pax[] = group.pax.map((p, idx) => ({
      seatId: seatIds[idx] || '',
      gender: p.gender,
      age: p.age,
    }))

    const evalRes = evaluate(
      normalized,
      { family: group.family, acceptAdjacent: true, pax: evalPax },
      now,
      departureAt
    )

    if (!evalRes.ok) return

    // Calculate tie-breaker bonus from preferences
    let prefScore = 0
    for (let i = 0; i < nPax; i++) {
      const p = group.pax[i]
      const sId = seatIds[i]
      if (p && sId) {
        if (matchesSeatType(sId, p.prefs?.seatType)) prefScore += 10
        if (matchesArea(sId, p.prefs?.area)) prefScore += 5
      }
    }

    seenCombos.add(key)
    suggestions.push({
      seatIds,
      score: baseScore + prefScore,
      reason,
    })
  }

  // 1. Group Blocks (1..6 pax contiguous seats)
  if (nPax === 1) {
    for (const seatId of ALL_SEAT_IDS) {
      if (isSeatFree(normalized[seatId], now)) {
        tryAddSuggestion([seatId], 200, 'FRESH_ZONE')
      }
    }
  } else if (nPax === 2) {
    // 2-seat side (rows A-J, left side: 1, 2)
    for (const row of ALL_SEAT_ROWS) {
      const s1 = `${row}1`
      const s2 = `${row}2`
      if (isSeatFree(normalized[s1], now) && isSeatFree(normalized[s2], now)) {
        tryAddSuggestion([s1, s2], 400, 'FAMILY_BLOCK')
      }
      const s3 = `${row}3`
      const s4 = `${row}4`
      if (isSeatFree(normalized[s3], now) && isSeatFree(normalized[s4], now)) {
        tryAddSuggestion([s3, s4], 380, 'FAMILY_BLOCK')
      }
      const s5 = `${row}5`
      if (isSeatFree(normalized[s4], now) && isSeatFree(normalized[s5], now)) {
        tryAddSuggestion([s4, s5], 380, 'FAMILY_BLOCK')
      }
    }
  } else if (nPax === 3) {
    // 3-seat side (rows A-J, right side: 3, 4, 5)
    for (const row of ALL_SEAT_ROWS) {
      const s3 = `${row}3`
      const s4 = `${row}4`
      const s5 = `${row}5`
      if (
        isSeatFree(normalized[s3], now) &&
        isSeatFree(normalized[s4], now) &&
        isSeatFree(normalized[s5], now)
      ) {
        tryAddSuggestion([s3, s4, s5], 400, 'FAMILY_BLOCK')
      }
    }
  } else if (nPax === 4) {
    // Two 2-seat sides in nearby rows
    for (let i = 0; i < ALL_SEAT_ROWS.length - 1; i++) {
      const r1 = ALL_SEAT_ROWS[i]
      const r2 = ALL_SEAT_ROWS[i + 1]
      const seats4 = [`${r1}1`, `${r1}2`, `${r2}1`, `${r2}2`]
      if (seats4.every((s) => isSeatFree(normalized[s], now))) {
        tryAddSuggestion(seats4, 400, 'FAMILY_BLOCK')
      }
    }
  } else if (nPax === 5) {
    // Whole row of 5 seats
    for (const row of ALL_SEAT_ROWS) {
      const seats5 = [`${row}1`, `${row}2`, `${row}3`, `${row}4`, `${row}5`]
      if (seats5.every((s) => isSeatFree(normalized[s], now))) {
        tryAddSuggestion(seats5, 400, 'FAMILY_BLOCK')
      }
    }
  } else if (nPax === 6) {
    // Two 3-seat sides in nearby rows
    for (let i = 0; i < ALL_SEAT_ROWS.length - 1; i++) {
      const r1 = ALL_SEAT_ROWS[i]
      const r2 = ALL_SEAT_ROWS[i + 1]
      const seats6 = [`${r1}3`, `${r1}4`, `${r1}5`, `${r2}3`, `${r2}4`, `${r2}5`]
      if (seats6.every((s) => isSeatFree(normalized[s], now))) {
        tryAddSuggestion(seats6, 400, 'FAMILY_BLOCK')
      }
    }
  }

  // Fallback: any free seats
  if (suggestions.length === 0) {
    const allFree = ALL_SEAT_IDS.filter((s) => isSeatFree(normalized[s], now))
    if (allFree.length >= nPax) {
      tryAddSuggestion(allFree.slice(0, nPax), 100, 'FRESH_ZONE')
    }
  }

  // Sort descending by score
  suggestions.sort((a, b) => b.score - a.score)
  return suggestions.slice(0, 3)
}
