import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, connectAuthEmulator, Auth, User } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaV3Provider, getToken, AppCheck } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'fake-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'uday-travels-dev.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'uday-travels-dev',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let appCheck: AppCheck | null = null

export function getClientApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApp()
  }
  return app
}

export function getClientAuth(): Auth {
  if (!auth) {
    const firebaseApp = getClientApp()
    auth = getAuth(firebaseApp)

    const authEmulatorHost =
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST

    if (authEmulatorHost && typeof window !== 'undefined') {
      const url = authEmulatorHost.startsWith('http')
        ? authEmulatorHost
        : `http://${authEmulatorHost}`
      connectAuthEmulator(auth, url, { disableWarnings: true })
    }
  }
  return auth
}

export function getClientDb(): Firestore {
  if (!db) {
    const firebaseApp = getClientApp()
    db = getFirestore(firebaseApp)

    const firestoreEmulatorHost =
      process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ||
      process.env.FIRESTORE_EMULATOR_HOST

    if (firestoreEmulatorHost && typeof window !== 'undefined') {
      const [host, portStr] = firestoreEmulatorHost.split(':')
      const port = portStr ? parseInt(portStr, 10) : 8080
      connectFirestoreEmulator(db, host || '127.0.0.1', port)
    }
  }
  return db
}

export function initClientAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null
  if (appCheck) return appCheck

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  if (!siteKey) return null

  try {
    const firebaseApp = getClientApp()
    appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    })
  } catch (err) {
    console.warn('[Firebase AppCheck] Initialization failed or already active:', err)
  }
  return appCheck
}

export async function getAppCheckToken(): Promise<string | null> {
  const check = initClientAppCheck()
  if (!check) return null

  try {
    const tokenResult = await getToken(check, /* forceRefresh */ false)
    return tokenResult.token
  } catch (err) {
    console.warn('[Firebase AppCheck] Could not retrieve token:', err)
    return null
  }
}

/**
 * Ensures anonymous authentication session exists for the user.
 */
export async function ensureAnonymousAuth(): Promise<User> {
  const clientAuth = getClientAuth()
  if (clientAuth.currentUser) {
    return clientAuth.currentUser
  }
  const credential = await signInAnonymously(clientAuth)
  return credential.user
}

/**
 * Helper to prepare standard security headers for API requests.
 */
export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const user = await ensureAnonymousAuth()
  const idToken = await user.getIdToken()
  const appCheckToken = await getAppCheckToken()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  }

  if (appCheckToken) {
    headers['X-Firebase-AppCheck'] = appCheckToken
  }

  return headers
}
