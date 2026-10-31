import { describe, expect, it } from "vitest";
import { canSelectBus, computeTripBadge } from "./status";

const depart = Date.parse("2026-11-17T06:30:00+05:30");
const min = 60_000;
const base = { status: "scheduled" as const, departMs: depart, seatsLeft: 20 };

describe("computeTripBadge", () => {
  it("available with plenty of seats", () => {
    expect(computeTripBadge(base, depart - 120 * min)).toBe("available");
  });
  it("almost full at 5 seats or fewer", () => {
    expect(computeTripBadge({ ...base, seatsLeft: 5 }, depart - 120 * min)).toBe("almost_full");
    expect(computeTripBadge({ ...base, seatsLeft: 6 }, depart - 120 * min)).toBe("available");
  });
  it("sold out at zero seats", () => {
    expect(computeTripBadge({ ...base, seatsLeft: 0 }, depart - 120 * min)).toBe("sold_out");
  });
  it("booking closes 15 minutes before departure", () => {
    expect(computeTripBadge(base, depart - 16 * min)).toBe("available");
    expect(computeTripBadge(base, depart - 15 * min)).toBe("booking_closed");
  });
  it("closed status wins over seats", () => {
    expect(computeTripBadge({ ...base, status: "closed" }, depart - 120 * min)).toBe("booking_closed");
  });
  it("departed after departure time", () => {
    expect(computeTripBadge(base, depart)).toBe("departed");
  });
  it("cancelled wins over everything", () => {
    expect(computeTripBadge({ ...base, status: "cancelled" }, depart + min)).toBe("cancelled");
  });
  it("only available and almost full can be selected", () => {
    expect(canSelectBus("available")).toBe(true);
    expect(canSelectBus("almost_full")).toBe(true);
    for (const b of ["sold_out", "booking_closed", "departed", "cancelled"] as const) {
      expect(canSelectBus(b)).toBe(false);
    }
  });
});
