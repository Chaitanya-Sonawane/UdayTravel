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
import { useBookingStore } from '@/lib/booking-store'

export function syncAccountToBookingStore(
  profile?: { name?: string; age?: number | string; gender?: string; mobile?: string; email?: string; uid?: string } | null
): void {
  if (typeof window === 'undefined') return
  try {
    const store = useBookingStore.getState()
    if (!profile || !profile.name) {
      // User logged out: clear passenger info from booking store
      const p1 = store.passengers?.[0]
      if (p1) {
        store.updatePassenger(p1.id, {
          name: '',
          age: '',
          gender: undefined,
        })
      }
      if (store.passengers && store.passengers.length > 1) {
        for (let i = 1; i < store.passengers.length; i++) {
          const p = store.passengers[i]
          if (p) {
            store.updatePassenger(p.id, {
              name: '',
              age: '',
              gender: undefined,
            })
          }
        }
      }
      localStorage.removeItem('uday_last_synced_pax_mobile')
      localStorage.removeItem('uday_last_synced_account_uid')
      try {
        sessionStorage.removeItem('uday-booking-store')
      } catch {}
      return
    }

    const normalizedGender =
      profile.gender?.toLowerCase() === 'woman' || profile.gender?.toLowerCase() === 'female'
        ? 'woman'
        : 'man'

    // 1. Connect Passenger 1 directly to the newly created/logged in account
    const p1 = store.passengers?.[0]
    if (p1) {
      store.updatePassenger(p1.id, {
        name: profile.name,
        age: String(profile.age || 28),
        gender: normalizedGender,
      })
    }

    // 2. Reset companion passengers (Passenger 2+) to allow inputting fresh info
    if (store.passengers && store.passengers.length > 1) {
      for (let i = 1; i < store.passengers.length; i++) {
        const p = store.passengers[i]
        if (p) {
          store.updatePassenger(p.id, {
            name: '',
            age: '',
            gender: undefined,
          })
        }
      }
    }

    if (profile.mobile) {
      localStorage.setItem('uday_last_synced_pax_mobile', profile.mobile)
    }
    if (profile.uid) {
      localStorage.setItem('uday_last_synced_account_uid', profile.uid)
    }
  } catch (err) {
    console.warn('[syncAccountToBookingStore] Notice:', err)
  }
}

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
      syncAccountToBookingStore(profile as any)
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

export function isUserLoggedIn(user?: User | null): boolean {
  if (user && !user.isAnonymous) return true
  try {
    const auth = getClientAuth()
    if (auth.currentUser && !auth.currentUser.isAnonymous) return true
  } catch {}
  if (typeof window === 'undefined') return false
  try {
    const token = localStorage.getItem('uday_auth_token')
    const uid = localStorage.getItem('uday_current_uid')
    if (token && uid) return true
  } catch {}
  return false
}

export function normalizeAuthIdentifier(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase()
  if (/^[6-9]\d{9}$/.test(trimmed)) {
    return `${trimmed}@udaytravel.in`
  }
  return trimmed
}

