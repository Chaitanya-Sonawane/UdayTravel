# UDAY TRAVELS — COMPREHENSIVE BACKEND AUDIT

**Date:** 2026-11-13  
**Auditor:** Senior Principal Backend Engineer  
**Status:** COMPLETE — Ready for Implementation Phase

---

## 1. Executive Summary & System Context

Uday Travels operates intercity bus services on the **Ahilyanagar (Ahmednagar) ↔ Pune** route across Maharashtra, India.
The system is built on:
- **Framework:** Next.js 16.4.5 (App Router, Turbopack, React 19, TypeScript strict)
- **Infrastructure:** Pure Firebase (Cloud Firestore, Firebase Authentication, Firebase App Check, Firebase Admin SDK). **Strictly zero Cloudflare dependencies.**
- **Payment Gateway:** Razorpay as the single authoritative external payment processor.
- **Monetary Unit:** Strict integer paise (₹1 = 100 paise, ₹200 = 20000 paise). Zero floating-point representation.
- **Integrity Rule:** All authoritative state transitions (seat reservation, holds, pricing, orders, tickets, store credit wallet balances, and ledger entries) are owned strictly by the server and verified inside Cloud Firestore transactions. Client amounts or client-supplied status are never trusted.

---

## 2. Detailed Audit of Repository Components

### 2.1 Repository Structure & Package Dependencies (`package.json`)
- **Dependencies Present:**
  - `firebase`: `^11.4.0` (Client SDK: Auth, Firestore, App Check)
  - `firebase-admin`: `^14.5.1` (Admin SDK: Auth, Firestore, App Check)
  - `@google-cloud/firestore`: `^9.4.1`
  - `zod`: `^4.6.7` (Schema validation)
  - `zustand`: `^5.0.16` (Client booking state)
  - `qrcode.react`: `^4.2.0` (Boarding pass QR code)
  - `@react-pdf/renderer`: `^4.9.0` (PDF ticket generator)
  - `fast-check`: `^4.10.2` (Property-based fuzz testing in devDependencies)
  - `vitest`: `^5.1.0` (Test runner)
- **Missing Dependency:**
  - `razorpay` (Official Node.js SDK) is missing from `package.json`. It must be installed for server-side order creation, payment fetching, refund processing, and signature verification.

