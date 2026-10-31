# Uday Travels (Firebase)

Task 1: account creation, journey search, available bus cards, plus the admin trip tools.
Stack: Next.js (web + /admin), Expo (app), Firebase Auth + Firestore. Shared logic lives in `packages/shared`.

## Status of this starter (steps 1-2 of the build order)
- Done and verified: shared types, status logic, India-time helpers, mobile and registration validation (`npm run test:unit`, 20 tests), TypeScript typecheck (`npm run typecheck`).
- Written but NOT yet run: `firestore.rules` and `tests/rules/firestore.rules.test.ts` (they need the Firestore emulator, which could not be downloaded where this was built). Run `npm run test:rules` on your machine first and fix anything it reports before building more.
- Not built yet: Next.js site, Expo app, admin screens (steps 3-6).

## First run
1. Install: Node 20+, Java 21+ (for the emulator), then `npm install` and `npm i -g firebase-tools`.
2. `npm run test:unit` and `npm run typecheck` should pass.
3. `npm run test:rules` must pass before anything else.
4. `npm run emulators` in one terminal, then in another:
   `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:demo` (placeholder data, emulator only).
5. Real project setup: create `uday-travels-dev` and `uday-travels-prod` in the Firebase console, enable Auth (Email/Password) and Firestore, then `firebase use dev`.
   Deploy rules and indexes to dev: `firebase deploy --only firestore --project uday-travels-dev`.
6. First admin: create the owner user in Auth, copy the uid, create a Firestore document `admins/<uid>` by hand in the console.

## Replace before launch
`scripts/seed-data.ts` holds placeholder stops, durations, bus names and seat counts. Replace with the agency's real data.

## Layout
```
packages/shared/   types, constants, time, status, auth helpers (+ unit tests)
scripts/           seed.ts (emulator-guarded), seed-data.ts
tests/rules/       Firestore rules tests (need emulator)
docs/              agent-rules.md, task-1-notes.md
firestore.rules, firestore.indexes.json, firebase.json, .firebaserc
```
