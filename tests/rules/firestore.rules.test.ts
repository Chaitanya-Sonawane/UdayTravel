import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { Timestamp, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-uday-travels",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "admins/admin1"), { role: "owner" });
    await setDoc(doc(db, "trips/t1"), { routeId: "ahilyanagar-pune", dateKey: "2026-11-17", seatsLeft: 20 });
    await setDoc(doc(db, "routes/ahilyanagar-pune"), { from: "Ahilyanagar", to: "Pune", active: true });
    await setDoc(doc(db, "buses/bus-1"), { name: "Bus 1", registrationNo: "MH00AA0000" });
    await setDoc(doc(db, "users/user1"), { name: "Asha Patil", mobile: "9876543210", createdAt: Timestamp.now() });
    await setDoc(doc(db, "users/user2"), { name: "Ravi Shinde", mobile: "9123456780", createdAt: Timestamp.now() });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const user = (uid = "user1") => env.authenticatedContext(uid).firestore();
const admin = () => env.authenticatedContext("admin1").firestore();
const profile = (over: Record<string, unknown> = {}) => ({
  name: "Asha Patil", mobile: "9876543210", createdAt: serverTimestamp(), ...over,
});

describe("public timetable data", () => {
  it("anyone can read trips and routes", async () => {
    await assertSucceeds(getDoc(doc(anon(), "trips/t1")));
    await assertSucceeds(getDoc(doc(anon(), "routes/ahilyanagar-pune")));
  });
  it("passengers cannot write trips or routes", async () => {
    await assertFails(setDoc(doc(anon(), "trips/t2"), { seatsLeft: 1 }));
    await assertFails(updateDoc(doc(user(), "trips/t1"), { seatsLeft: 99 }));
    await assertFails(setDoc(doc(user(), "routes/x"), { from: "A" }));
  });
  it("admins can write trips and routes", async () => {
    await assertSucceeds(setDoc(doc(admin(), "trips/t2"), { seatsLeft: 40 }));
    await assertSucceeds(updateDoc(doc(admin(), "trips/t1"), { status: "closed" }));
    await assertSucceeds(setDoc(doc(admin(), "routes/x"), { from: "A" }));
  });
});

describe("buses are admin-only", () => {
  it("blocks passengers and anonymous users", async () => {
    await assertFails(getDoc(doc(anon(), "buses/bus-1")));
    await assertFails(getDoc(doc(user(), "buses/bus-1")));
  });
  it("allows admins", async () => {
    await assertSucceeds(getDoc(doc(admin(), "buses/bus-1")));
    await assertSucceeds(setDoc(doc(admin(), "buses/bus-2"), { name: "Bus 2" }));
  });
});

describe("admins collection", () => {
  it("nobody can write it, including a user promoting themselves", async () => {
    await assertFails(setDoc(doc(user("user1"), "admins/user1"), { role: "owner" }));
    await assertFails(setDoc(doc(admin(), "admins/other"), { role: "owner" }));
  });
  it("a user can read only their own admin record", async () => {
    await assertSucceeds(getDoc(doc(admin(), "admins/admin1")));
    await assertFails(getDoc(doc(user("user1"), "admins/admin1")));
  });
});

describe("user profiles", () => {
  it("a new user can create their own valid profile", async () => {
    await assertSucceeds(setDoc(doc(user("new1"), "users/new1"), profile()));
    await assertSucceeds(setDoc(doc(user("new2"), "users/new2"), profile({ email: "a@example.com" })));
  });
  it("cannot create a profile for someone else", async () => {
    await assertFails(setDoc(doc(user("new1"), "users/other"), profile()));
  });
  it("anonymous users cannot create profiles", async () => {
    await assertFails(setDoc(doc(anon(), "users/new1"), profile()));
  });
  it("rejects extra fields such as a role", async () => {
    await assertFails(setDoc(doc(user("new1"), "users/new1"), profile({ role: "admin" })));
  });
  it("rejects invalid mobile numbers and names", async () => {
    await assertFails(setDoc(doc(user("new1"), "users/new1"), profile({ mobile: "12345" })));
    await assertFails(setDoc(doc(user("new1"), "users/new1"), profile({ mobile: "5876543210" })));
    await assertFails(setDoc(doc(user("new1"), "users/new1"), profile({ name: "A" })));
  });
  it("rejects a forged createdAt", async () => {
    await assertFails(setDoc(doc(user("new1"), "users/new1"), profile({ createdAt: Timestamp.fromMillis(1000) })));
  });
  it("users read only their own profile; admins can read any", async () => {
    await assertSucceeds(getDoc(doc(user("user1"), "users/user1")));
    await assertFails(getDoc(doc(user("user1"), "users/user2")));
    await assertSucceeds(getDoc(doc(admin(), "users/user2")));
  });
  it("a user can change their name but not their mobile or createdAt", async () => {
    await assertSucceeds(updateDoc(doc(user("user1"), "users/user1"), { name: "Asha P" }));
    await assertFails(updateDoc(doc(user("user1"), "users/user1"), { mobile: "9999999999" }));
    await assertFails(updateDoc(doc(user("user1"), "users/user1"), { createdAt: Timestamp.fromMillis(5) }));
  });
  it("profiles cannot be deleted by clients", async () => {
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(deleteDoc(doc(user("user1"), "users/user1")));
  });
});

describe("everything not yet opened is denied", () => {
  it("bookings, holds and payments are closed", async () => {
    for (const path of ["bookings/b1", "holds/h1", "payments/p1", "refunds/r1"]) {
      await assertFails(getDoc(doc(admin(), path)));
      await assertFails(setDoc(doc(admin(), path), { x: 1 }));
    }
  });
});
