import { DEFAULT_PHONE_EMAIL_DOMAIN, MIN_PASSWORD_LENGTH } from "./constants";

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Accepts "98765 43210", "+91 98765 43210", "09876543210" and returns 10 digits. */
export function normalizeMobile(input: string): string {
  let d = input.replace(/[\s\-()]/g, "");
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

export function isValidMobile(input: string): boolean {
  return MOBILE_RE.test(normalizeMobile(input));
}

/** Hidden Firebase Auth login address built from the mobile number. */
export function mobileToEmail(input: string, domain: string = DEFAULT_PHONE_EMAIL_DOMAIN): string {
  const mobile = normalizeMobile(input);
  if (!MOBILE_RE.test(mobile)) throw new Error("Invalid mobile number");
  return `${mobile}@${domain}`;
}

export interface RegistrationInput {
  name: string;
  mobile: string;
  email?: string;
  password: string;
}

export type FieldErrors = Partial<Record<keyof RegistrationInput, string>>;

export function validateRegistration(input: RegistrationInput): { ok: boolean; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) errors.name = "Enter your full name (2 to 60 characters).";
  if (!isValidMobile(input.mobile)) errors.mobile = "Enter a valid 10-digit mobile number.";
  const email = input.email?.trim();
  if (email && (!EMAIL_RE.test(email) || email.length > 100)) errors.email = "Enter a valid email or leave it blank.";
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
