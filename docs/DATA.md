# Uday Travels — Data Architecture & Collection Specifications

## 1. Cloud Firestore Collection Layout

All documents include `schemaVersion: 1`, `createdAt`, and `updatedAt` timestamps in ISO 8601 string or Firestore Timestamp format.

---

## 2. Collection Schemas

### 2.1 `users/{uid}`
- **Purpose:** Traveler account profile.
- **Fields:**
  - `name`: string
  - `mobile`: string
  - `age`: number
  - `gender`: 'male' | 'female' | 'other'
  - `createdAt`: string
  - `updatedAt`: string

### 2.2 `availability/{routeId_date}`
- **Document ID:** `${routeId}_${date}` (e.g., `AHM_PUN_2026-11-20`)
- **Purpose:** Bus schedule catalog and total booked seat counters.
- **Fields:**
  - `route`: 'AHM_PUN' | 'PUN_AHM'
  - `date`: string (YYYY-MM-DD)
  - `trips`: `Record<tripId, { booked: number, totalSeats: number, fare: number, busName: string, ... }>`
  - `customTrips`: `Array<TripScheduleData>` (created dynamically via Admin panel)
  - `updatedAt`: string

### 2.3 `bus_seats/{tripId_date}`
- **Document ID:** `${tripId}_${date}` (e.g., `AHM_PUN_0600_2026-11-20`)
- **Purpose:** Real-time seat lifecycle state machine.
- **Fields:**
  - `tripId`: string
  - `date`: string
  - `seats`: `Record<seatId, BusSeatEntry>`
    - `state`: 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'BLOCKED'
    - `heldBy`?: string (uid)
    - `grp`?: string
    - `holdExpiresAt`?: number (timestamp ms)
    - `ticketNo`?: string
    - `passengerGender`?: 'male' | 'female'
  - `updatedAt`: string

### 2.4 `orders/{grp}`
- **Document ID:** Group hold identifier (e.g., `hold_1794595...`)
- **Purpose:** Authoritative booking intent and checkout state.
- **Fields:**
  - `grp`: string
  - `uid`: string
  - `routeId`: 'AHM_PUN' | 'PUN_AHM'
  - `tripId`: string
  - `travelDate`: string
  - `seatIds`: string[]
  - `passengers`: `Array<{ seat: string, name: string, age: number, gender: 'male' | 'female' }>`
  - `perSeatPaise`: number
  - `totalPaise`: number
  - `walletDebitPaise`: number
  - `razorpayPaise`: number
  - `status`: 'CREATED' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'FAILED'
  - `razorpayOrderId`?: string
  - `razorpayPaymentId`?: string
  - `ticketNo`?: string
  - `holdExpiresAt`: number
  - `holdExtended`: boolean

### 2.5 `payments/{razorpayPaymentId}`
- **Document ID:** Razorpay payment ID (e.g., `pay_Nx123456789`)
- **Purpose:** Immutable audit record of external gateway payments.
- **Fields:**
  - `razorpayPaymentId`: string
  - `razorpayOrderId`: string
  - `grp`: string
  - `uid`: string
  - `amountPaise`: number
  - `currency`: 'INR'
  - `status`: 'captured' | 'failed' | 'refunded'
  - `method`?: string
  - `email`?: string
  - `contact`?: string

### 2.6 `tickets/{ticketNo}`
- **Document ID:** Canonical ticket number (e.g., `UT888777`)
- **Purpose:** Confirmed boarding pass and travel document.
- **Fields:**
  - `ticketNo`: string
  - `grp`: string
  - `uid`: string
  - `status`: 'CONFIRMED' | 'CANCELLED' | 'REFUND_INITIATED' | 'COMPLETED'
  - `route`: `{ from: string, to: string, routeId: 'AHM_PUN' | 'PUN_AHM' }`
  - `travelDate`: string
  - `tripId`: string
  - `busName`: string
  - `busNumber`: string
  - `seatLayout`: string
  - `pickup`: `{ name: string, time: string }`
  - `drop`: `{ name: string, time: string }`
  - `passengers`: `Array<{ seat: string, title?: string, name: string, age: number, gender: 'male' | 'female' }>`
  - `fare`: `{ perSeatPaise: number, seats: number, totalPaise: number, taxesPaise: number }`
  - `payment`: `{ method: string, razorpayPaymentId?: string, walletDebitPaise: number, razorpayPaise: number, paidAt: string }`
  - `bookedAt`: string
  - `qrToken`: string
  - `cancelledAt`?: string
  - `cancellationFeePaise`?: number
  - `refundPaise`?: number

### 2.7 `refunds/{ticketNo}`
- **Document ID:** Ticket number (e.g., `UT888777`)
- **Purpose:** Tracking Razorpay payment refunds and wallet refunds.
- **Fields:**
  - `ticketNo`: string
  - `uid`: string
  - `grp`: string
  - `totalPaidPaise`: number
  - `feePaise`: number
  - `netRefundPaise`: number
  - `sourceRefundPaise`: number
  - `walletRefundPaise`: number
  - `razorpayRefundId`?: string
  - `status`: 'PENDING' | 'PROCESSED' | 'FAILED'
  - `failureReason`?: string

### 2.8 `webhook_events/{eventId}`
- **Document ID:** Razorpay event ID (`evt_...`)
- **Purpose:** Deduplication store for incoming webhooks (14-day retention).
- **Fields:**
  - `eventId`: string
  - `event`: string
  - `processedAt`: string
  - `status`: 'PROCESSED' | 'FAILED'

### 2.9 `audit_logs/{auditId}`
- **Document ID:** `audit_${timestamp}_${random}`
- **Purpose:** Sensitive security actions (admin reconciliation, manual wallet adjustments).
- **Fields:**
  - `auditId`: string
  - `action`: string
  - `performedBy`: string
  - `targetId`?: string
  - `details`: Record<string, unknown>
  - `timestamp`: string
