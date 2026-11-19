import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, connectAuthEmulator, Auth, User } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
  Firestore,
} from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator, Database } from 'firebase/database'
import { initializeAppCheck, ReCaptchaV3Provider, getToken, AppCheck } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'fake-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'udaytravels-ad458.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'udaytravels-ad458',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:95772840316:web:0f5487897a4764ee4594f9',
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    'https://udaytravels-ad458-default-rtdb.firebaseio.com',
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let rtdb: Database
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
    try {
      db = initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true,
      })
    } catch {
      db = getFirestore(firebaseApp)
    }

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

export function getClientRtdb(): Database {
  if (!rtdb) {
    const firebaseApp = getClientApp()
    rtdb = getDatabase(firebaseApp)

    const rtdbEmulatorHost =
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST ||
      process.env.FIREBASE_DATABASE_EMULATOR_HOST

    if (rtdbEmulatorHost && typeof window !== 'undefined') {
      const [host, portStr] = rtdbEmulatorHost.split(':')
      const port = portStr ? parseInt(portStr, 10) : 9000
      connectDatabaseEmulator(rtdb, host || '127.0.0.1', port)
    }
  }
  return rtdb
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
