# Uday Travels — Testing & Verification Strategy

## 1. Test Coverage Overview

All core business logic, integer money arithmetic, cryptographic signatures, seat lifecycle state machine, wallet ledgers, confirmation idempotency, and cancellation workflows are covered by comprehensive unit, integration, and property-based test suites with Vitest and fast-check.

---

## 2. Test Suites Summary

| Test Suite File | Focus Area | Key Invariants Verified |
| :--- | :--- | :--- |
| `tests/money.test.ts` | Integer Paise Arithmetic | Conversion, display formatting, safe integer validation, exact conservation of money via fast-check fuzzing |
| `tests/refund.test.ts` | Cancellation & Refund Policy | 20:00 IST cutoff rule, ₹50 fee deduction, proportional payment split, net refund invariant |
| `tests/seat-hold.test.ts` | Seat Hold State Machine | Cryptographic HMAC hold tokens, conflict rejection, lazy expiry of holds |
| `tests/wallet.test.ts` | Store-Credit Wallet & Ledger | Active holds, available balance vs total balance, debit/credit transactions, immutable audit trail |
| `tests/payment-confirm.test.ts` | Authoritative Confirmation Engine | Atomic transaction confirmation, seat transition, ticket creation, idempotency on repeated invocations |
| `tests/webhook-dedup.test.ts` | Razorpay Webhook & Signature | HMAC-SHA256 signature verification, timing attack safety, atomic event deduplication |
| `tests/cancellation.test.ts` | Cancellation & Seat Release | Transactional cancellation, seat restoration to AVAILABLE, wallet credit / refund record creation |
| `tests/admin.test.ts` | Admin Panel Backend & Security | Cookie/Bearer authentication, schedule editing, user directory |
| `tests/schedule-seat-chart.test.ts` | Bus Schedule & 50-Seat Chart | Schedule creation, visual seat chart editing, schedule deletion |
| `tests/api.test.ts` | Account & Availability API | User creation idempotency, daily schedule caching |
| `tests/ist.test.ts` | Asia/Kolkata Timezone Engine | Pure IST date/time parsing, departure calculations |
| `tests/status.test.ts` | Availability Status Engine | Trip status calculation ('available', 'almost-full', 'sold-out', 'closed') |
| `tests/account-schema.test.ts` | Profile Validation | Traveler schema validation |

---

## 3. Running Test Suites

```bash
# Run all tests once
pnpm vitest run

# Run with watch mode
pnpm vitest

# Run Next.js production build check
pnpm build
```
