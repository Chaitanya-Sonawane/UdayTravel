# Uday Travels — Master Backend Architecture Specification

## 1. Overview & Core Philosophy

Uday Travels operates intercity passenger bus services on the **Ahilyanagar ↔ Pune** route across Maharashtra, India.
This system provides an end-to-end, production-grade, fault-tolerant booking, payment, and closed-loop store-credit wallet architecture built strictly on **Next.js App Router** and **Firebase-only infrastructure**, with **Razorpay** as the sole payment processor.

### Core Axioms
1. **Server as Single Source of Truth:** The server orchestrates and authoritatively validates all state transitions. The client never writes directly to sensitive booking, payment, availability, seat, wallet, or refund state.
2. **Strict Integer Paise Money Rule:** All monetary calculations, ledger entries, and payment transactions are strictly non-negative safe integer paise (₹1 = 100 paise; ₹200 = 20,000 paise). Floating-point currency arithmetic is prohibited.
3. **Zero Untrusted Client Inputs:** Client-provided fare totals, seat prices, wallet balance assertions, or payment statuses are rejected.
4. **Pure Firebase Infrastructure:** Built exclusively on Firebase Authentication, Cloud Firestore, Firebase App Check, and the Firebase Admin SDK. **Zero Cloudflare dependencies.**
5. **Idempotent Confirmation Engine:** A ticket is generated solely through the transactional `confirmBooking` domain engine, reconciling external payments, wallet debits, and atomic seat reservations.

---

## 2. System Layers & Data Flow

```
+-------------------------------------------------------------------------+
|                                CLIENT                                   |
|   Seat Selection  -->  Review Summary  -->  Wallet Toggle & Payment    |
+-------------------------------------------------------------------------+
                                    |
            Authenticated HTTP Request + App Check Header
                                    v
+-------------------------------------------------------------------------+
|                           NEXT.JS ROUTE HANDLERS                        |
|   /api/seats/hold              |  /api/payments/create-order           |
|   /api/payments/verify         |  /api/payments/webhook                |
|   /api/wallet                  |  /api/tickets/[ticketNo]/cancel       |
+-------------------------------------------------------------------------+
                                    |
                             Authentication
                           & Schema Validation
                                    v
+-------------------------------------------------------------------------+
|                           DOMAIN SERVICES                               |
|   - Seat Hold Service (Cryptographic Token + 5-min TTL)                 |
|   - Booking Confirmation Engine (confirmBooking)                        |
|   - Cancellation & Refund Service (cancelBooking)                       |
|   - Wallet Domain (Balance, Holds, Deductions, Ledger)                  |
|   - Reconciliation Engine (runReconciliation)                           |
+-------------------------------------------------------------------------+
            |                                               |
  External Payments API                               Firestore Read / Write
            v                                               v
+-----------------------+                       +-----------------------+
|     RAZORPAY API      |                       |    CLOUD FIRESTORE    |
| - Orders API          |                       | - bus_seats           |
| - Payments API        |                       | - orders              |
| - Refunds API         |                       | - tickets             |
| - Webhook Dispatch    |                       | - wallets + ledger    |
+-----------------------+                       | - availability        |
                                                | - refunds             |
                                                | - webhook_events      |
                                                | - audit_logs          |
                                                +-----------------------+
```

---

## 3. Core Domain Engines

### 3.1 Seat Hold Engine (`lib/domain/seats/hold.ts`)
- User selects 1 to 6 seats.
- Server validates route and departure fare.
- Generates a unique group identifier `grp = hold_${timestamp}_${random}`.
- Places an atomic hold in `bus_seats/{tripId_date}` with a 5-minute TTL (`holdExpiresAt = Date.now() + 300000`).
- Generates an HMAC-SHA256 signature `holdToken = signHoldToken(grp, uid, seatIds, holdExpiresAt)`.
- Implements lazy-expiry: any seat whose hold timestamp is in the past is treated as available on subsequent reads without requiring background batch jobs.

### 3.2 Authoritative Confirmation Engine (`lib/payments/confirm.ts`)
The single entry point `confirmBooking({ grp, paymentId?, source })`:
1. Reads `orders/{grp}`. If already `CONFIRMED`, returns the existing ticket idempotently.
2. If `order.razorpayPaise > 0`, verifies payment status (`captured`) and exact amount with Razorpay.
3. Enters an atomic Cloud Firestore transaction:
   - Validates that all seats in `bus_seats` remain in state `HELD` by `grp`.
   - Transitions seats to `CONFIRMED` with passenger gender attributes.
   - If wallet store credit was utilized, finalizes debit from `wallets/{uid}` and writes an immutable `SPEND` ledger record.
   - Increments booked seat counter in `availability/{routeId_date}`.
   - Generates collision-resistant ticket number (`UT` + Base32 uppercase characters) and cryptographically signed QR code boarding pass token.
   - Creates `tickets/{ticketNo}`.
   - If paid via Razorpay, records `payments/{razorpayPaymentId}`.
   - Updates `orders/{grp}` status to `CONFIRMED`.
4. Dispatches real-time SSE bus notification to sync live user and admin seat charts.

### 3.3 Cancellation & Refund Service (`lib/payments/cancel.ts`)
1. Checks ticket status (`CONFIRMED`).
2. Evaluates route cancellation window in Asia/Kolkata timezone:
   - Ahilyanagar → Pune: Prior to 20:00 IST the day before travel.
   - Pune → Ahilyanagar: Prior to 20:00 IST the day before travel; journeys booked on travel day cannot be cancelled on travel day.
3. Anonymous traveler protection: Anonymous accounts require phone verification / account linking before cancelling to safeguard store credit.
4. Computes refund breakdown in integer paise:
   - Fee: ₹50 (5,000 paise) retained per seat.
   - Net Refund: `max(0, totalPaidPaise - fee)`.
   - Proportional split: Accurately distributed between original Razorpay payment source and store credit wallet.
5. In an atomic transaction:
   - Releases seats in `bus_seats` back to `AVAILABLE`.
   - Decrements booked count in `availability`.
   - Credits wallet if applicable with a `REFUND` ledger record.
   - Creates a `refunds/{ticketNo}` record in `PENDING` status.
   - Marks ticket as `CANCELLED`.
6. Executes external Razorpay refund API and updates refund record to `PROCESSED`.
