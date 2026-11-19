import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { getClientAuth, getClientDb, getApiAuthHeaders } from '../firebase/client'
import { UserProfile, AccountCreateInput, SavedPassenger } from '../schema/account'
import { parseAuthError, UdayAuthError } from './auth-errors'

export function markDeviceAccountCreated(profile?: Partial<UserProfile>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('uday_account_created', 'true')
    localStorage.setItem('uday_has_account', 'true')
    document.cookie = 'uday_account_created=true; path=/; max-age=31536000; SameSite=Lax'
    if (profile) {
      if (profile.mobile) localStorage.setItem('uday_user_mobile', profile.mobile)
      if (profile.name) localStorage.setItem('uday_user_name', profile.name)
      localStorage.setItem('uday_user_profile', JSON.stringify(profile))
    }
  } catch {
    // ignore storage quota / sandbox warnings
  }
}

export function hasDeviceAccount(): boolean {
  if (typeof window === 'undefined') return false

  try {
    // 1. Explicit local storage flags
    if (
      localStorage.getItem('uday_account_created') === 'true' ||
      localStorage.getItem('uday_has_account') === 'true'
    ) {
      return true
    }

    // 2. Cookie flag
    if (document.cookie.includes('uday_account_created=true')) {
      return true
    }

    // 3. Stored profile or mobile
    if (
      localStorage.getItem('uday_user_profile') ||
      localStorage.getItem('uday_user_mobile')
    ) {
      return true
    }

    // 4. Firebase Auth localStorage inspection
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('firebase:authUser:')) {
        const val = localStorage.getItem(key)
        if (val) {
          const parsed = JSON.parse(val)
          if (parsed && (parsed.email || parsed.phoneNumber || parsed.isAnonymous === false)) {
            return true
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return false
}

export function normalizeAuthIdentifier(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase()
  if (/^[6-9]\d{9}$/.test(trimmed)) {
    return `${trimmed}@udaytravel.in`
  }
  return trimmed
}

export async function signUpUser(
  identifier: string,
  password: string,
  profile: AccountCreateInput
): Promise<{ user: User; profile: UserProfile }> {
  const auth = getClientAuth()
  try {
    await setPersistence(auth, browserLocalPersistence)
  } catch {}

  const emailToUse = normalizeAuthIdentifier(profile.email || identifier)
  let credential
  try {
    credential = await createUserWithEmailAndPassword(auth, emailToUse, password)
  } catch (err: unknown) {
    const parsed = parseAuthError(err, { identifier: profile.mobile || identifier, mode: 'register' })
    console.warn(`[Client Auth] Registration error: ${parsed.code} - ${parsed.message}`)
    throw new UdayAuthError(parsed)
  }
  const user = credential.user

  const now = new Date().toISOString()
  const initialSavedPassenger: SavedPassenger = {
    id: `sp_self_${user.uid}`,
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    isSelf: true,
  }

  // 1. Direct write to live Firestore users collection from client SDK
  try {
    const db = getClientDb()
    await setDoc(
      doc(db, 'users', user.uid),
      {
        name: profile.name,
        mobile: profile.mobile,
        age: profile.age,
        gender: profile.gender,
        email: profile.email || emailToUse,
        savedPassengers: [initialSavedPassenger],
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    )
  } catch (fsErr) {
    console.warn('[Firestore] Client setDoc warning (fallback to server API):', fsErr)
  }

  // 2. Save profile to Firestore repository via /api/account
  const headers = await getApiAuthHeaders()
  const res = await fetch('/api/account', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: profile.name,
      mobile: profile.mobile,
      age: profile.age,
      gender: profile.gender,
      email: profile.email || emailToUse,
    }),
  })

  let userProfile: UserProfile
  if (res.ok) {
    const data = await res.json()
    userProfile = data.profile || {
      uid: user.uid,
      name: profile.name,
      mobile: profile.mobile,
      age: profile.age,
      gender: profile.gender,
      email: profile.email || emailToUse,
      savedPassengers: [initialSavedPassenger],
      createdAt: now,
      updatedAt: now,
    }
  } else {
    userProfile = {
      uid: user.uid,
      name: profile.name,
      mobile: profile.mobile,
      age: profile.age,
      gender: profile.gender,
      email: profile.email || emailToUse,
      savedPassengers: [initialSavedPassenger],
      createdAt: now,
      updatedAt: now,
    }
  }

  markDeviceAccountCreated(userProfile)

  return { user, profile: userProfile }
}

export async function signInUser(
  identifier: string,
  password: string
): Promise<User> {
  const auth = getClientAuth()
  try {
    await setPersistence(auth, browserLocalPersistence)
  } catch {}

  const emailToUse = normalizeAuthIdentifier(identifier)
  try {
    const credential = await signInWithEmailAndPassword(auth, emailToUse, password)
    markDeviceAccountCreated()
    return credential.user
  } catch (err: unknown) {
    const parsed = parseAuthError(err, { identifier, mode: 'login' })
    console.warn(`[Client Auth] Sign-in notice: ${parsed.code} - ${parsed.message}`)
    throw new UdayAuthError(parsed)
  }
}

export async function signOutUser(): Promise<void> {
  const auth = getClientAuth()
  await signOut(auth)
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  const auth = getClientAuth()
  return onAuthStateChanged(auth, callback)
}

export async function fetchCurrentProfile(): Promise<{
  profile: UserProfile | null
  savedPassengers: SavedPassenger[]
}> {
  try {
    const headers = await getApiAuthHeaders()
    const res = await fetch('/api/account', { headers })
    if (!res.ok) {
      return { profile: null, savedPassengers: [] }
    }
    const data = await res.json()
    if (data.profile) {
      markDeviceAccountCreated(data.profile)
    }
    return {
      profile: data.profile || null,
      savedPassengers: data.savedPassengers || [],
    }
  } catch (err) {
    console.warn('[client-auth] Failed to fetch current profile:', err)
    return { profile: null, savedPassengers: [] }
  }
}
