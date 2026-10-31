# Task 1 notes

## Decisions
- Search first; sign-in is required when the passenger taps Select Bus (return to the same selection after login).
- No OTP. Mobile number is unverified. Hidden Auth email = `<mobile>@<PHONE_EMAIL_DOMAIN>` (the reserved `.example` TLD never resolves).
- No self-service password reset in Task 1: staff reset manually. Add reset by real email later if the passenger gave one.
- `/buses` is admin-only (changed from the earlier plan, to keep registration numbers private). Passengers see bus name and type copied onto each trip.
- Admin = document at `admins/{uid}`, created by hand. Rules read it with `exists()` (one extra read per admin write).

## Remaining build order
3. Auth screens (register, login, guard on Select Bus).
4. Admin: buses, create trip, repeat for a date range (batched writes, max 500 per batch).
5. Search: direction cards, calendar (no past dates, max 60 days ahead), bus cards, empty and error states.
6. Expo app reusing `packages/shared`.
7. Deploy static Hosting, test on real phones, turn on App Check.

## Open questions for the client
- Real stops, timings and journey duration both ways; the four buses' names, types and seat counts.
- Whether passengers must register before searching (default here: no).
