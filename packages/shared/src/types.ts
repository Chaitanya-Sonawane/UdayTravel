import type { RouteId } from "./constants";

/** Firestore Timestamp (client or admin SDK) satisfies this. */
export interface TimeLike {
  toMillis(): number;
}

export interface StopDoc {
  name: string;
  offsetMin: number; // minutes after departure
  isBoarding: boolean;
  isDropping: boolean;
}

export interface RouteDoc {
  from: string;
  to: string;
  stops: StopDoc[];
  active: boolean;
}

export type BusType = "seater" | "sleeper" | "semi-sleeper";

export interface BusDoc {
  name: string;
  type: BusType;
  isAc: boolean;
  seatCount: number;
  registrationNo?: string;
  active: boolean;
}

export type TripStatus = "scheduled" | "closed" | "cancelled";

export interface TripDoc<T = TimeLike> {
  routeId: RouteId;
  dateKey: string; // "YYYY-MM-DD" in IST
  departAt: T;
  arriveAt: T;
  durationMin: number;
  busId: string;
  busName: string; // copied from bus so passengers never read /buses
  busType: BusType;
  isAc: boolean;
  fare: number;
  totalSeats: number;
  seatsLeft: number;
  status: TripStatus;
  pickupPoints: string[];
  dropPoints: string[];
  createdBy: string;
}

export interface UserProfileDoc<T = TimeLike> {
  name: string;
  mobile: string;
  email?: string | null;
  createdAt: T;
}
