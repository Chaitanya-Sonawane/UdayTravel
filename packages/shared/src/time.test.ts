import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey, formatDuration, formatTimeIST, isPastDateKey, isValidDateKey, istToMs, toDateKey,
} from "./time";

describe("time helpers (India time)", () => {
  it("uses the India date, not UTC", () => {
    // 2026-11-16 19:00 UTC is already 17 Nov 00:30 in India
    expect(toDateKey(Date.parse("2026-11-16T19:00:00Z"))).toBe("2026-11-17");
    expect(toDateKey(Date.parse("2026-11-16T18:29:00Z"))).toBe("2026-11-16");
  });
  it("validates date keys", () => {
    expect(isValidDateKey("2026-11-17")).toBe(true);
    expect(isValidDateKey("2026-02-31")).toBe(false);
    expect(isValidDateKey("17-11-2026")).toBe(false);
  });
  it("adds days across months", () => {
    expect(addDaysToDateKey("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("blocks past dates but allows today", () => {
    const now = Date.parse("2026-11-17T10:00:00+05:30");
    expect(isPastDateKey("2026-11-16", now)).toBe(true);
    expect(isPastDateKey("2026-11-17", now)).toBe(false);
    expect(isPastDateKey("2026-11-18", now)).toBe(false);
  });
  it("converts India clock time to milliseconds and back", () => {
    const ms = istToMs("2026-11-17", "06:30");
    expect(ms).toBe(Date.parse("2026-11-17T01:00:00Z"));
    expect(formatTimeIST(ms)).toBe("06:30 AM");
  });
  it("formats durations", () => {
    expect(formatDuration(210)).toBe("3h 30m");
    expect(formatDuration(180)).toBe("3h");
    expect(formatDuration(45)).toBe("45m");
  });
});