### 2.2 Next.js Configuration (`next.config.mjs`)
- Configured with security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`.
- Runs cleanly under Next.js 16 App Router.

### 2.3 Firebase Client Initialization (`lib/firebase/client.ts`)
- Client app, Auth, Firestore, and reCAPTCHA v3 App Check initializers are implemented.
- Provides `ensureAnonymousAuth()` for seamless guest booking and `getApiAuthHeaders()` supplying Bearer ID token and App Check header.
- Emulator support included for local testing.

### 2.4 Firebase Admin SDK (`lib/firebase/admin.ts`)
- Configured to initialize using `FIREBASE_SERVICE_ACCOUNT_B64` or local project ID fallback.
- Contains an in-memory dev Firestore proxy for offline test execution when no remote service account is configured.
- Provides `getAdminAuth()`, `getAdminDb()`, and `getAdminAppCheck()`.

### 2.5 Firestore Security Rules (`firestore.rules`)
- Currently protects `/users/{uid}`, `/availability/{document=**}`, and `/bus_seats/{document=**}`.
- All client writes are denied (`allow write: if false`).
- **Audit Finding:** Must be expanded to explicitly cover and enforce server-only access for new collections: `orders`, `payments`, `tickets`, `wallets`, `refunds`, `webhook_events`, and `audit_logs`.

### 2.6 Firestore Indexes (`firestore.indexes.json`)
- Currently empty (`{ "indexes": [], "fieldOverrides": [] }`).
- Compound indexes will be required for administrative queries (e.g. querying orders by status and date, wallets ledger by timestamp, refunds by status).

### 2.7 Authentication & Authorization Architecture
- **User Authentication (`lib/server/guard.ts`):**
  - Cryptographically verifies Firebase ID tokens using `verifyIdToken(idToken)`.
  - Zero Firestore reads during token verification (pure CPU cryptographic check).
  - Enforces Firebase App Check when `APP_CHECK_ENFORCE=true`.
- **Admin Authorization (`lib/server/admin-guard.ts`):**
  - Verifies HMAC token cookie (`uday_admin_token`) or `Authorization: Bearer <key>` against `ADMIN_SECRET_KEY`.
  - Used across `/api/admin/*` routes.

### 2.8 Route & Schedule Configuration (`lib/config/routes.ts`, `lib/config/rules.ts`)
- Canonical routes:
  - `AHM_PUN`: Ahilyanagar → Pune (Departures: 05:30, 06:00, 09:30, 14:00; duration 165 min; boarding: Office 6:30 AM; drop: Shivajinagar).
  - `PUN_AHM`: Pune → Ahilyanagar (Departures: 06:30, 10:00, 13:30, 17:00; duration 165 min; drop: Ahilyanagar).
- Rule parameters:
  - `BOOKING_WINDOW_DAYS`: 30
  - `CLOSE_BEFORE_DEPARTURE_MIN`: 60
  - `SEATS_PER_BUS`: 50 (3+2 layout: 10 rows A–J, 5 seats per row)
  - `BASE_FARE_INR`: 200 (₹200 = 20,000 paise)
  - `HOLD_TTL_MS`: 300,000 (5 minutes)
  - `TZ`: `Asia/Kolkata`

### 2.9 Seat Layout & Selection UI (`app/seats/page.tsx`, `lib/schema/availability.ts`)
- 50-seat bus layout (`A1`–`J5`).
- Visual states: Available, Selected, Booked (Male/Female), Reserved (Blocked).
- Supports live updates via SSE (`/api/seats/stream`).
- **Audit Finding:** The UI currently transitions from seat selection to review without invoking a server-backed seat hold API (`POST /api/seats/hold`). It relies on client state. Must be linked to authoritative server holds.

### 2.10 Availability Engine (`app/api/availability/route.ts`, `lib/availability/status.ts`)
- Reads daily schedule documents from `availability/{routeId_date}`.
- Supports dynamically created bus schedules from admin and default schedule templates.
- Returns real-time status: `'available' | 'almost-full' | 'sold-out' | 'closed'`.

### 2.11 Passenger & Booking Models
- Passenger: `{ id, name, age, gender, seatId }`.
- Journey: `{ from, to, routeId, tripId, date, busId, busName, departure, arrival, fare }`.
- Profile: `users/{uid}` contains `{ name, mobile, age, gender, createdAt, updatedAt }`.

### 2.12 Existing Payment Endpoints (Legacy Stubs)
- `app/api/payments/create-order/route.ts`: Mock response returning `order_mock_*` with hardcoded 40000 paise.
- `app/api/payments/verify/route.ts`: Mock response returning random PNR `UT...` without verifying Razorpay HMAC or updating seats.
- `app/api/payments/webhook/route.ts`: Stub checking header without HMAC verification or event deduplication.
- **Audit Finding:** These endpoints must be upgraded to full production implementations backed by domain services and repositories.

### 2.13 Cancellation & Refund Models (`lib/cancellation.ts`, `lib/mock-tickets.ts`)
- Existing mock cancellation rule:
  - Ahilyanagar → Pune: Cancellation open until 20:00 IST the day before travel.
  - Pune → Ahilyanagar: Cancellation not permitted on travel day if booked on same day.
  - Refund formula in mock: Flat fee of ₹50 per seat deducted, ₹150 per seat credited.
- **Audit Finding:** In the target architecture, monetary calculations must be strictly in integer paise (`5000` paise fee, `15000` paise refund), validated against departure instant in IST, and handled via wallet store credit and/or original payment source refund.

### 2.14 Environment Variable Handling
- Existing variables:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
  - `FIREBASE_SERVICE_ACCOUNT_B64`, `APP_CHECK_ENFORCE`, `ADMIN_SECRET_KEY`.
- Variables required for complete payments & wallet architecture:
  - `RAZORPAY_KEY_ID`: Razorpay public/key ID (`rzp_test_...` or `rzp_live_...`).
  - `RAZORPAY_KEY_SECRET`: Razorpay secret for HMAC verification and API calls.
  - `RAZORPAY_WEBHOOK_SECRET`: Secret for webhook HMAC-SHA256 signature verification.
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Client-side key for Razorpay checkout script.
  - `QR_SECRET` / `HOLD_SIGNING_SECRET`: Secret for HMAC signing seat holds and QR verification tokens.

### 2.15 Existing Tests
- All 69 tests pass across 6 test suites:
  - `tests/account-schema.test.ts` (31 tests)
  - `tests/admin.test.ts` (10 tests)
  - `tests/api.test.ts` (4 tests)
  - `tests/ist.test.ts` (10 tests)
  - `tests/schedule-seat-chart.test.ts` (5 tests)
  - `tests/status.test.ts` (9 tests)
- New tests must be added to comprehensively verify money arithmetic, wallet ledger integrity, seat holds, payment verification, webhook deduplication, and cancellation.

---

## 3. Current vs Target Architecture Comparison

| Architectural Aspect | Current State | Target Production Architecture |
| :--- | :--- | :--- |
| **Money Representation** | Mixed (floats, rupees in UI, hardcoded integers) | **Strict Integer Paise Only** (no floats, centralized `lib/money/`) |
| **Seat Hold Authority** | Client-side timer in Zustand store (`holdExpiresAt`) | **Authoritative Server Hold** in `bus_seats/{tripId_date}` with HMAC token & lazy expiry |
| **Price Calculation** | UI multiplies `passengers.length * 200` | **Authoritative Server Calculation** via `computeBookingTotal` in domain service |
| **Payment Gateway** | Mock client script / mock API responses | **Official Razorpay SDK**, verified webhooks, timing-safe HMAC |
| **Booking Confirmation** | Client receives mock PNR on `/api/payments/verify` | **Single Authoritative Engine (`confirmBooking`)** in Firestore transaction |
| **Store Credit Wallet** | None | **Closed-Loop Wallet (`wallets/{uid}`)** with append-only ledger & hold reservations |
| **Cancellation & Refund**| Mock function in `lib/cancellation.ts` | **Transactional Cancellation Engine** (`POST /api/tickets/[ticketNo]/cancel`) with wallet credit & Razorpay refund tracking |
| **Error Handling** | Ad-hoc JSON error payloads | **Unified `AppError` Hierarchy** with 24 strictly defined error codes |
| **Webhooks** | Stub endpoint | **Signed, Deduplicated Webhook Processor** (`webhook_events/{eventId}`) |
| **Reconciliation** | None | **Background / Admin Reconciliation Engine** (`POST /api/admin/reconcile`) |

---

## 4. Firestore Collections Matrix

| Collection Name | Document ID Pattern | Schema & Purpose | Client Permissions | Server Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `{uid}` | Traveler personal profile | Read own (`auth.uid == uid`), write false | Full Admin SDK |
| `availability` | `{routeId}_{date}` | Bus schedules & available seats counter | Public read, write false | Full Admin SDK |
| `bus_seats` | `{tripId}_{date}` | Atomic seat states (available, held, confirmed, blocked) | Authenticated read, write false | Full Admin SDK (transactional) |
| `orders` | `{grp}` | Booking intent, seat list, paise breakdown, status | Read none, write false | Full Admin SDK |
| `payments` | `{razorpayPaymentId}` | External payment audit record | Read none, write false | Full Admin SDK |
| `tickets` | `{ticketNo}` | Authoritative confirmed booking & boarding pass | Authenticated read own, write false | Full Admin SDK |
| `wallets` | `{uid}` | User store credit balance and active holds | Read own, write false | Full Admin SDK (transactional) |
| `wallets/{uid}/ledger`| `{entryId}` | Immutable append-only audit trail of wallet debits/credits | Read own, write false | Full Admin SDK |
| `refunds` | `{ticketNo}` | Refund record, source amount, wallet credit amount, status | Read own, write false | Full Admin SDK |
| `webhook_events` | `{eventId}` | Processed Razorpay webhook events for deduplication (14d TTL) | Read none, write false | Full Admin SDK |
| `audit_logs` | `{auditId}` | Administrative actions and security audit log | Read none, write false | Full Admin SDK |

---

## 5. Files to be Created

1. **`lib/money/index.ts` & `lib/money/refund.ts`**: Pure integer paise money functions with runtime validation.
2. **`lib/errors/app-error.ts`**: 24 typed application error codes and serialization.
3. **`lib/schemas/booking.schema.ts`**: Zod schemas for seat holds, orders, and booking intents.
4. **`lib/schemas/payment.schema.ts`**: Zod schemas for order creation, verification, and webhooks.
5. **`lib/schemas/wallet.schema.ts`**: Zod schemas for wallet balances, adjustments, and migrations.
6. **`lib/schemas/ticket.schema.ts`**: Zod schemas for tickets and cancellation requests.
7. **`lib/data/*.repo.ts`**: Repositories for `seats`, `availability`, `orders`, `payments`, `tickets`, `wallets`, `refunds`, `webhook-events`, and `audit`.
8. **`lib/domain/seats/` & `lib/domain/wallet/` & `lib/domain/bookings/`**: Core domain logic.
9. **`lib/payments/razorpay.ts` & `signature.ts` & `confirm.ts` & `refund.ts` & `reconcile.ts`**: Payment processing and confirmation engine.
10. **`app/api/seats/hold/route.ts`**: Seat hold endpoint.
11. **`app/api/wallet/route.ts`**: User wallet retrieval endpoint.
12. **`app/api/tickets/[ticketNo]/cancel/route.ts` & `route.ts`**: Ticket retrieval and cancellation endpoints.
13. **`app/api/admin/wallets/[uid]/route.ts` & `adjust/route.ts` & `migrate/route.ts`**: Admin wallet management endpoints.
14. **`app/api/admin/payments/route.ts` & `refunds/route.ts` & `reconcile/route.ts`**: Admin payment and reconciliation endpoints.

---

## 6. Files to be Modified

1. `package.json`: Add `razorpay` dependency.
2. `firestore.rules`: Enforce rules for new collections.
3. `app/api/payments/create-order/route.ts`: Transition from mock to production domain-backed order creation with wallet split.
4. `app/api/payments/verify/route.ts`: Transition from mock to production signature verification + `confirmBooking`.
5. `app/api/payments/webhook/route.ts`: Implement raw body signature verification and idempotent event dispatch.
6. `app/seats/page.tsx`: Connect seat selection to `POST /api/seats/hold`.
7. `app/payment/page.tsx`: Support wallet store credit toggle, display integer paise totals, and handle payment completion.
8. `app/ticket/[ticketNo]/page.tsx`: Fetch live ticket from `/api/tickets/[ticketNo]` and wire cancellation modal.
9. `app/admin/page.tsx`: Add Payments, Refunds, and Wallet oversight tabs.

---

## 7. Files That MUST NOT Be Modified

1. `app/globals.css`: Preserve existing visual styling, brand colors, and responsive CSS rules.
2. `components/ui/*`: Preserve UI building blocks.
3. `lib/time/ist.ts`: Tested and sound Asia/Kolkata date calculations.
4. `lib/availability/status.ts`: Tested and sound availability status calculations.

---

## 8. Migration & Backward Compatibility Requirements

1. **Service Account Fallback:** When `FIREBASE_SERVICE_ACCOUNT_B64` is unconfigured (in local dev or test environments), the system must seamlessly fall back to the dev in-memory Firestore proxy without throwing runtime crashes.
2. **Existing Admin Capabilities:** Existing dynamic schedule creation (`POST /api/admin/availability`), seat-chart configuration (`PATCH /api/admin/availability`), and schedule deletion (`DELETE /api/admin/availability`) must remain fully functional.
3. **No Downtime Transition:** New collections and endpoints will be introduced alongside existing UI routes, maintaining backward compatibility at each step.

---

## 9. Conclusion & Sign-Off

The repository has been thoroughly audited. All architectural requirements, money rules, error codes, Firestore collections, and integration points have been mapped out. Implementation will proceed in accordance with the Phase Plan.
