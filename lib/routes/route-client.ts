import {
  Route,
  PickupPoint,
  DropPoint,
  RouteId,
  resolveRouteId,
  format12hTime,
} from '../types/route'
import { getSeedRoute } from './seed-data'

interface CacheEntry {
  route: Route
  version: number
  fetchedAt: number
}

// In-memory cache for fast cross-component reuse without reading storage
const memoryRouteCache = new Map<string, CacheEntry>()

function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // quota exceeded or disabled
  }
}

/**
 * Fetches a route with memory + localStorage quota-optimised caching.
 * Resolves routeId, reuses cached document across screens, and never uses onSnapshot.
 */
export async function getRouteWithCache(
  fromOrRouteId: string,
  toCity?: string
): Promise<Route | null> {
  const canonicalId = resolveRouteId(fromOrRouteId, toCity)
  if (!canonicalId) return null

  // 1. In-memory check
  const inMemory = memoryRouteCache.get(canonicalId)
  if (inMemory) {
    return inMemory.route
  }

  // 2. Storage check
  const storageKey = `uday_route_${canonicalId}`
  const storedStr = getStorageItem(storageKey)
  let cachedEntry: CacheEntry | null = null
  if (storedStr) {
    try {
      cachedEntry = JSON.parse(storedStr)
      if (cachedEntry?.route) {
        memoryRouteCache.set(canonicalId, cachedEntry)
      }
    } catch {
      cachedEntry = null
    }
  }

  // 3. Single network fetch to API with version check
  try {
    const vParam = cachedEntry?.version ? `?v=${cachedEntry.version}` : ''
    const res = await fetch(`/api/routes/${canonicalId}${vParam}`)

    if (res.ok) {
      const data = await res.json()
      if (data.notModified && cachedEntry?.route) {
        return cachedEntry.route
      }

      if (data.route && data.route.pickupPoints && data.route.pickupPoints.length > 0) {
        const freshEntry: CacheEntry = {
          route: data.route,
          version: data.route.version || 1,
          fetchedAt: Date.now(),
        }
        memoryRouteCache.set(canonicalId, freshEntry)
        setStorageItem(storageKey, JSON.stringify(freshEntry))
        return data.route
      }
    }
  } catch (err) {
    console.warn(`[getRouteWithCache] Network error for ${canonicalId}, using fallback:`, err)
  }

  if (cachedEntry?.route && cachedEntry.route.pickupPoints && cachedEntry.route.pickupPoints.length > 0) {
    return cachedEntry.route
  }

  // 4. Guaranteed Authoritative Seed Fallback so passenger booking never gets blocked
  const seedRoute = getSeedRoute(canonicalId)
  if (seedRoute) {
    const freshEntry: CacheEntry = {
      route: seedRoute,
      version: seedRoute.version || 1,
      fetchedAt: Date.now(),
    }
    memoryRouteCache.set(canonicalId, freshEntry)
    return seedRoute
  }

  return null
}

/**
 * Clears cached route (useful when admin saves updates or for tests).
 */
export function invalidateRouteCache(routeId?: string): void {
  if (routeId) {
    const canonicalId = resolveRouteId(routeId) || routeId
    memoryRouteCache.delete(canonicalId)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(`uday_route_${canonicalId}`)
      } catch {}
    }
  } else {
    memoryRouteCache.clear()
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(window.localStorage).filter((k) => k.startsWith('uday_route_'))
        keys.forEach((k) => window.localStorage.removeItem(k))
      } catch {}
    }
  }
}

/**
 * Formats pickup point display string: "Name — 6:30 AM"
 */
export function formatPickupDisplay(p: PickupPoint): string {
  return `${p.name} — ${format12hTime(p.pickupTime)}`
}

/**
 * Formats drop point display string: name only (NO time!)
 */
export function formatDropDisplay(d: DropPoint): string {
  return d.name
}
