import { applicationDefault, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import {
  COLLECTIONS, FARE_PER_SEAT, addDaysToDateKey, istToMs, toDateKey, type RouteId, type TripDoc,
} from "../packages/shared/src";
import { BUSES, DEMO_DEPARTURES, ROUTES } from "./seed-data";

// Safety guard: refuse to touch a real project unless explicitly told to.
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const allowRemote = process.argv.includes("--allow-remote");
if (!usingEmulator && !allowRemote) {
  console.error(
    "Refusing to run: FIRESTORE_EMULATOR_HOST is not set.\n" +
      "Start the emulator (npm run emulators) and run: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed\n" +
      "To seed a real project on purpose, add --allow-remote.",
  );
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-uday-travels";
initializeApp(usingEmulator ? { projectId } : { projectId, credential: applicationDefault() });
const db = getFirestore();

async function main() {
  const batch = db.batch();
  for (const [id, route] of Object.entries(ROUTES)) batch.set(db.collection(COLLECTIONS.routes).doc(id), route);
  for (const [id, bus] of Object.entries(BUSES)) batch.set(db.collection(COLLECTIONS.buses).doc(id), bus);
  await batch.commit();
  console.log(`Seeded ${Object.keys(ROUTES).length} routes and ${Object.keys(BUSES).length} buses.`);

  if (!process.argv.includes("--demo-trips")) return;
  if (!usingEmulator) throw new Error("--demo-trips is only allowed on the emulator.");

  const busIds = Object.keys(BUSES);
  const today = toDateKey(Date.now());
  let count = 0;
  const tripBatch = db.batch();
  for (let day = 0; day < 7; day++) {
    const dateKey = addDaysToDateKey(today, day);
    for (const [routeId, times] of Object.entries(DEMO_DEPARTURES)) {
      const route = ROUTES[routeId]!;
      times.forEach((hhmm, i) => {
        const busId = busIds[(count + i) % busIds.length]!;
        const bus = BUSES[busId]!;
        const departMs = istToMs(dateKey, hhmm);
        const durationMin = route.stops[route.stops.length - 1]!.offsetMin;
        const trip: TripDoc<Timestamp> = {
          routeId: routeId as RouteId,
          dateKey,
          departAt: Timestamp.fromMillis(departMs),
          arriveAt: Timestamp.fromMillis(departMs + durationMin * 60_000),
          durationMin,
          busId,
          busName: bus.name,
          busType: bus.type,
          isAc: bus.isAc,
          fare: FARE_PER_SEAT,
          totalSeats: bus.seatCount,
          seatsLeft: bus.seatCount - ((count * 7) % 36), // varied counts so every badge can be seen
          status: "scheduled",
          pickupPoints: [route.from],
          dropPoints: [route.to],
          createdBy: "seed-script",
        };
        tripBatch.set(db.collection(COLLECTIONS.trips).doc(`demo-${routeId}-${dateKey}-${hhmm.replace(":", "")}`), trip);
        count++;
      });
    }
  }
  await tripBatch.commit();
  console.log(`Seeded ${count} demo trips (placeholder data, emulator only).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
