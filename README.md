# Uday Travels — Bus Booking & Ticketing Platform

A production-grade bus reservation, ticketing, and fleet management platform for Uday Travels (operating daily express coaches between Ahilyanagar and Pune).

## Key Features

- **Next.js 16 (App Router) + TypeScript Strict**: Modern web architecture with fast server components and optimized static generation.
- **Firebase Authentication & Firestore**: Secure customer authentication with persistent local sessions and server-authoritative Firestore data models.
- **Seat Selection & Realtime Locking**: 2x3 bus seat chart (50 seats) with live SSE real-time state updates and atomic Firestore transaction locks with TTL.
- **Multi-Passenger Booking**: Support for 1–6 passengers in a single booking with individual seat assignments and saved co-passengers.
- **Saved Travellers**: Automatically sync and reuse saved passenger profiles linked to the user's Firebase account.
- **Payment Gateway (Razorpay)**: Production Razorpay integration with integer-paise money handling, signature verification, and webhook deduplication.
- **Travel Wallet & Credit System**: Full ledger-backed customer wallet for instant credits and seamless checkout deductions.
- **Cancellations & Automated Refunds**: Policy-enforced cancellation terms with automated seat release and wallet credits.
- **Comprehensive Admin Portal (`/admin`)**:
  - Custom schedule creation & date-wise capacity management
  - Interactive seat chart configuration (blocking, reserving, booking overrides)
  - User and traveller directory management
  - Payment and refund reconciliation ledger
- **Zero Client Trust**: All pricing, seat availability, and financial state transitions are strictly validated and orchestrated on the server.

## Tech Stack

- **Framework**: Next.js 16.4.5 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide React
- **Database & Auth**: Firebase Auth, Firebase Firestore (Admin SDK)
- **Payments**: Razorpay Node SDK
- **Testing**: Vitest (100+ unit and integration tests)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create `.env.local` based on `.env.example`:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin SDK
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Razorpay
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Tests & Typecheck

```bash
# Run unit & integration test suite
pnpm test

# Run TypeScript type check
pnpm typecheck

# Run production build
pnpm build
```

## Documentation

Full architectural specifications and guides are located in `/docs`:
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System architecture, sequence diagrams, and design rules
- [`docs/BACKEND_AUDIT.md`](docs/BACKEND_AUDIT.md) — Deep architectural audit of existing components
- [`docs/PAYMENTS.md`](docs/PAYMENTS.md) — Razorpay order lifecycle and webhook deduplication
- [`docs/WALLET.md`](docs/WALLET.md) — Integer-paise double-entry wallet ledger specification
- [`docs/SECURITY.md`](docs/SECURITY.md) — Authentication, App Check, and Firestore security rules
- [`docs/TESTING.md`](docs/TESTING.md) — Test matrix and verification guides

## License

Private and confidential — Uday Travels © 2026.
