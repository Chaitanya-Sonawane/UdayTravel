import { z } from 'zod'

export const RouteIdSchema = z.enum([
  'ahilyanagar_to_pune',
  'pune_to_ahilyanagar',
  'nagar_to_pune',
  'pune_to_nagar',
])

export type RouteId = z.infer<typeof RouteIdSchema>

export const PickupPointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sequence: z.number().int().positive(),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'pickupTime must be in HH:mm 24-hour format',
  }),
  active: z.boolean().default(true),
})

export type PickupPoint = z.infer<typeof PickupPointSchema>

export const DropPointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sequence: z.number().int().positive(),
  active: z.boolean().default(true),
})

export type DropPoint = z.infer<typeof DropPointSchema>

export const RouteSchema = z.object({
  routeId: RouteIdSchema,
  fromCity: z.string().min(1),
  toCity: z.string().min(1),
  label: z.string().min(1),
  active: z.boolean().default(true),
  version: z.number().int().nonnegative().default(1),
  updatedAt: z.string(),
  pickupPoints: z.array(PickupPointSchema),
  dropPoints: z.array(DropPointSchema),
})

export type Route = z.infer<typeof RouteSchema>

export const BookingPickupPointSchema = z.object({
  pointId: z.string().min(1),
  name: z.string().min(1),
  pickupTime: z.string().min(1),
})

export type BookingPickupPoint = z.infer<typeof BookingPickupPointSchema>

export const BookingDropPointSchema = z.object({
  pointId: z.string().min(1),
  name: z.string().min(1),
})

export type BookingDropPoint = z.infer<typeof BookingDropPointSchema>

export interface BookingPointSnapshot {
  routeId: RouteId | string
  pickup: BookingPickupPoint
  drop: BookingDropPoint
}

/**
 * Normalizes input or legacy identifiers into the 4 canonical route IDs.
 */
export function resolveRouteId(fromOrRouteId: string, toCity?: string): RouteId | null {
  if (!fromOrRouteId) return null
  const input = fromOrRouteId.trim()
  const lower = input.toLowerCase()

  // 1. Direct standard IDs & legacy aliases
  if (
    lower === 'ahilyanagar_to_pune' ||
    lower === 'ahm_pun' ||
    lower === 'ahilyanagar-pune' ||
    lower === 'ahilyanagar_pune'
  ) {
    return 'ahilyanagar_to_pune'
  }
  if (
    lower === 'pune_to_ahilyanagar' ||
    lower === 'pun_ahm' ||
    lower === 'pune-ahilyanagar' ||
    lower === 'pune_ahilyanagar'
  ) {
    return 'pune_to_ahilyanagar'
  }
  if (lower === 'nagar_to_pune' || lower === 'nagar-pune' || lower === 'nagar_pune') {
    return 'nagar_to_pune'
  }
  if (lower === 'pune_to_nagar' || lower === 'pune-nagar' || lower === 'pune_nagar') {
    return 'pune_to_nagar'
  }

  // 2. Both cities in the single string (e.g. "Ahilyanagar to Pune", "Pune → Ahilyanagar", "Ahmednagar to Pune")
  const hasAhilya = lower.includes('ahilya') || lower.includes('ahmednagar')
  const hasPune = lower.includes('pune')
  if (hasAhilya && hasPune) {
    const ahilyaIdx = Math.max(lower.indexOf('ahilya'), lower.indexOf('ahmednagar'))
    const puneIdx = lower.indexOf('pune')
    return ahilyaIdx < puneIdx ? 'ahilyanagar_to_pune' : 'pune_to_ahilyanagar'
  }

  if (lower.includes('nagar') && lower.includes('pune')) {
    const nagarIdx = lower.indexOf('nagar')
    const puneIdx = lower.indexOf('pune')
    return nagarIdx < puneIdx ? 'nagar_to_pune' : 'pune_to_nagar'
  }

  // 3. Two separate parameters (fromCity, toCity)
  if (toCity) {
    const fromNorm = lower
    const toNorm = toCity.trim().toLowerCase()

    const isAhilyaFrom = fromNorm.includes('ahilya') || fromNorm.includes('ahmednagar')
    const isAhilyaTo = toNorm.includes('ahilya') || toNorm.includes('ahmednagar')
    const isPuneFrom = fromNorm.includes('pune')
    const isPuneTo = toNorm.includes('pune')

    if (isAhilyaFrom && isPuneTo) return 'ahilyanagar_to_pune'
    if (isPuneFrom && isAhilyaTo) return 'pune_to_ahilyanagar'

    const isNagarFrom = fromNorm.includes('nagar')
    const isNagarTo = toNorm.includes('nagar')

    if (isNagarFrom && isPuneTo) return 'nagar_to_pune'
    if (isPuneFrom && isNagarTo) return 'pune_to_nagar'
  }

  return null
}

/**
 * Converts 24h "HH:mm" time to 12h format "h:mm AM/PM".
 */
export function format12hTime(time24: string): string {
  if (!time24) return ''
  const trimmed = time24.trim()
  if (/am|pm/i.test(trimmed)) return trimmed

  const [hStr, mStr] = trimmed.split(':')
  const h = parseInt(hStr || '0', 10)
  const m = parseInt(mStr || '0', 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  const displayM = String(m).padStart(2, '0')
  return `${displayH}:${displayM} ${period}`
}

/**
 * Creates stable identifier slug for points: e.g. "pp_ekvira_chowk", "dp_wakadewadi"
 */
export function createPointId(prefix: 'pp' | 'dp', name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${prefix}_${slug}`
}
