# United 18 Stock

A simple voice stock-input web application for a men's wear shop, built with Next.js (App Router), TypeScript, Tailwind CSS, Firebase Auth (email/password), and Cloud Firestore.

---

## What the Owner Does
Stock arrives. A helper counts it and says it out loud. The owner taps the mic and says, for example: `"pant grey 5 size 32"`. The app reads the sentence, shows a small review card, the owner taps **Save** (or hits Enter), and the stock count goes up. Nothing is saved until the owner taps Save.

## Core Rule: Nothing is Predefined
There are **no preset types, colours, sizes, or attributes**. Types (`pant`, `shirt`, `short pants`, `t-shirt`...), colours, and sizes are created dynamically at the moment the owner says them:
- A type said again (`pant`, `pants`, `Pant`) automatically resolves into the same type, never a duplicate.
- Same colour + size adds to the existing count.
- Dynamic short codes (`PN`, `SH`, `TSH`, `SPN`) and item codes (`PN-GRY-32`) are generated deterministically.

---

## Features & Screens
1. **Login Page (`/login`)**:
   - Clean email/password sign-in.
   - Protected route guarding the dashboard.
   - Owner user is created directly in the Firebase console (no public sign-up).
2. **Main Dashboard (`/`)**:
   - **Left Sidebar / Mobile Top Bar**: "All stock" with total counts + dynamic buttons per category.
   - **Voice & Fallback Text Card**: Round mic button pulsing when active, Web Speech API (`webkitSpeechRecognition`, `en-IN`), live interim text updates, and instant text fallback.
   - **Review Card**: Editable Type (with suggestions datalist), Colour, Size, and Count. Validation displays red borders and error messages for required fields. Enter key saves.
   - **Feedback & Focus**: Success toast (`Saved: 5 × Pant · Grey · 32 → code PN-GRY-32`), auto-clears input, and refocuses for the next entry.
   - **Stock View**:
     - *All stock*: visual bar chart of inventory distribution across types.
     - *Selected type*: heading with total count, in-place editable type code (regenerates all item codes for that category), colour summary chips, bar chart by size, and an item table with `−` and `+` adjustment buttons (never below 0).
   - **Undo Last Entry**: Single-tap atomic transaction reversing the owner's latest entry, deleting newly created items/types if count reaches 0, and marking the entry undone.
3. **Real-time Sync**:
   - Real-time `onSnapshot` listeners on `types` and the active type's `items`. Multiple phones stay synced instantly.
4. **Light & Dark Mode**:
   - Automatically adapts to system preferences (`prefers-color-scheme`). Large touch targets (≥44px) optimized for mobile shop floor usage.

---

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database & Auth**: Firebase Auth + Cloud Firestore (Location: `asia-south1`, Mumbai)
- **Voice**: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`, `lang: "en-IN"`)
- **Testing**: Vitest

---

## Environment Variables Configuration

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Configure your Firebase client credentials:

```ini
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAWoNVl523wkiVU50e7aKXZAjlnY15PBxk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=united18-a884d.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=united18-a884d
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=united18-a884d.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=292514780495
NEXT_PUBLIC_FIREBASE_APP_ID=1:292514780495:web:82174ebbd658ac1e25e13a
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ZVFQERLQC3
```

---

## Running Locally

1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Run tests**:
   ```bash
   pnpm test
   ```
3. **Start development server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploying

### Option A: Deploy to Firebase Hosting & Rules
1. Log in to Firebase CLI:
   ```bash
   firebase login
   ```
2. Deploy Firestore Security Rules & Indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
3. Build and Deploy Hosting:
   ```bash
   pnpm build
   firebase deploy --only hosting
   ```

### Option B: Deploy to Vercel
1. Push repository to GitHub.
2. Import project in Vercel.
3. Add the `NEXT_PUBLIC_FIREBASE_*` environment variables in Vercel Project Settings.
4. Deploy!
