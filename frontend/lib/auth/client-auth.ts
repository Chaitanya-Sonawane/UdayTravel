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
  const credential = await createUserWithEmailAndPassword(auth, emailToUse, password)
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
  const credential = await signInWithEmailAndPassword(auth, emailToUse, password)
  return credential.user
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
    return {
      profile: data.profile || null,
      savedPassengers: data.savedPassengers || [],
    }
  } catch (err) {
    console.warn('[client-auth] Failed to fetch current profile:', err)
    return { profile: null, savedPassengers: [] }
  }
}
