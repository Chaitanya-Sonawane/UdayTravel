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
        if (h && typeof h === 'object') {
          res[s] = { state: 'HELD', gender: h.gender, holdExpiresAt: h.expiresAt }
        }
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
  if (seatId === '1') return 'FRONT-L'
  if (seatId === '2' || seatId === '3' || seatId === '4') return 'FRONT-R'
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
  if (zoneId === 'FRONT-L') return ['1']
  if (zoneId === 'FRONT-R') return ['2', '3', '4']
  const [row, side] = zoneId.split('-')
  if (side === 'L') {
    return [`${row}1`, `${row}2`]
  }
  return [`${row}3`, `${row}4`, `${row}5`]
}

/**
 * Checks whether a seat is on the 3-seat side (columns 3, 4, 5 in 2+3 layout).
 */
export function isThreeSeatSide(seatId: string): boolean {
  if (seatId === '2' || seatId === '3' || seatId === '4') return true
  const col = seatId.slice(1)
  return col === '3' || col === '4' || col === '5'
}

/**
 * Returns all three seats belonging to the same 3-seat bench in a row (e.g. ['A3', 'A4', 'A5']).
 */
export function threeSeatBenchOf(seatId: string): string[] {
  if (seatId === '2' || seatId === '3' || seatId === '4') return ['2', '3', '4']
  const row = seatId.charAt(0)
  return [`${row}3`, `${row}4`, `${row}5`]
}

/**
 * Returns directly adjacent neighbours:
 * In Left zone: 1 <-> 2
 * In Right zone: 3 <-> 4 <-> 5 (3 and 5 are not directly adjacent)
 */