function createSyntheticUser(
  userData: { uid: string; email?: string | null; displayName?: string | null; phoneNumber?: string | null },
  token: string
): User {
  return {
    uid: userData.uid,
    email: userData.email || null,
    displayName: userData.displayName || null,
    phoneNumber: userData.phoneNumber || null,
    photoURL: null,
    providerId: 'password',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => token,
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
  } as unknown as User
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
  let user: User | null = null

  // 1. Try Firebase Cloud Auth first
  try {
    const credential = await createUserWithEmailAndPassword(auth, emailToUse, password)
    user = credential.user
  } catch (fbErr: any) {
    const code = fbErr?.code || ''
    const msg = fbErr?.message || ''
    const isCloudConfigIssue =
      code === 'auth/configuration-not-found' ||
      code === 'auth/operation-not-allowed' ||
      code === 'auth/api-key-not-valid' ||
      code === 'auth/invalid-api-key' ||
      code === 'auth/unauthorized-domain' ||
      code === 'auth/network-request-failed' ||
      msg.includes('CONFIGURATION_NOT_FOUND') ||
      msg.includes('OPERATION_NOT_ALLOWED')

    if (!isCloudConfigIssue && (code === 'auth/email-already-in-use' || code === 'auth/weak-password' || code === 'auth/invalid-email')) {
      const parsed = parseAuthError(fbErr, { identifier: profile.mobile || identifier, mode: 'register' })
      throw new UdayAuthError(parsed)
    }

    // 2. Seamless server fallback when cloud auth is unconfigured
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: profile.name,
        mobile: profile.mobile,
        age: profile.age,
        gender: profile.gender,
        email: emailToUse,
        password,
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      const parsed = parseAuthError(data.error || 'Registration failed', { identifier: profile.mobile || identifier, mode: 'register' })
      throw new UdayAuthError(parsed)
    }

    // Store local session tokens
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('uday_auth_token', data.token)
        localStorage.setItem('uday_current_uid', data.user.uid)
        document.cookie = `uday_auth_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`
        window.dispatchEvent(new CustomEvent('uday_auth_changed', { detail: data.user }))
      } catch {}
    }

    markDeviceAccountCreated(data.profile)
    return {
      user: createSyntheticUser(data.user, data.token),
      profile: data.profile,
    }
  }

  const now = new Date().toISOString()
  const initialSavedPassenger: SavedPassenger = {
    id: `sp_self_${user.uid}`,
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    isSelf: true,
  }

  // Save profile to repository via /api/account
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

  let userProfile: UserProfile = {
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
  if (res.ok) {
    const data = await res.json()
    if (data.profile) userProfile = data.profile
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

  // 1. Try Firebase Client Auth
  try {
    const credential = await signInWithEmailAndPassword(auth, emailToUse, password)
    markDeviceAccountCreated()
    return credential.user
  } catch (fbErr: any) {
    const code = fbErr?.code || ''
    const msg = fbErr?.message || ''
    const isCloudConfigIssue =
      code === 'auth/configuration-not-found' ||
      code === 'auth/operation-not-allowed' ||
      code === 'auth/api-key-not-valid' ||
      code === 'auth/invalid-api-key' ||
      code === 'auth/unauthorized-domain' ||
      code === 'auth/network-request-failed' ||
      msg.includes('CONFIGURATION_NOT_FOUND') ||
      msg.includes('OPERATION_NOT_ALLOWED')

    if (!isCloudConfigIssue && (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential')) {
      const parsed = parseAuthError(fbErr, { identifier, mode: 'login' })
      throw new UdayAuthError(parsed)
    }

    // 2. Seamless server fallback when cloud auth is unconfigured
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      const parsed = parseAuthError(data.error || 'Login failed', { identifier, mode: 'login' })
      throw new UdayAuthError(parsed)
    }

    // Store local session tokens
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('uday_auth_token', data.token)
        localStorage.setItem('uday_current_uid', data.user.uid)
        document.cookie = `uday_auth_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`
        window.dispatchEvent(new CustomEvent('uday_auth_changed', { detail: data.user }))
      } catch {}
    }

    markDeviceAccountCreated(data.profile)
    return createSyntheticUser(data.user, data.token)
  }
}

