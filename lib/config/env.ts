import { z } from 'zod'

const envSchema = z.object({
  // Razorpay
  RAZORPAY_MODE: z.enum(['test', 'live']).default('test'),
  RAZORPAY_KEY_ID: z.string().optional().default('rzp_test_1DP5mmOlF5G5ag'),
  RAZORPAY_KEY_SECRET: z.string().optional().default('mock_key_secret_for_test_mode'),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default('uday_webhook_secret_2026'),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional().default('rzp_test_1DP5mmOlF5G5ag'),
  NEXT_PUBLIC_RAZORPAY_MODE: z.enum(['test', 'live']).default('test'),

  // Firebase Client
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),

  // Firebase Admin Server
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_B64: z.string().optional(),

  // Mode
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type AppEnv = z.infer<typeof envSchema>

function validateEnv(): AppEnv {
  const mode = (process.env.RAZORPAY_MODE || 'test') as 'test' | 'live'
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag'

  // Security guard: Ensure key prefix matches the designated mode
  if (mode === 'test' && keyId && !keyId.startsWith('rzp_test_')) {
    throw new Error(
      `[CRITICAL ENV MISMATCH]: RAZORPAY_MODE is set to 'test', but RAZORPAY_KEY_ID does not start with 'rzp_test_'. Live keys are strictly prohibited in test mode!`
    )
  }

  if (mode === 'live' && keyId && !keyId.startsWith('rzp_live_')) {
    throw new Error(
      `[CRITICAL ENV MISMATCH]: RAZORPAY_MODE is set to 'live', but RAZORPAY_KEY_ID does not start with 'rzp_live_'. Please check your production Razorpay keys!`
    )
  }

  const parsed = envSchema.safeParse({
    RAZORPAY_MODE: process.env.RAZORPAY_MODE || 'test',
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_RAZORPAY_MODE: process.env.NEXT_PUBLIC_RAZORPAY_MODE || 'test',
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_SERVICE_ACCOUNT_B64: process.env.FIREBASE_SERVICE_ACCOUNT_B64,
    NODE_ENV: process.env.NODE_ENV,
  })

  if (!parsed.success) {
    // Return safe fallback or log schema errors
    return {
      RAZORPAY_MODE: mode,
      RAZORPAY_KEY_ID: keyId,
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
      RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      NEXT_PUBLIC_RAZORPAY_KEY_ID: keyId,
      NEXT_PUBLIC_RAZORPAY_MODE: mode,
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    } as AppEnv
  }

  return parsed.data
}

export const env = validateEnv()

/**
 * Returns true if Razorpay is running in TEST MODE.
 */
export function isRazorpayTestMode(): boolean {
  return (process.env.RAZORPAY_MODE || 'test') === 'test'
}
