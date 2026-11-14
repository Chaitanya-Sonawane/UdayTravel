# Uday Travels — Smart Seat Selection Engine & Booking Engine Decisions

This document records the architectural findings, conflict resolutions, and operational specifications agreed upon for the Uday Travels Smart Seat Selection Engine (Pune ↔ Ahilyanagar route).

---

## 1. Phase 0 Findings

### 1.1 Bus Layout & Geometry
- **Bus Model**: 51-seater single-deck passenger bus.
- **Row Configuration**:
  - **Rows A to I** (9 rows × 5 seats): 
    - Left side: 2-seater pair (`1`, `2`)
    - Central aisle (strictly non-adjacent across aisle)
    - Right side: 3-seater row (`3`, `4`, `5`)
  - **Row J** (1 rear row × 6 seats):
    - Unbroken 6-seater bench across the back of the bus (`J1`, `J2`, `J3`, `J4`, `J5`, `J6`).
- **Total Capacity**: 51 seats.
- **Seat Zones**:
  - `FRONT`: Rows A, B, C (seats 1–15)
  - `MIDDLE`: Rows D, E, F, G (seats 16–35)
  - `BACK`: Rows H, I, J (seats 36–51)

### 1.2 Firestore Storage & Free-Tier Quota Architecture
- **Single Bounded Query**: To stay within the Firebase Spark free tier (50,000 reads/day, 20,000 writes/day), each trip's live seat state is stored in a single bounded document:
  `bus_seats/{busId}_{date}`
- **Zero-Write Expiry Cleanup**: Seat holds expire via server-side timestamp comparison (`expiresAt`). Reads lazily evaluate expired holds as `AVAILABLE` without triggering cleanup writes.
- **Worst-Case Free Tier Footprint (500–700 concurrent users)**:
  - Seat Recommendation: 1 bounded read (0 writes)
  - Seat Hold (5 min): 1 read + 1 write
  - Payment Confirmation: 1 read + 1 write
  - Total Daily Footprint: ~1,500 reads, ~600 writes (< 4% of daily quota limit).

---

## 2. Agreed Conflict Resolutions (Phase 0 Decisions)

| Ref | Topic | Decision & Specification |
|---|---|---|
| **a** | **Female Priority Pool** | **10 seats** (A1, A2, B1, B2, C1, C2, D1, D2, E1, E2) located on the left-hand 2-seater pairs across Rows A–E. Non-female bookings cannot consume these seats until the release cutoff. |
| **b** | **Gender Adjacency Rule** | Unrelated male and female passengers **cannot** sit directly adjacent to one another. Traveling as a confirmed family unit is the only exception allowing mixed-gender adjacency. |
| **c** | **Age & Front/Back Influence** | Configurable with a **40% hard cap**. Default starting weights: 30% combined for non-family bookings (15% age + 15% front/back), 10% for family bookings. |
| **d** | **Family Identification** | Explicit boolean flag / relationship type at booking (`relationshipType: 'FAMILY'`). **Never inferred** from names, surnames, or shared booking IDs. |
| **e** | **Female Priority Release Window** | **2 hours** before scheduled departure time. After this cutoff, unused female-priority pool seats automatically become available to general inventory. |
| **f** | **Seat Hold Duration** | **5 minutes** (300,000 ms). Timestamped on the backend server (`expiresAt = serverNow + 300_000`). |
| **g** | **Child Passengers (< 15 years)** | Children under 15 are permitted **only as dependent passengers within a FAMILY booking**. Solo bookings for children under 15 are rejected with a typed `SoloChildBookingError`. |

---

## 3. Engine Architecture & Pipeline

The recommendation engine (`recommendSeats`) is a pure, 100% deterministic mathematical function with zero I/O, no network calls, no Firestore dependencies, and no random number generation.

### Pipeline Stages
1. **Hard Filter**:
   - Prunes any seat that is `CONFIRMED` or actively `HELD`.
   - Never touches or reassigns confirmed bookings.
   - Enforces capacity constraints.
2. **Cluster Generation**:
   - Generates contiguous blocks first (lateral pairs, row triples, and Row J 6-seater bench).
   - Fallback to minimum-distance geometric clusters if single-block seating is impossible.
   - Never scatters families across distant bus sections.
3. **Multi-Factor Scoring**:
   - Evaluates valid candidate clusters against prioritized factors:
     `FAMILY_TOGETHER > GENDER_GROUPING > FEMALE_PRIORITY > AGE_GROUP > FRONT_BACK > PICKUP_DROP`.
4. **Deterministic Ranking & Tie-Break**:
   - Ranks top 2–4 options.
   - Deterministic tie-breaking uses lowest alphanumeric seat identifier string (e.g., `A1, A2` over `B1, B2`).

---

## 4. Post-Payment Ticket Creation & PDF Download

### 4.1 Ticket Creation Lifecycle
1. User completes Razorpay payment.
2. Backend receives verified signature (`POST /api/payments/verify`).
3. Firestore seat transaction transitions seats from `HELD` $\to$ `CONFIRMED` idempotently.
4. Ticket record is generated with unique PNR (`UTxxxxxx`), journey details, QR token, passenger metadata, and saved to `tickets/{ticketNo}`.
5. Client is redirected to `/ticket/[ticketNo]`.

### 4.2 PDF Generation
- Binary PDF generation built via `@react-pdf/renderer` at `GET /api/tickets/[ticketNo]/pdf`.
- Generates official e-ticket matching Uday Travels branding (route, pickup/drop times, passenger table, fare breakdown, terms of carriage, and PNR).
