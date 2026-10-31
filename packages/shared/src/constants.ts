export const FARE_PER_SEAT = 200; // INR, as currently specified
export const ALMOST_FULL_AT = 5; // seatsLeft <= this => "Almost Full"
export const BOOKING_CLOSES_MIN_BEFORE = 15; // minutes before departure
export const MAX_SEARCH_DAYS_AHEAD = 60;
export const MIN_PASSWORD_LENGTH = 8;
export const TIMEZONE = "Asia/Kolkata";
// Hidden login domain. Reserved ".example" TLD never resolves, so no real mailbox can exist.
export const DEFAULT_PHONE_EMAIL_DOMAIN = "phone.udaytravels.example";

export const ROUTE_IDS = ["ahilyanagar-pune", "pune-ahilyanagar"] as const;
export type RouteId = (typeof ROUTE_IDS)[number];

export const COLLECTIONS = {
  users: "users",
  admins: "admins",
  routes: "routes",
  buses: "buses",
  trips: "trips",
} as const;
