import { describe, expect, it } from "vitest";
import { isValidMobile, mobileToEmail, normalizeMobile, validateRegistration } from "./auth";

describe("mobile handling", () => {
  it("normalizes common formats", () => {
    expect(normalizeMobile("98765 43210")).toBe("9876543210");
    expect(normalizeMobile("+91 98765 43210")).toBe("9876543210");
    expect(normalizeMobile("919876543210")).toBe("9876543210");
    expect(normalizeMobile("09876543210")).toBe("9876543210");
  });
  it("validates Indian mobile numbers", () => {
    expect(isValidMobile("9876543210")).toBe(true);
    expect(isValidMobile("5876543210")).toBe(false);
    expect(isValidMobile("98765")).toBe(false);
  });
  it("builds the hidden login address", () => {
    expect(mobileToEmail("+91 98765 43210")).toBe("9876543210@phone.udaytravels.example");
    expect(mobileToEmail("9876543210", "x.example")).toBe("9876543210@x.example");
    expect(() => mobileToEmail("123")).toThrow();
  });
});

describe("validateRegistration", () => {
  const ok = { name: "Asha Patil", mobile: "9876543210", password: "longenough1" };
  it("accepts a valid form with no email", () => {
    expect(validateRegistration(ok).ok).toBe(true);
  });
  it("accepts a valid optional email", () => {
    expect(validateRegistration({ ...ok, email: "asha@example.com" }).ok).toBe(true);
  });
  it("reports every bad field", () => {
    const r = validateRegistration({ name: "A", mobile: "123", email: "bad", password: "short" });
    expect(Object.keys(r.errors).sort()).toEqual(["email", "mobile", "name", "password"]);
  });
});
