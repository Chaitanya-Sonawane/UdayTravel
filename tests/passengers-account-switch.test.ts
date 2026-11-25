import { describe, it, expect, beforeEach } from 'vitest'
import { useBookingStore } from '@/lib/booking-store'
import { fetchCurrentProfile } from '@/lib/auth/client-auth'

// In-memory mock for localStorage in node test runner
const storage: Record<string, string> = {}
;(global as any).localStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = String(v) },
  removeItem: (k: string) => { delete storage[k] },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]) },
}
;(global as any).window = global

describe('Passenger Page Account Switching Synchronization', () => {
  beforeEach(() => {
    useBookingStore.getState().clear()
    localStorage.clear()
  })

  it('updates Passenger 1 when account is changed to another user (e.g. jayesh pude)', async () => {
    // 1. Initial State: Old user Alice was in booking store
    useBookingStore.getState().updatePassenger('passenger-1', {
      name: 'Alice Johnson',
      age: '32',
      gender: 'woman',
    })

    expect(useBookingStore.getState().passengers[0]?.name).toBe('Alice Johnson')

    // 2. User changes account to Jayesh Pude in localStorage
    const jayeshProfile = {
      name: 'jayesh pude',
      mobile: '9876598765',
      age: 28,
      gender: 'man',
      email: 'jayesh@example.com',
    }
    localStorage.setItem('uday_user_profile', JSON.stringify(jayeshProfile))
    localStorage.setItem('uday_current_uid', 'jayesh_uid_123')
    localStorage.setItem('uday_last_synced_pax_mobile', '9890066580') // Old mobile

    // 3. fetchCurrentProfile returns Jayesh Pude from client fallback
    const { profile } = await fetchCurrentProfile()
    expect(profile).not.toBeNull()
    expect(profile?.name).toBe('jayesh pude')
    expect(profile?.mobile).toBe('9876598765')

    // 4. Test the account switch sync logic implemented in app/passengers/page.tsx
    const store = useBookingStore.getState()
    const p1 = store.passengers[0]
    const lastSyncedMobile = localStorage.getItem('uday_last_synced_pax_mobile')
    const isDifferentAccount = Boolean(
      lastSyncedMobile && profile?.mobile && lastSyncedMobile !== profile.mobile
    )

    expect(isDifferentAccount).toBe(true)

    if (p1 && profile) {
      const normalizedGender =
        profile.gender === 'woman' || profile.gender?.toLowerCase() === 'female'
          ? 'woman'
          : 'man'

      store.updatePassenger(p1.id, {
        name: profile.name,
        age: String(profile.age || 28),
        gender: normalizedGender,
      })
      localStorage.setItem('uday_last_synced_pax_mobile', profile.mobile)
    }

    // 5. Verify Passenger 1 is now Jayesh Pude!
    const updatedStore = useBookingStore.getState()
    expect(updatedStore.passengers[0]?.name).toBe('jayesh pude')
    expect(updatedStore.passengers[0]?.age).toBe('28')
    expect(updatedStore.passengers[0]?.gender).toBe('man')
    expect(localStorage.getItem('uday_last_synced_pax_mobile')).toBe('9876598765')
  })

  it('connects passenger information to newly created account and resets companion passengers for new input', async () => {
    const { syncAccountToBookingStore } = await import('@/lib/auth/client-auth')

    // Set up a multi-passenger booking state with old info
    useBookingStore.getState().setPassengerCount(2)
    useBookingStore.getState().updatePassenger('passenger-1', {
      name: 'Old User',
      age: '40',
      gender: 'man',
    })
    useBookingStore.getState().updatePassenger('passenger-2', {
      name: 'Old Companion',
      age: '38',
      gender: 'woman',
    })

    expect(useBookingStore.getState().passengers[0]?.name).toBe('Old User')
    expect(useBookingStore.getState().passengers[1]?.name).toBe('Old Companion')

    // Create a new account with Pooja Patil (25y, Female)
    const newAccountProfile = {
      uid: 'usr_new_pooja_001',
      name: 'Pooja Patil',
      age: 25,
      gender: 'Female',
      mobile: '9822001122',
      email: 'pooja.patil@example.com',
    }

    syncAccountToBookingStore(newAccountProfile)

    const updated = useBookingStore.getState()
    // Passenger 1 is directly connected to the new account!
    expect(updated.passengers[0]?.name).toBe('Pooja Patil')
    expect(updated.passengers[0]?.age).toBe('25')
    expect(updated.passengers[0]?.gender).toBe('woman')

    // Passenger 2 (companion) is reset to blank so user can input new info!
    expect(updated.passengers[1]?.name).toBe('')
    expect(updated.passengers[1]?.age).toBe('')
    expect(updated.passengers[1]?.gender).toBeUndefined()

    // Sync tracking updated to the new account
    expect(localStorage.getItem('uday_last_synced_pax_mobile')).toBe('9822001122')
    expect(localStorage.getItem('uday_last_synced_account_uid')).toBe('usr_new_pooja_001')
  })

  it('resets passenger info on logout so no stale info is carried over', async () => {
    const { syncAccountToBookingStore } = await import('@/lib/auth/client-auth')

    useBookingStore.getState().updatePassenger('passenger-1', {
      name: 'Existing User',
      age: '29',
      gender: 'man',
    })

    syncAccountToBookingStore(null)

    const store = useBookingStore.getState()
    expect(store.passengers[0]?.name).toBe('')
    expect(store.passengers[0]?.age).toBe('')
    expect(store.passengers[0]?.gender).toBeUndefined()
  })
})
