import { ALMOST_FULL_AT, BOOKING_CLOSES_MIN_BEFORE } from "./constants";
import type { TripStatus } from "./types";

export type TripBadge =
  | "available"
  | "almost_full"
  | "sold_out"
  | "booking_closed"
  | "departed"
  | "cancelled";

export interface BadgeInput {
  status: TripStatus;
  departMs: number;
  seatsLeft: number;
}

export interface BadgeConfig {
  almostFullAt: number;
  closesMinBefore: number;
}

const DEFAULTS: BadgeConfig = {
  almostFullAt: ALMOST_FULL_AT,
  closesMinBefore: BOOKING_CLOSES_MIN_BEFORE,
};

/** Card status, computed on the screen from trip data and the current time. */
export function computeTripBadge(
  trip: BadgeInput,
  nowMs: number,
  cfg: BadgeConfig = DEFAULTS,
): TripBadge {
  if (trip.status === "cancelled") return "cancelled";
  if (nowMs >= trip.departMs) return "departed";
  if (trip.status === "closed" || nowMs >= trip.departMs - cfg.closesMinBefore * 60_000) {
    return "booking_closed";
  }
  if (trip.seatsLeft <= 0) return "sold_out";
  if (trip.seatsLeft <= cfg.almostFullAt) return "almost_full";
  return "available";
}

export function canSelectBus(badge: TripBadge): boolean {
  return badge === "available" || badge === "almost_full";
}

export const BADGE_LABEL: Record<TripBadge, string> = {
  available: "Available",
  almost_full: "Almost Full",
  sold_out: "Sold Out",
  booking_closed: "Booking Closed",
  departed: "Departed",
  cancelled: "Cancelled",
};
