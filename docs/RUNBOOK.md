# Uday Travels — Operations & Incident Runbook

## 1. Operational Endpoints (Admin & Health)

- **Admin Login:** `/admin/login` (Protected by `ADMIN_SECRET_KEY`)
- **Admin Dashboard:** `/admin`
  - Bus Schedules & Seat Chart configuration
  - Users Directory
  - Payments Transaction Audit
  - Refunds & Reconciliation Engine
- **Manual Reconciliation Trigger:** `POST /api/admin/reconcile` (Runs automated recovery on stuck orders and pending refunds).
- **Manual Refund Retry:** `POST /api/admin/refunds/[ticketNo]/retry`
- **Wallet Manual Adjustment:** `POST /api/admin/wallets/[uid]/adjust`
- **Wallet Account Migration:** `POST /api/admin/wallets/migrate`

---

## 2. Common Incidents & Resolution Procedures

### Incident 1: User Payment Succeeded on Razorpay but Ticket Not Issued
- **Cause:** Network interruption between Razorpay checkout callback and user browser before calling `/api/payments/verify`.
- **Automatic Resolution:** Razorpay sends a `payment.captured` or `order.paid` webhook to `/api/payments/webhook`. The webhook handler identifies the `grp` order and automatically calls `confirmBooking`, creating the ticket.
- **Manual Intervention:**
  1. Open Admin Panel → Payments tab.
  2. Locate the captured payment ID.
  3. Trigger Admin Reconciliation (`POST /api/admin/reconcile`).
  4. The engine checks orders in `CREATED` status with captured payments and finalizes the booking.

### Incident 2: Razorpay Refund Failed on Ticket Cancellation
- **Cause:** Temporary banking downtime, insufficient merchant account balance, or Razorpay API outage.
- **System State:** The ticket is marked `CANCELLED`, seats are already released, and a `refunds/{ticketNo}` record exists in `FAILED` status.
- **Resolution:**
  1. In Admin Panel → Refunds tab, locate the ticket.
  2. Click "Retry".
  3. The endpoint calls `POST /api/admin/refunds/[ticketNo]/retry`, which invokes Razorpay API and marks the record `PROCESSED` upon success.

### Incident 3: Anonymous User Wishes to Retain Store Credit
- **Cause:** User booked anonymously, cancelled a ticket, and received store credit tied to their anonymous Firebase UID.
- **Resolution:**
  1. Have user sign in or verify phone number in `/account`.
  2. Admin executes `POST /api/admin/wallets/migrate` with `{ sourceUid, targetUid }`.
  3. The balance is atomically transferred with ledger records.

---

## 3. Deployment & Environment Checklist

1. Ensure `FIREBASE_SERVICE_ACCOUNT_B64` is configured with base64-encoded credentials of a service account with Cloud Datastore User role.
2. Ensure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are configured in production environment variables.
3. Configure Razorpay Webhook URL to point to `https://<domain>/api/payments/webhook` with the webhook secret.
4. Set `APP_CHECK_ENFORCE=true` in production to require valid reCAPTCHA tokens.
5. Deploy `firestore.rules` using Firebase CLI (`firebase deploy --only firestore:rules`).