export function neighbours(seatId: string): string[] {
  if (seatId === '1') return []
  if (seatId === '2') return ['3']
  if (seatId === '3') return ['2', '4']
  if (seatId === '4') return ['3']
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
  const rawGender = (entry as any).gender
  if (entry.state === 'CONFIRMED' && rawGender) {
    return rawGender === 'F' || rawGender === 'female' || rawGender === 'woman' ? 'F' : 'M'
  }
  if (
    entry.state === 'HELD' &&
    rawGender &&
    (!entry.holdExpiresAt || entry.holdExpiresAt > now)
  ) {
    return rawGender === 'F' || rawGender === 'female' || rawGender === 'woman' ? 'F' : 'M'
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
 * Free seats return 0 (open).
 * If a gender is passed, returns null if an adjacent seat is occupied by the opposite gender.
 * Occupied or blocked seats return null.
 */
export function levelFor(
  seats: Record<string, SeatState>,
  seatId: string,
  gender?: Gender,
  now: number = Date.now(),
  _departureAt?: number
): 0 | 1 | 2 | 'OPEN' | null {
  const normalized = normalizeSeats(seats)
  const entry = normalized[seatId]

  if (!isSeatFree(entry, now)) {
    return null
  }

  if (gender) {
    const adjSeats = neighbours(seatId)
    for (const adj of adjSeats) {
      const adjGender = getActiveSeatGender(normalized[adj], now)
      if (adjGender && adjGender !== gender) {
        return null // Opposite gender neighbour: not allowed
      }
    }

    // 3-Seat Bench Gender Rule: For the 3-seat block (seats 3, 4, 5 in any row):
    // If one seat is for female, other 2 seats can ONLY be female (and vice versa for male).
    if (isThreeSeatSide(seatId)) {
      const benchSeats = threeSeatBenchOf(seatId)
      for (const bSeat of benchSeats) {
        if (bSeat !== seatId) {
          const bGender = getActiveSeatGender(normalized[bSeat], now)
          if (bGender && bGender !== gender) {
            return null // Opposite gender on the same 3-seat bench: not allowed
          }
        }
      }
    }
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
 * 1. Verifies valid seat IDs and uniqueness.
 * 2. Ensures all requested seats are currently free.
 * 3. Enforces that male and female passengers can NEVER be neighbours:
 *    - An adjacent seat cannot be booked by the opposite gender on the bus.
 *    - Co-passengers in the same request cannot be assigned adjacent seats of opposite gender.
 * 4. Enforces 3-Seat Bench Rule (seats 3, 4, 5):
 *    - If any seat in a 3-seat bench is female/male, all other seats must be same gender.
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

  // Enforce Gender Rule: Male and Female must NEVER be neighbours
  for (const p of req.pax) {
    const pGender: Gender = p.gender === 'F' ? 'F' : 'M'
    const adjSeats = neighbours(p.seatId)

    for (const adj of adjSeats) {
      // 1. Check existing confirmed or held seat on the bus
      const existingAdjGender = getActiveSeatGender(normalized[adj], now)
      if (existingAdjGender && existingAdjGender !== pGender) {
        return {
          ok: false,
          code: 'SEAT_GENDER_ZONE',
          seatId: p.seatId,
        }
      }

      // 2. Check other passengers in the same booking request
      // When travelling with family (req.family) or consent is given (req.acceptAdjacent),
      // male and female members of the same account/booking CAN sit adjacent to each other.
      // Gender separation is strictly enforced between unrelated strangers on the bus.
      if (!req.family && !req.acceptAdjacent) {
        const coPax = req.pax.find((other) => other.seatId === adj && other !== p)
        if (coPax) {
          const coGender: Gender = coPax.gender === 'F' ? 'F' : 'M'
          if (coGender !== pGender) {
            return {
              ok: false,
              code: 'SEAT_GENDER_ZONE',
              seatId: p.seatId,
            }
          }
        }
      }
    }

    // 3-Seat Bench Rule: On the 3-seat side (3, 4, 5), if one seat is for male/female,
    // the other 2 seats must be of the same gender.
    if (isThreeSeatSide(p.seatId)) {
      const benchSeats = threeSeatBenchOf(p.seatId)
      for (const bSeat of benchSeats) {
        if (bSeat !== p.seatId) {
          // Check existing occupants on bus
          const existingBenchGender = getActiveSeatGender(normalized[bSeat], now)
          if (existingBenchGender && existingBenchGender !== pGender) {
            return {
              ok: false,
              code: 'SEAT_GENDER_ZONE',
              seatId: p.seatId,
            }
          }

          // Check co-passengers in request (unless family mode allows mixed bench)
          if (!req.family && !req.acceptAdjacent) {
            const coPax = req.pax.find((other) => other.seatId === bSeat && other !== p)
            if (coPax) {
              const coGender: Gender = coPax.gender === 'F' ? 'F' : 'M'
              if (coGender !== pGender) {
                return {
                  ok: false,
                  code: 'SEAT_GENDER_ZONE',
                  seatId: p.seatId,
                }
              }
            }
          }
        }
      }
    }
  }

  // All requested seats are free and pass gender adjacency rules
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
 * Enforces:
 * 1. Female and Male passengers can NEVER be neighbours (even in companion suggestions).
 * 2. In 3-seat bench (seats 3, 4, 5), all seats must be of the same gender (no gender mixing in 3-seat bench).
 * 3. Returns up to 3 strictly valid suggestions.
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

  // Helper to add suggestion if valid under evaluate() and gender rules
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

    // 1. Strict Gender Separation in Suggestions:
    // A male and female passenger must NEVER be neighbours (adjacent).
    for (const p of evalPax) {
      const pGender: Gender = p.gender === 'F' ? 'F' : 'M'
      const adjSeats = neighbours(p.seatId)
      for (const adj of adjSeats) {
        // Bus check
        const busG = getActiveSeatGender(normalized[adj], now)
        if (busG && busG !== pGender) return

        // Companion check: companions in suggestion cannot be mixed-gender neighbours
        const coPax = evalPax.find((o) => o.seatId === adj)
        if (coPax) {
          const coG: Gender = coPax.gender === 'F' ? 'F' : 'M'
          if (coG !== pGender) return
        }
      }

      // 2. Strict 3-Seat Bench Gender Rule:
      // "for the 3 seats if one seat is for male or female then the other 2 will be also for female/male"
      if (isThreeSeatSide(p.seatId)) {
        const bench = threeSeatBenchOf(p.seatId)
        for (const bSeat of bench) {
          if (bSeat !== p.seatId) {
            // Bus check
            const busBG = getActiveSeatGender(normalized[bSeat], now)
            if (busBG && busBG !== pGender) return

            // Companion check: 3-seat bench can never have mixed genders
            const coPax = evalPax.find((o) => o.seatId === bSeat)
            if (coPax) {
              const coG: Gender = coPax.gender === 'F' ? 'F' : 'M'
              if (coG !== pGender) return
            }
          }
        }
      }
    }

    // Pass evaluate with strict non-adjacent check
    const evalRes = evaluate(
      normalized,
      { family: false, acceptAdjacent: false, pax: evalPax },
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

  // Identify group gender composition
  const isMixedGender =
    group.pax.some((p) => p.gender === 'M') && group.pax.some((p) => p.gender === 'F')

  // 1. Single Passenger
  if (nPax === 1) {
    const singleGender = group.pax[0]?.gender || 'F'
    for (const seatId of ALL_SEAT_IDS) {
      if (levelFor(normalized, seatId, singleGender, now, departureAt) === 0) {
        // Bonus if next to same gender
        const adj = neighbours(seatId)
        const hasSameGenderNeighbour = adj.some(
          (s) => getActiveSeatGender(normalized[s], now) === singleGender
        )
        tryAddSuggestion(
          [seatId],
          hasSameGenderNeighbour ? 250 : 200,
          hasSameGenderNeighbour ? 'NEXT_TO_SAME_GENDER' : 'FRESH_ZONE'
        )
      }
    }
  }

  // 2. Two Passengers
  else if (nPax === 2) {
    if (isMixedGender) {
      // Mixed gender (Male + Female):
      // Recommendation 1: Across the central aisle (seat 2 and seat 3)
      for (const row of ALL_SEAT_ROWS) {
        const s2 = `${row}2`
        const s3 = `${row}3`
        if (isSeatFree(normalized[s2], now) && isSeatFree(normalized[s3], now)) {
          // Permutation 1
          tryAddSuggestion([s2, s3], 450, 'FAMILY_BLOCK')
          // Permutation 2
          tryAddSuggestion([s3, s2], 450, 'FAMILY_BLOCK')
        }
      }

      // Recommendation 2: Consecutive rows in front/back (same column)
      for (let i = 0; i < ALL_SEAT_ROWS.length - 1; i++) {
        const r1 = ALL_SEAT_ROWS[i]
        const r2 = ALL_SEAT_ROWS[i + 1]
        // Left window
        tryAddSuggestion([`${r1}1`, `${r2}1`], 410, 'FAMILY_BLOCK')
        // Left aisle
        tryAddSuggestion([`${r1}2`, `${r2}2`], 400, 'FAMILY_BLOCK')
        // Right aisle
        tryAddSuggestion([`${r1}3`, `${r2}3`], 390, 'FAMILY_BLOCK')
        // Right window
        tryAddSuggestion([`${r1}5`, `${r2}5`], 380, 'FAMILY_BLOCK')
      }
    } else {
      // Same gender (both M or both F):
      for (const row of ALL_SEAT_ROWS) {
        // 2-seat side (rows A-J, left side: 1, 2)
        const s1 = `${row}1`
        const s2 = `${row}2`
        if (isSeatFree(normalized[s1], now) && isSeatFree(normalized[s2], now)) {
          tryAddSuggestion([s1, s2], 450, 'FAMILY_BLOCK')
        }
        // 3-seat side pairs (3-4, 4-5)
        const s3 = `${row}3`
        const s4 = `${row}4`
        if (isSeatFree(normalized[s3], now) && isSeatFree(normalized[s4], now)) {
          tryAddSuggestion([s3, s4], 420, 'FAMILY_BLOCK')
        }
        const s5 = `${row}5`
        if (isSeatFree(normalized[s4], now) && isSeatFree(normalized[s5], now)) {
          tryAddSuggestion([s4, s5], 420, 'FAMILY_BLOCK')
        }
        // Across the central aisle
        if (isSeatFree(normalized[s2], now) && isSeatFree(normalized[s3], now)) {
          tryAddSuggestion([s2, s3], 380, 'FAMILY_BLOCK')
        }
      }
    }
  }

  // 3. Three Passengers
  else if (nPax === 3) {
    if (!isMixedGender) {
      // All 3 same gender: 3-seat side is perfect
      for (const row of ALL_SEAT_ROWS) {
        const s3 = `${row}3`
        const s4 = `${row}4`
        const s5 = `${row}5`
        if (
          isSeatFree(normalized[s3], now) &&
          isSeatFree(normalized[s4], now) &&
          isSeatFree(normalized[s5], now)
        ) {
          tryAddSuggestion([s3, s4, s5], 450, 'FAMILY_BLOCK')
        }
        // 2-seat side + across aisle
        const s1 = `${row}1`
        const s2 = `${row}2`
        if (
          isSeatFree(normalized[s1], now) &&
          isSeatFree(normalized[s2], now) &&
          isSeatFree(normalized[s3], now)
        ) {
          tryAddSuggestion([s1, s2, s3], 420, 'FAMILY_BLOCK')
        }
      }
      // 2 in row 1, 1 in row 2
      for (let i = 0; i < ALL_SEAT_ROWS.length - 1; i++) {
        const r1 = ALL_SEAT_ROWS[i]
        const r2 = ALL_SEAT_ROWS[i + 1]
        tryAddSuggestion([`${r1}1`, `${r1}2`, `${r2}1`], 400, 'FAMILY_BLOCK')
        tryAddSuggestion([`${r1}1`, `${r1}2`, `${r2}2`], 390, 'FAMILY_BLOCK')
      }
    } else {
      // Mixed gender: NEVER put in same 3-seat bench!
      // Strategy: 2 of majority gender in 2-seat side (s1, s2), 1 of minority gender across central aisle in s3
      const fIndices = group.pax.map((p, idx) => (p.gender === 'F' ? idx : -1)).filter((idx) => idx !== -1)
      const mIndices = group.pax.map((p, idx) => (p.gender === 'M' ? idx : -1)).filter((idx) => idx !== -1)

      const pairIndices = fIndices.length === 2 ? fIndices : mIndices
      const soloIndex = fIndices.length === 1 ? fIndices[0]! : mIndices[0]!

      for (const row of ALL_SEAT_ROWS) {
        const s1 = `${row}1`
        const s2 = `${row}2`
        const s3 = `${row}3`
        if (
          isSeatFree(normalized[s1], now) &&
          isSeatFree(normalized[s2], now) &&
          isSeatFree(normalized[s3], now)
        ) {
          const candidate = new Array(3)
          candidate[pairIndices[0]!] = s1
          candidate[pairIndices[1]!] = s2
          candidate[soloIndex] = s3
          tryAddSuggestion(candidate, 450, 'FAMILY_BLOCK')
        }
      }

      // Consecutive rows: pair in row 1, solo in row 2
      for (let i = 0; i < ALL_SEAT_ROWS.length - 1; i++) {
        const r1 = ALL_SEAT_ROWS[i]
        const r2 = ALL_SEAT_ROWS[i + 1]
        const candA = new Array(3)
        candA[pairIndices[0]!] = `${r1}1`
        candA[pairIndices[1]!] = `${r1}2`
        candA[soloIndex] = `${r2}1`
        tryAddSuggestion(candA, 410, 'FAMILY_BLOCK')

        const candB = new Array(3)
        candB[pairIndices[0]!] = `${r1}1`
        candB[pairIndices[1]!] = `${r1}2`
        candB[soloIndex] = `${r2}2`
        tryAddSuggestion(candB, 400, 'FAMILY_BLOCK')
      }
    }
  }

  // 4. Four Passengers
  else if (nPax === 4) {
    for (let i = 0; i < ALL_SEAT_ROWS.length - 1; i++) {
      const r1 = ALL_SEAT_ROWS[i]
      const r2 = ALL_SEAT_ROWS[i + 1]
      const seats4 = [`${r1}1`, `${r1}2`, `${r2}1`, `${r2}2`]
      if (seats4.every((s) => isSeatFree(normalized[s], now))) {
        tryAddSuggestion(seats4, 400, 'FAMILY_BLOCK')
      }
      const aisle4 = [`${r1}2`, `${r1}3`, `${r2}2`, `${r2}3`]
      if (aisle4.every((s) => isSeatFree(normalized[s], now))) {
        tryAddSuggestion(aisle4, 390, 'FAMILY_BLOCK')
      }
    }
  }

  // 5. Five Passengers
  else if (nPax === 5) {
    if (!isMixedGender) {
      for (const row of ALL_SEAT_ROWS) {
        const seats5 = [`${row}1`, `${row}2`, `${row}3`, `${row}4`, `${row}5`]
        if (seats5.every((s) => isSeatFree(normalized[s], now))) {
          tryAddSuggestion(seats5, 400, 'FAMILY_BLOCK')
        }
      }
    }
    for (let i = 0; i < ALL_SEAT_ROWS.length - 1; i++) {
      const r1 = ALL_SEAT_ROWS[i]
      const r2 = ALL_SEAT_ROWS[i + 1]
      const seats5 = [`${r1}1`, `${r1}2`, `${r1}3`, `${r2}1`, `${r2}2`]
      if (seats5.every((s) => isSeatFree(normalized[s], now))) {
        tryAddSuggestion(seats5, 380, 'FAMILY_BLOCK')
      }
    }
  }

  // 6. Six Passengers
  else if (nPax === 6) {
    for (let i = 0; i < ALL_SEAT_ROWS.length - 2; i++) {
      const r1 = ALL_SEAT_ROWS[i]
      const r2 = ALL_SEAT_ROWS[i + 1]
      const r3 = ALL_SEAT_ROWS[i + 2]
      const seats6 = [`${r1}1`, `${r1}2`, `${r2}1`, `${r2}2`, `${r3}1`, `${r3}2`]
      if (seats6.every((s) => isSeatFree(normalized[s], now))) {
        tryAddSuggestion(seats6, 400, 'FAMILY_BLOCK')
      }
    }
  }

  // Fallback: any free seats that strictly satisfy rules
  if (suggestions.length < 3) {
    for (let i = 0; i < ALL_SEAT_ROWS.length && suggestions.length < 5; i++) {
      const r = ALL_SEAT_ROWS[i]
      const freeInRow = [1, 2, 3, 4, 5]
        .map((c) => `${r}${c}`)
        .filter((s) => isSeatFree(normalized[s], now))
      if (freeInRow.length >= nPax) {
        tryAddSuggestion(freeInRow.slice(0, nPax), 150, 'FRESH_ZONE')
      }
    }
  }

  // Sort descending by score
  suggestions.sort((a, b) => b.score - a.score)
  return suggestions.slice(0, 3)
}
