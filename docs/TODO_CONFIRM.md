# Uday Travels — Items for Business Confirmation (TODO_CONFIRM)

The following design decisions and business rules have been safely implemented using sensible production defaults, but should be confirmed with the Uday Travels operations stakeholders:

---

## 1. Pune → Ahilyanagar Boarding & Drop Points
- **Current Default:** Boarding and drop points for `PUN_AHM` route currently use default Ahilyanagar and Pune stops (e.g. Shivajinagar, Pune & Ahilyanagar Bus Stand).
- **Confirmation Needed:** Exact list of pickup points and landmarks in Pune (e.g., Swargate, Wakadewadi, Viman Nagar) and drop points in Ahilyanagar.

---

## 2. Store Credit Wallet Expiry
- **Current Default:** Wallet store credits have no expiration date (perpetual store credit).
- **Confirmation Needed:** Does Uday Travels want an expiry period (e.g., 180 days or 365 days from issue date) for store credit balances?

---

## 3. Cancellation Fee Waivers
- **Current Default:** Flat fee of ₹50 (5,000 paise) is strictly deducted per seat on every cancellation prior to the 20:00 IST cutoff.
- **Confirmation Needed:** Should customer service admins have authorization to issue a 100% full refund (fee waiver) via the Admin Panel for exceptional circumstances (e.g., bus service delay or vehicle breakdown)?

---

## 4. External SMS & WhatsApp Gateway Integration
- **Current Implementation:** Ticket sharing is implemented via direct WhatsApp Web link and Web Share API (`https://wa.me/?text=...`).
- **Confirmation Needed:** When ready for automated SMS/WhatsApp alerts, which gateway provider does Uday Travels prefer (e.g., Gupshup, Twilio, MSG91)?
