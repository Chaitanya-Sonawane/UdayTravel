# Uday Travels — Security Architecture & Threat Model

## 1. Security Principles & Architecture

1. **Deny-by-Default Firestore Security Rules:** Direct client writes to sensitive collections (`orders`, `payments`, `tickets`, `wallets`, `refunds`, `webhook_events`, `audit_logs`) are strictly forbidden (`allow write: if false`). All state transitions execute through authenticated server-side Next.js route handlers using the Firebase Admin SDK.
2. **Cryptographic Integrity & Timing Safety:**
   - All payment verification and webhook signatures use HMAC-SHA256 evaluated with `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
   - Seat holds issue cryptographically signed tokens (`signHoldToken`) that bind user UID, seat list, and hold expiration timestamp.
   - Boarding passes embed signed QR verification tokens to prevent counterfeiting.
3. **App Check Abuse Protection:** Next.js route handlers verify `X-Firebase-AppCheck` tokens via `adminAppCheck.verifyToken` to prevent bot scraping and automated abuse.
4. **Zero Client Trust:** Pricing, wallet deductions, seat states, and payment statuses are calculated server-side; any client-asserted price or status is discarded.
5. **Least Privilege Error Messaging:** The application uses structured `AppError` responses (`{ error: { code, message } }`). Internal stack traces or sensitive credentials are never leaked to clients.
6. **No Cloudflare Exemption:** The system adheres strictly to a pure Firebase infrastructure without any Cloudflare dependencies.
