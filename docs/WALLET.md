# Uday Travels — Closed-Loop Store-Credit Wallet Architecture

## 1. Overview & Policy

Uday Travels provides a closed-loop store-credit wallet system. Store credit is non-withdrawable and strictly dedicated to ticket bookings on Uday Travels routes.
Store credit is issued upon booking cancellation, promotional credits, or customer service adjustments.

---

## 2. Document & Ledger Schemas

### 2.1 Wallet Root Document (`wallets/{uid}`)
```typescript
interface WalletDoc {
  uid: string
  balancePaise: number // Integer paise (>= 0)
  activeHolds: Record<string, {
    grp: string
    amountPaise: number
    expiresAt: number // Timestamp ms
  }>
  createdAt: string
  updatedAt: string
  schemaVersion: number
}
```

### 2.2 Immutable Append-Only Ledger (`wallets/{uid}/ledger/{entryId}`)
Every balance-affecting event appends an entry to the subcollection `wallets/{uid}/ledger`:
```typescript
interface LedgerEntry {
  entryId: string // e.g., 'spend_hold_123' or 'refund_UT25354'
  uid: string
  type: 'HOLD' | 'SPEND' | 'HOLD_RELEASE' | 'REFUND' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT'
  amountPaise: number // Signed (+ for credit, - for debit)
  balanceBeforePaise: number
  balanceAfterPaise: number
  referenceId: string // e.g. ticketNo, grp, or admin adjustment ID
  description: string
  createdAt: string
  schemaVersion: number
}
```

---

## 3. Balance Calculations & Active Holds

- **Total Balance (`balancePaise`):** The authoritative total balance in the user's account.
- **Active Hold Sum (`heldPaise`):** The sum of unexpired holds currently reserved for in-progress checkouts:
  $$\text{heldPaise} = \sum_{\text{expiresAt} > \text{now}} \text{hold.amountPaise}$$
- **Available Balance (`availablePaise`):**
  $$\text{availablePaise} = \max(0, \text{balancePaise} - \text{heldPaise})$$
- Holds expire lazily after 5 minutes without needing background cleaners.

---

## 4. Wallet Operations & Concurrency Safety

1. **Placing a Hold:** Performed during `POST /api/payments/create-order`. Checks `availablePaise >= requestedPaise`. Adds hold entry to `activeHolds`.
2. **Finalizing Debit (`SPEND`):** In `confirmBooking`, executes atomically inside the Firestore transaction:
   - Removes hold from `activeHolds`.
   - Decrements `balancePaise`.
   - Writes `SPEND` entry to ledger.
3. **Crediting on Cancellation (`REFUND`):** In `cancelBooking`, adds `walletRefundPaise` to `balancePaise` and writes a `REFUND` ledger entry.
4. **Administrative Adjustments:**
   - `POST /api/admin/wallets/[uid]/adjust`: Adds or subtracts balance with `ADMIN_CREDIT` or `ADMIN_DEBIT` ledger records and audit logging.
5. **Account Linking Migration:**
   - `POST /api/admin/wallets/migrate`: Safely transfers accumulated store credit from an anonymous user UID (`sourceUid`) to an authenticated user UID (`targetUid`).
