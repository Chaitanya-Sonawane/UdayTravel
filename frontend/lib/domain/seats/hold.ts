import { createHmac, timingSafeEqual } from 'node:crypto'
import { AppError, ErrorCodes } from '../../errors/app-error'
import { SeatsRepository } from '../../data/seats.repo'
import { AvailabilityRepository } from '../../data/availability.repo'
import { getRoute, RouteId } from '../../config/routes'
import { BASE_FARE_INR, HOLD_TTL_MS, SEATS_PER_BUS } from '../../config/rules'
import { rupeesToPaise, computeBookingTotal } from '../../money'
import { holdSeatInRtdb } from '../../firebase/rtdb'

function getHoldSecret(): string {
  const secret = process.env.HOLD_SIGNING_SECRET
  if (!secret) {
    throw new Error('HOLD_SIGNING_SECRET environment variable is missing')
  }
  return secret
}

export function signHoldToken(
  grp: string,
  uid: string,
  seatIds: string[],
  expiresAt: number
): string {
  const secret = getHoldSecret()
  const payload = `${grp}:${uid}:${[...seatIds].sort().join(',')}:${expiresAt}`
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function verifyHoldToken(
  token: string,
  grp: string,
  uid: string,
  seatIds: string[],
  expiresAt: number
): boolean {
  try {
    const secret = getHoldSecret()
    const payload = `${grp}:${uid}:${[...seatIds].sort().join(',')}:${expiresAt}`
    const expected = createHmac('sha256', secret).update(payload).digest('hex')

    // Handle both raw hex tokens and legacy expiresAt.hex tokens
    const actualSig = token.includes('.') ? token.split('.').slice(1).join('.') : token
    const bufA = Buffer.from(actualSig, 'hex')
    const bufB = Buffer.from(expected, 'hex')
    if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
      return true
    }

    // Allow slight sub-second execution clock difference between grp and expiresAt creation (up to 5ms)
    for (let delta = -5; delta <= 5; delta++) {
      if (delta === 0) continue
      const altPayload = `${grp}:${uid}:${[...seatIds].sort().join(',')}:${expiresAt + delta}`
      const altExpected = createHmac('sha256', secret).update(altPayload).digest('hex')
      const bufAlt = Buffer.from(altExpected, 'hex')
      if (bufA.length === bufAlt.length && timingSafeEqual(bufA, bufAlt)) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

export interface PlaceSeatHoldParams {
  uid: string
  routeId: RouteId
  date: string
  tripId: string
  seatIds?: string[]
  family?: boolean
  acceptAdjacent?: boolean
  deviceId?: string
  passengers?: Array<{ seatId: string; gender: 'F' | 'M'; age: number }>
}

export interface PlaceSeatHoldResult {
  grp: string
  holdToken: string
  holdExpiresAt: number
  seatIds: string[]
  perSeatPaise: number
  totalPaise: number
  busName: string
  freshPublicMap?: any
}

export async function placeSeatHold(params: PlaceSeatHoldParams): Promise<PlaceSeatHoldResult> {
  const { uid, routeId, date, tripId, family, acceptAdjacent, deviceId } = params

  const seatIds =
    params.seatIds ||
    (params.passengers ? params.passengers.map((p) => p.seatId) : [])

  if (!seatIds || seatIds.length === 0 || seatIds.length > 6) {
    throw new AppError(
      ErrorCodes.INVALID_INPUT,
      'Must select between 1 and 6 seats for a booking hold'
    )
  }

  const routeConfig = getRoute(routeId)
  if (!routeConfig) {
    throw new AppError(ErrorCodes.INVALID_INPUT, `Route '${routeId}' is not supported`)
  }

  // Fetch availability to determine fare and bus name
  const availDoc = await AvailabilityRepository.getAvailabilityDoc(routeId, date)
  let fareRupees = BASE_FARE_INR
  let busName = 'Uday Express'

  if (availDoc?.trips?.[tripId]) {
    const tr = availDoc.trips[tripId]
    if (tr.fare) fareRupees = tr.fare
    if (tr.busName) busName = tr.busName
  } else if (availDoc?.customTrips && Array.isArray(availDoc.customTrips)) {
    const ct = availDoc.customTrips.find((t) => t.tripId === tripId)
    if (ct) {
      if (ct.fare) fareRupees = ct.fare
      if (ct.busName) busName = ct.busName
    }
  }

  const perSeatPaise = rupeesToPaise(fareRupees)
  const totalPaise = computeBookingTotal(perSeatPaise, seatIds.length)

  const now = Date.now()
  const grp = `hold_${now}_${Math.random().toString(36).substring(2, 8)}`
  const holdExpiresAt = now + (HOLD_TTL_MS || 300000)

  // Place atomic hold in bus_seats repository with gender rule evaluation
  const holdResult = await SeatsRepository.placeHold(
    tripId,
    date,
    seatIds,
    uid,
    grp,
    holdExpiresAt,
    {
      passengers: params.passengers,
      family,
      acceptAdjacent,
      deviceId,
    }
  )

  // Mirror hold to Realtime Database non-blocking (so HTTP response returns immediately without hanging)
  try {
    Promise.all(
      seatIds.map((seatId) =>
        holdSeatInRtdb({
          tripId,
          seatId,
          userId: uid,
          holdTtlMs: HOLD_TTL_MS || 300000,
        })
      )
    ).catch((rtdbErr) => {
      console.warn('[placeSeatHold] Non-blocking RTDB mirror warning:', rtdbErr)
    })
  } catch (rtdbErr) {
    console.warn('[placeSeatHold] Non-blocking RTDB mirror warning:', rtdbErr)
  }

  const holdToken = signHoldToken(grp, uid, seatIds, holdExpiresAt)

  return {
    grp,
    holdToken,
    holdExpiresAt,
    seatIds,
    perSeatPaise,
    totalPaise,
    busName,
    freshPublicMap: holdResult?.freshPublicMap,
  }
}