export async function signOutUser(): Promise<void> {
  const auth = getClientAuth()
  try {
    await signOut(auth)
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('uday_auth_token')
      localStorage.removeItem('uday_current_uid')
      localStorage.removeItem('uday_user_profile')
      localStorage.removeItem('uday_last_synced_pax_mobile')
      localStorage.removeItem('uday_last_synced_account_uid')
      localStorage.removeItem('uday-booking-store')
      document.cookie = 'uday_auth_token=; path=/; max-age=0; SameSite=Lax'
      syncAccountToBookingStore(null)
      window.dispatchEvent(new CustomEvent('uday_auth_changed', { detail: null }))
    } catch {}
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  const auth = getClientAuth()

  // 1. Initial notification from local session if user is logged in
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('uday_auth_token')
    const uid = localStorage.getItem('uday_current_uid')
    if (token && uid && !auth.currentUser) {
      const profileStr = localStorage.getItem('uday_user_profile')
      const profile = profileStr ? JSON.parse(profileStr) : null
      const synUser = createSyntheticUser(
        {
          uid,
          email: profile?.email || `${profile?.mobile || uid}@udaytravel.in`,
          displayName: profile?.name || 'Passenger',
          phoneNumber: profile?.mobile ? `+91${profile.mobile}` : null,
        },
        token
      )
      callback(synUser)
    }
  }

  // 2. Firebase onAuthStateChanged
  const unsubFb = onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(user)
    } else if (typeof window !== 'undefined') {
      const token = localStorage.getItem('uday_auth_token')
      const uid = localStorage.getItem('uday_current_uid')
      if (token && uid) {
        const profileStr = localStorage.getItem('uday_user_profile')
        const profile = profileStr ? JSON.parse(profileStr) : null
        callback(
          createSyntheticUser(
            {
              uid,
              email: profile?.email || `${profile?.mobile || uid}@udaytravel.in`,
              displayName: profile?.name || 'Passenger',
              phoneNumber: profile?.mobile ? `+91${profile.mobile}` : null,
            },
            token
          )
        )
      } else {
        callback(null)
      }
    } else {
      callback(null)
    }
  })

  // 3. Listen for local auth changes
  const handleLocalChange = (e: any) => {
    const detail = e.detail
    if (detail) {
      const token = (typeof window !== 'undefined' && localStorage.getItem('uday_auth_token')) || ''
      callback(createSyntheticUser(detail, token))
    } else {
      callback(null)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('uday_auth_changed', handleLocalChange)
  }

  return () => {
    unsubFb()
    if (typeof window !== 'undefined') {
      window.removeEventListener('uday_auth_changed', handleLocalChange)
    }
  }
}

let cachedProfileResult: {
  timestamp: number
  data: { profile: UserProfile | null; savedPassengers: SavedPassenger[] }
} | null = null

let inFlightProfilePromise: Promise<{
  profile: UserProfile | null
  savedPassengers: SavedPassenger[]
}> | null = null

export function invalidateProfileCache(): void {
  cachedProfileResult = null
  inFlightProfilePromise = null
}

export async function fetchCurrentProfile(forceRefresh = false): Promise<{
  profile: UserProfile | null
  savedPassengers: SavedPassenger[]
}> {
  if (!forceRefresh && cachedProfileResult && Date.now() - cachedProfileResult.timestamp < 15000) {
    return cachedProfileResult.data
  }

  if (!forceRefresh && inFlightProfilePromise) {
    return inFlightProfilePromise
  }

  inFlightProfilePromise = (async () => {
    try {
      const headers = await getApiAuthHeaders()
      const res = await fetch('/api/account', { headers })
      if (res.ok) {
        const data = await res.json()
        if (data.profile) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('uday_user_profile', JSON.stringify(data.profile))
              if (data.profile.name) localStorage.setItem('uday_user_name', data.profile.name)
              if (data.profile.mobile) localStorage.setItem('uday_user_mobile', data.profile.mobile)
              localStorage.setItem('uday_account_created', 'true')
              localStorage.setItem('uday_has_account', 'true')
            } catch {}
          }
          const result = {
            profile: data.profile,
            savedPassengers: data.savedPassengers || [],
          }
          cachedProfileResult = { timestamp: Date.now(), data: result }
          return result
        }
      }
    } catch (_err) {
      // API account endpoint notice suppressed
    } finally {
      inFlightProfilePromise = null
    }

    return {
      profile: null,
      savedPassengers: [],
    }
  })()

  const fetched = await inFlightProfilePromise
  if (fetched.profile) return fetched

  // Robust fallback to active client session stored profile
  if (typeof window !== 'undefined') {
    try {
      const localProfileStr = localStorage.getItem('uday_user_profile')
      if (localProfileStr) {
        const localProfile = JSON.parse(localProfileStr)
        return {
          profile: localProfile,
          savedPassengers: localProfile.savedPassengers || [],
        }
      }
    } catch {}
  }

  return { profile: null, savedPassengers: [] }
}
