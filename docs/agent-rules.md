# Rules for AI agents working in this repo (copy into the Antigravity workspace rules)

- TypeScript strict. Modular Firebase SDK only. No `any` unless commented.
- Dates use India time (Asia/Kolkata). Use helpers in `packages/shared/src/time.ts`. Store timestamps as Firestore Timestamps; `dateKey` is "YYYY-MM-DD" in IST.
- Never hardcode trips, fares, times or bus names in UI code. Read them from Firestore. Only `scripts/seed-data.ts` may hold placeholder data.
- Fare constant lives in `constants.ts` (FARE_PER_SEAT). Card status comes only from `computeTripBadge`.
- Passenger code never writes `seatsLeft`, bookings, holds, payments or refunds.
- Never read `/buses` from passenger screens. Use `busName`, `busType`, `isAc` copied onto the trip.
- Search = one route + one date per query (`routeId` and `dateKey` equal, order by `departAt`). Never listen to whole collections.
- Login: mobile + password. Convert mobile with `mobileToEmail`. Optional real email goes in the profile only.
- Point the Firebase MCP server at `uday-travels-dev` only. Never use production credentials, never commit `.env*` or service-account keys.
- Seed script must stay emulator-only unless `--allow-remote` is passed on purpose.
- Any change to `firestore.rules` requires updating `tests/rules` and running `npm run test:rules`.
- Run `npm run typecheck` and `npm run test:unit` before declaring a task done.
