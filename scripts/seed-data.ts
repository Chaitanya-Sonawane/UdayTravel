import type { BusDoc, RouteDoc } from "../packages/shared/src";

// !! PLACEHOLDER VALUES. Replace with the agency's real stops, timings, bus names and seat counts
// before using in production. Nothing here is real timetable data.

export const ROUTES: Record<string, RouteDoc> = {
  "ahilyanagar-pune": {
    from: "Ahilyanagar",
    to: "Pune",
    active: true,
    stops: [
      { name: "Ahilyanagar", offsetMin: 0, isBoarding: true, isDropping: false },
      { name: "Pune", offsetMin: 210, isBoarding: false, isDropping: true },
    ],
  },
  "pune-ahilyanagar": {
    from: "Pune",
    to: "Ahilyanagar",
    active: true,
    stops: [
      { name: "Pune", offsetMin: 0, isBoarding: true, isDropping: false },
      { name: "Ahilyanagar", offsetMin: 210, isBoarding: false, isDropping: true },
    ],
  },
};

export const BUSES: Record<string, BusDoc> = {
  "bus-1": { name: "Uday Travels Bus 1", type: "seater", isAc: false, seatCount: 40, active: true },
  "bus-2": { name: "Uday Travels Bus 2", type: "seater", isAc: false, seatCount: 40, active: true },
  "bus-3": { name: "Uday Travels Bus 3", type: "seater", isAc: true, seatCount: 40, active: true },
  "bus-4": { name: "Uday Travels Bus 4", type: "seater", isAc: true, seatCount: 40, active: true },
};

// Used only with --demo-trips (dev emulator): fake departure times per route.
export const DEMO_DEPARTURES: Record<string, string[]> = {
  "ahilyanagar-pune": ["06:30", "14:00"],
  "pune-ahilyanagar": ["10:00", "18:30"],
};
