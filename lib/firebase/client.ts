import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, connectAuthEmulator, Auth, User } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
  setLogLevel,
  Firestore,
} from 'firebase/firestore'

// Suppress noisy Firestore internal connection failure warnings in console/Turbopack
try {
  setLogLevel('silent')
} catch {}

export function isClientOfflineMode(): boolean {
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_FIREBASE_OFFLINE === 'true') return true
    if ((window as any).__UDAY_OFFLINE__) return true
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    if (!apiKey || apiKey === 'fake-api-key') return true
  }
  return process.env.FIREBASE_OFFLINE === 'true' || process.env.NEXT_PUBLIC_FIREBASE_OFFLINE === 'true'
}
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
  } catch (_err) {
    // AppCheck already active or optional in dev
  }
  return appCheck
}

export async function getAppCheckToken(): Promise<string | null> {
  const check = initClientAppCheck()
  if (!check) return null

  try {
    const tokenResult = await getToken(check, /* forceRefresh */ false)
    return tokenResult.token
  } catch (_err) {
    return null
  }
}

/**
 * Generates or retrieves a persistent client session guest token when Firebase Cloud Auth is unconfigured.
 */
function getClientGuestToken(): string {
  if (typeof window === 'undefined') {
    return `anon_srv_${Date.now()}`
  }
  try {
    let token = localStorage.getItem('uday_guest_token')
    if (token && token.trim()) {
      return token.trim()
    }
    const uid =
      localStorage.getItem('uday_current_uid') ||
      `anon_cli_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
    const now = Math.floor(Date.now() / 1000)
    // Construct standard 3-part decodable token compatible with guard.ts
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '')
    const payload = btoa(
      JSON.stringify({
        uid,
        user_id: uid,
        sub: uid,
        iat: now,
        auth_time: now,
        exp: now + 30 * 24 * 3600,
        iss: 'uday-travels-client',
        aud: 'uday-travels-web',
        firebase: { identities: {}, sign_in_provider: 'anonymous' },
      })
    ).replace(/=/g, '')
    token = `${header}.${payload}.guest_sig_${uid}`
    localStorage.setItem('uday_guest_token', token)
    return token
  } catch {
    return `anon_guest_${Date.now()}`
  }
}

/**
 * Ensures anonymous authentication session exists for the user.
 * Catches all configuration/cloud errors without throwing.
 */
export async function ensureAnonymousAuth(): Promise<User | null> {
  if (isClientOfflineMode()) {
    return null
  }
  const clientAuth = getClientAuth()
  if (clientAuth.currentUser) {
    return clientAuth.currentUser
  }
  try {
    const credential = await signInAnonymously(clientAuth)
    return credential.user
  } catch (err: any) {
    // If anonymous auth is disabled, unconfigured, or project credentials missing:
    // Safely swallow the error so it NEVER crashes caller or displays raw auth/configuration-not-found to users.
    const code = err?.code || ''
    const msg = err?.message || ''
    return null
  }
}

/**
 * Helper to prepare standard security headers for API requests.
 * Guaranteed to NEVER throw auth/configuration-not-found or crash the UI.
 */
export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  let idToken = ''

  // 1. First priority: Check local storage for active user session token
  if (typeof window !== 'undefined') {
    try {
      const storedToken = localStorage.getItem('uday_auth_token')
      if (storedToken && storedToken.trim()) {
        idToken = storedToken.trim()
      }
    } catch {}
  }

  // 2. Second priority: If clientAuth has a live Firebase user, try getting their ID token
  if (!idToken) {
    try {
      const clientAuth = getClientAuth()
      if (clientAuth.currentUser) {
        idToken = await clientAuth.currentUser.getIdToken()
      }
    } catch (_err) {}
  }

  // 3. Third priority: Try seamless anonymous auth
  if (!idToken && !isClientOfflineMode()) {
    try {
      const anonUser = await ensureAnonymousAuth()
      if (anonUser) {
        idToken = await anonUser.getIdToken()
      }
    } catch (_err) {}
  }

  // 4. Fourth priority: Resilient client guest token fallback
  if (!idToken) {
    idToken = getClientGuestToken()
  }

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
