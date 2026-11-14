# Uday Travels — Payment Architecture & Razorpay Integration

## 1. Overview

Razorpay is the sole external payment gateway for Uday Travels. All communications with Razorpay are orchestrated server-side using the official Razorpay SDK (`razorpay 2.9.8`) and verified via cryptographic HMAC-SHA256 signatures.

---

## 2. Environment Variables

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | Server | Razorpay Key ID (`rzp_test_...` or `rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | Server | Razorpay Key Secret for API basic auth and HMAC validation |
| `RAZORPAY_WEBHOOK_SECRET` | Server | Secret for raw body webhook HMAC-SHA256 signature verification |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Client | Exposed to browser for loading the Razorpay modal checkout |

---

## 3. Payment Lifecycle & Flow

### 3.1 Order Creation (`POST /api/payments/create-order`)
1. Client submits `{ grp, holdToken, useWallet, passengers, contactMobile }`.
2. Server verifies `holdToken` using HMAC-SHA256.
3. Checks one-time 5-minute hold extension (`holdExpiresAt += 300000`).
4. Computes canonical price: `perSeatPaise * passengers.length` (integer paise).
5. If `useWallet` is selected:
   - Fetches user's available wallet balance.
   - Computes split: `walletDebitPaise = min(totalPaise, availableWalletPaise)`.
   - `razorpayPaise = totalPaise - walletDebitPaise`.
   - Transactionally places hold on user's wallet credit.
6. If `razorpayPaise > 0`:
   - Invokes `razorpay.orders.create({ amount: razorpayPaise, currency: 'INR', receipt: grp })`.
   - Returns `{ orderId, amount, currency, keyId, walletDebitPaise, razorpayPaise, totalPaise, expiresAt }`.
7. If `razorpayPaise === 0` (100% wallet payment):
   - Returns `orderId: 'INTERNAL_WALLET_ONLY'`.
8. Persists `orders/{grp}` document with status `CREATED`.

### 3.2 Payment Verification (`POST /api/payments/verify`)
1. Client receives Razorpay checkout callback with `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }`.
2. Client sends payload to `/api/payments/verify`.
3. Server executes timing-safe HMAC-SHA256 verification:
   `expectedSignature = HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)`
4. Compares signatures using `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
5. Invokes authoritative `confirmBooking({ grp, paymentId, source: 'VERIFY_API' })`.
6. Returns `{ success: true, pnr: ticketNo, ticketNo, status: 'CONFIRMED' }`.

---

## 4. Webhook Processing & Deduplication (`POST /api/payments/webhook`)

### 4.1 Security Rules
- **No Client Auth / No App Check:** Webhooks originate from Razorpay servers.
- **Mandatory Signature:** Header `x-razorpay-signature` must match `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)`.
- **Deduplication:** Event ID is recorded in Firestore collection `webhook_events/{eventId}` with a Firestore document creation constraint (`create`). If document already exists, the event is acknowledged immediately with `{ received: true, deduplicated: true }`.

### 4.2 Handled Webhook Events
- `payment.captured` / `order.paid`: Extracts `notes.grp` or `order_id`, invokes `confirmBooking({ grp, paymentId, source: 'WEBHOOK' })`.
- `payment.failed`: Marks `orders/{grp}` as `FAILED`.
- `refund.processed`: Updates `refunds/{ticketNo}` status to `PROCESSED`.
- `refund.failed`: Marks `refunds/{ticketNo}` status to `FAILED` with failure description.

---

## 5. Failure Modes & Compensation (Fulfillment Failure)

If a traveler completes payment on Razorpay but the held seat was somehow lost or invalid before final confirmation (e.g., severe clock skew or manual intervention), the confirmation engine catches `SEAT_OWNERSHIP_FAILED` and immediately triggers an automatic full refund via `issueRazorpayRefund({ paymentId, amountPaise, notes: { reason: 'FULFILLMENT_SEAT_LOST' } })`, logging the incident for operational audit.
