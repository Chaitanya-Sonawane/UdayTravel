'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  LockKeyhole,
  UserRound,
  Users,
  Plus,
  Trash2,
  LogOut,
  Mail,
  Phone,
  Ticket,
  Sparkles,
  Menu,
  Wallet,
  RefreshCw,
  BusFront,
} from 'lucide-react'
import {
  subscribeToAuth,
  signUpUser,
  signInUser,
  signOutUser,
  fetchCurrentProfile,
  hasDeviceAccount,
  syncAccountToBookingStore,
} from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'
import { UserProfile, SavedPassenger } from '@/lib/schema/account'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { parseAuthError, UdayAuthError, type FormattedAuthError } from '@/lib/auth/auth-errors'
import { ThemedErrorBanner } from '@/components/ui/ThemedErrorBanner'
import { ThemedDropdown } from '@/components/ui/ThemedDropdown'
import NavDrawer from '@/components/navigation/NavDrawer'

function formatDisplayMobile(val: string | null | undefined): string {
  if (!val) return '—'
  const digits = val.replace(/\D/g, '')
  if (digits.length >= 10) {
    return `+91 ${digits.slice(-10)}`
  }
  return val
}

export function AccountPageContent({
  initialUser = null,
  initialLoadingAuth = true,
  initialWallet = null,
  initialAuthMode,
}: {
  initialUser?: User | null
  initialLoadingAuth?: boolean
  initialWallet?: {
    balancePaise: number
    availablePaise: number
    balanceDisplay: string
    availableDisplay: string
  } | null
  initialAuthMode?: 'register' | 'login'
} = {}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectUrl = searchParams.get('redirect')
  const modeParam = searchParams.get('mode')

  const [currentUser, setCurrentUser] = useState<User | null>(initialUser)
  const [loadingAuth, setLoadingAuth] = useState(initialLoadingAuth)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [savedPassengers, setSavedPassengers] = useState<SavedPassenger[]>([])
  const [wallet, setWallet] = useState<{
    balancePaise: number
    availablePaise: number
    balanceDisplay: string
    availableDisplay: string
  } | null>(initialWallet)
  const [loadingWallet, setLoadingWallet] = useState(false)

  // Auth Mode: 'register' | 'login'
  const [authMode, setAuthMode] = useState<'register' | 'login'>(() => {
    if (initialAuthMode) return initialAuthMode
    if (modeParam === 'login' || modeParam === 'register') return modeParam
    return 'register'
  })

  useEffect(() => {
    if (modeParam === 'login' || modeParam === 'register') {
      setAuthMode(modeParam)
    } else if (hasDeviceAccount()) {
      setAuthMode('login')
    }
  }, [modeParam])

  // If already authenticated and redirected here, automatically continue
  useEffect(() => {
    if (!loadingAuth && currentUser && !currentUser.isAnonymous && redirectUrl) {
      router.push(redirectUrl)
    }
  }, [loadingAuth, currentUser, redirectUrl, router])

  // Register form fields
  const [regName, setRegName] = useState('')
  const [regGender, setRegGender] = useState<'Male' | 'Female' | ''>('')
  const [regAge, setRegAge] = useState('')
  const [regMobile, setRegMobile] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regIdentityConsent, setRegIdentityConsent] = useState(false)
  const [regTermsConsent, setRegTermsConsent] = useState(false)

  // Login form fields
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Add passenger modal / form
  const [showAddPassenger, setShowAddPassenger] = useState(false)
  const [newPassName, setNewPassName] = useState('')
  const [newPassAge, setNewPassAge] = useState('25')
  const [newPassGender, setNewPassGender] = useState<'Male' | 'Female'>('Female')
  const [savingPass, setSavingPass] = useState(false)

  // Delete passenger confirmation state
  const [passengerToDelete, setPassengerToDelete] = useState<SavedPassenger | null>(null)
  const [isDeletingPassenger, setIsDeletingPassenger] = useState(false)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [authError, setAuthError] = useState<FormattedAuthError | null>(null)
  const [passengerNotice, setPassengerNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [sheet, setSheet] = useState(false)

  // Clear errors when switching tabs
  const handleSwitchTab = (tab: 'login' | 'register') => {
    setAuthMode(tab)
    setErrorMessage('')
    setAuthError(null)
  }

  // Handle Action Button from Error Banner (e.g. switch to login when mobile already exists)
  const handleAuthAction = () => {
    if (!authError?.action) return
    if (authError.action.type === 'switch_to_login') {
      setAuthMode('login')
      const targetIdent = regMobile.trim() || regEmail.trim()
      if (targetIdent) {
        setLoginIdentifier(targetIdent)
      }
      setAuthError(null)
      setErrorMessage('')
      setTimeout(() => {
        document.getElementById('loginPassword')?.focus()
      }, 100)
    } else if (authError.action.type === 'switch_to_register') {
      setAuthMode('register')
      const cleanIdent = loginIdentifier.replace(/\D/g, '')
      if (cleanIdent.length === 10) {
        setRegMobile(cleanIdent)
      } else if (loginIdentifier.includes('@')) {
        setRegEmail(loginIdentifier.trim())
      }
      setAuthError(null)
      setErrorMessage('')
      setTimeout(() => {
        document.getElementById('regName')?.focus()
      }, 100)
    } else if (authError.action.type === 'contact_support') {
      window.location.href = 'tel:+919890066580'
    } else if (authError.action.type === 'retry') {
      setAuthError(null)
      setErrorMessage('')
    }
  }

  const fetchWallet = async () => {
    setLoadingWallet(true)
    try {
      const headers = await getApiAuthHeaders()
      const res = await fetch('/api/wallet', { headers })
      if (res.ok) {
        const data = await res.json()
        setWallet({
          balancePaise: Number(data.balancePaise) || 0,
          availablePaise: Number(data.availablePaise) || 0,
          balanceDisplay: data.balanceDisplay || '₹0.00',
          availableDisplay: data.availableDisplay || '₹0.00',
        })
      } else {
        setWallet({
          balancePaise: 0,
          availablePaise: 0,
          balanceDisplay: '₹0.00',
          availableDisplay: '₹0.00',
        })
      }
    } catch {
      // Safe catch for wallet fetch
      setWallet({
        balancePaise: 0,
        availablePaise: 0,
        balanceDisplay: '₹0.00',
        availableDisplay: '₹0.00',
      })
    } finally {
      setLoadingWallet(false)
    }
  }

  // 1. Subscribe to Firebase Auth
  useEffect(() => {
    let lastHandledUid: string | null = null

    // Safety timeout in case Firebase auth client takes time to initialize
    const safetyTimer = setTimeout(() => {
      setLoadingAuth(false)
    }, 800)

    const unsub = subscribeToAuth(async (user) => {
      clearTimeout(safetyTimer)
      if (user && !user.isAnonymous) {
        if (lastHandledUid === user.uid) {
          setLoadingAuth(false)
          return
        }
        lastHandledUid = user.uid
        setCurrentUser(user)
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('uday_user_profile')
            if (raw) {
              const p = JSON.parse(raw)
              if (p) {
                setProfile(p)
                if (Array.isArray(p.savedPassengers)) setSavedPassengers(p.savedPassengers)
              }
            }
          } catch {}
        }
        setLoadingAuth(false)
        try {
          const data = await fetchCurrentProfile()
          if (data.profile) {
            setProfile(data.profile)
            syncAccountToBookingStore(data.profile)
          }
          if (data.savedPassengers) setSavedPassengers(data.savedPassengers)
        } catch {
          // Safe catch for profile fetch
        }
        await fetchWallet()
      } else {
        lastHandledUid = null
        setCurrentUser(null)
        setProfile(null)
        setSavedPassengers([])
        setWallet(null)
      }
      setLoadingAuth(false)
    })
    return () => {
      clearTimeout(safetyTimer)
      unsub()
    }
  }, [])

  // 2. Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setAuthError(null)
    setSuccessMessage('')

    if (!regName.trim() || regName.trim().length < 2) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_NAME',
        title: 'Full Name Required',
        message: 'Please enter your full name as per government ID proof.',
        suggestion: 'This name will appear on your bus boarding ticket and manifest.',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }
    if (!regGender) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_GENDER',
        title: 'Gender Selection Required',
        message: 'Please select your gender (Male or Female).',
        suggestion: 'Gender is required for passenger manifest and ID verification.',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }
    if (!regAge.trim()) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_AGE',
        title: 'Age Required',
        message: 'Please enter your age.',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }
    const ageNum = parseInt(regAge, 10)
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_AGE_RESTRICTION',
        title: 'Age Requirement Notice',
        message: 'Primary account holder must be 18 years or above.',
        suggestion: 'Children or seniors travelling with you can be added as co-passengers.',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }
    if (!/^[6-9]\d{9}$/.test(regMobile.trim())) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_MOBILE',
        title: 'Invalid Mobile Number',
        message: 'Enter a valid 10-digit Indian mobile number (e.g. 9890066580).',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }
    if (!regPassword || regPassword.length < 6) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_PASSWORD',
        title: 'Password Too Short',
        message: 'Password must be at least 6 characters long.',
        suggestion: 'Use a secure password with a combination of letters and digits.',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }
    if (!regIdentityConsent) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_CONSENT_IDENTITY',
        title: 'Identity Confirmation Required',
        message: 'Please confirm that your gender and name are accurate as per ID proof.',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }
    if (!regTermsConsent) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_CONSENT_TERMS',
        title: 'Policy Acceptance Required',
        message: 'Please accept the Terms and Conditions and Cancellation Policy to proceed.',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }

    setSubmitting(true)
    try {
      const { profile: createdProfile } = await signUpUser(regMobile, regPassword, {
        name: regName.trim(),
        mobile: regMobile.trim(),
        age: ageNum,
        gender: regGender,
        email: regEmail.trim() || undefined,
      })

      setProfile(createdProfile)
      setSavedPassengers(createdProfile?.savedPassengers || [])
      syncAccountToBookingStore(createdProfile)
      await fetchWallet()
      if (redirectUrl) {
        setSuccessMessage('Opening bus availability...')
        setTimeout(() => {
          router.push(redirectUrl)
        }, 350)
      } else {
        setSuccessMessage('')
      }
    } catch (err: unknown) {
      const formatted =
        err instanceof UdayAuthError
          ? {
              code: err.code,
              title: err.title,
              message: err.message,
              suggestion: err.suggestion,
              action: err.action,
            }
          : parseAuthError(err, { identifier: regMobile, mode: 'register' })

      setAuthError(formatted)
      setErrorMessage(formatted.message)
    } finally {
      setSubmitting(false)
    }
  }

  // 3. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setAuthError(null)
    setSuccessMessage('')

    if (!loginIdentifier.trim()) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_LOGIN_IDENTIFIER',
        title: 'Mobile or Email Required',
        message: 'Please enter your registered mobile number or email.',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }
    if (!loginPassword) {
      const err: FormattedAuthError = {
        code: 'VALIDATION_LOGIN_PASSWORD',
        title: 'Password Required',
        message: 'Please enter your account password.',
      }
      setAuthError(err)
      return setErrorMessage(err.message)
    }

    setSubmitting(true)
    try {
      await signInUser(loginIdentifier.trim(), loginPassword)
      const data = await fetchCurrentProfile()
      if (data.profile) {
        setProfile(data.profile)
        syncAccountToBookingStore(data.profile)
      }
      if (data.savedPassengers) setSavedPassengers(data.savedPassengers)
      await fetchWallet()
      setSuccessMessage(
        redirectUrl
          ? 'Logged in successfully! Opening bus availability...'
          : 'Logged in successfully!'
      )
      if (redirectUrl) {
        setTimeout(() => {
          router.push(redirectUrl)
        }, 350)
      }
    } catch (err: unknown) {
      const formatted =
        err instanceof UdayAuthError
          ? {
              code: err.code,
              title: err.title,
              message: err.message,
              suggestion: err.suggestion,
              action: err.action,
            }
          : parseAuthError(err, { identifier: loginIdentifier, mode: 'login' })

      setAuthError(formatted)
      setErrorMessage(formatted.message)
    } finally {
      setSubmitting(false)
    }
  }

  // 4. Handle Logout
  const handleLogout = async () => {
    await signOutUser()
    syncAccountToBookingStore(null)
    setCurrentUser(null)
    setProfile(null)
    setSavedPassengers([])
    setWallet(null)
    setAuthMode('login')
  }

  // 5. Add Saved Passenger
  const handleAddPassenger = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassengerNotice(null)
    if (!newPassName.trim() || newPassName.trim().length < 2) {
      return setPassengerNotice({
        type: 'error',
        message: 'Please enter a valid passenger name as per government ID proof.',
      })
    }
    const ageNum = parseInt(newPassAge, 10)
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return setPassengerNotice({
        type: 'error',
        message: 'Please enter a valid age between 1 and 120.',
      })
    }

    setSavingPass(true)
    try {
      const headers = await getApiAuthHeaders()
      const res = await fetch('/api/account/passengers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newPassName.trim(),
          age: ageNum,
          gender: newPassGender,
        }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error?.message || 'Failed to save co-passenger')
      }
      const data = await res.json()
      setSavedPassengers(data.savedPassengers || [])
      const savedName = newPassName.trim()
      setNewPassName('')
      setNewPassAge('25')
      setShowAddPassenger(false)
      setPassengerNotice({
        type: 'success',
        message: `${savedName} saved to your travellers directory.`,
      })
    } catch (err: any) {
      setPassengerNotice({
        type: 'error',
        message: err.message || 'Failed to save co-passenger. Please check your connection.',
      })
    } finally {
      setSavingPass(false)
    }
  }

  // 6. Delete Saved Passenger with Confirmation
  const confirmDeletePassenger = async () => {
    if (!passengerToDelete) return
    const targetId = passengerToDelete.id
    const targetName = passengerToDelete.name
    setIsDeletingPassenger(true)
    setPassengerNotice(null)

    // Optimistic removal from UI state
    setSavedPassengers((prev) => prev.filter((p) => p.id !== targetId))

    try {
      const headers = await getApiAuthHeaders()
      const res = await fetch(`/api/account/passengers/${targetId}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error?.message || 'Could not delete passenger')
      }
      const data = await res.json()
      if (data.savedPassengers) {
        setSavedPassengers(data.savedPassengers)
      }
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('uday_user_profile')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed.savedPassengers)) {
              parsed.savedPassengers = parsed.savedPassengers.filter((p: any) => p.id !== targetId)
              localStorage.setItem('uday_user_profile', JSON.stringify(parsed))
            }
          }
        } catch {}
      }
      setPassengerNotice({
        type: 'success',
        message: `${targetName} removed from saved travellers.`,
      })
    } catch (err: any) {
      setPassengerNotice({
        type: 'error',
        message: err.message || 'Could not remove passenger. Please try again.',
      })
      // Rollback on error
      try {
        const data = await fetchCurrentProfile()
        if (data.savedPassengers) setSavedPassengers(data.savedPassengers)
      } catch {}
    } finally {
      setIsDeletingPassenger(false)
      setPassengerToDelete(null)
    }
  }

  // Backwards compatibility if called directly
  const handleDeletePassenger = async (passengerId: string) => {
    const found = savedPassengers.find((p) => p.id === passengerId)
    if (found) {
      setPassengerToDelete(found)
    }
  }

  return (
    <main className="availability-page account-page font-jakarta min-h-screen bg-[#F8FAFC]">
      {/* Header matching availability brand standard */}
      <header className="availability-header account-header sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="account-back" aria-label="Back to home">
            <ArrowLeft size={18} />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.14em] text-gray-700 md:flex">
            <Link href="/availability" className="font-bold text-[#D97706] hover:text-[#B45309]">Book a seat</Link>
            <Link href="/about" className="hover:text-[#D97706] transition-colors">About Us</Link>
            <Link href="/policies" className="hover:text-[#D97706] transition-colors">Policies</Link>
            <Link href="/contact" className="hover:text-[#D97706] transition-colors">Contact Us</Link>
            <button
              type="button"
              onClick={() => setSheet(true)}
              className="!flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-amber-50 border border-[#F8B018]/50 text-[#B45309] hover:bg-[#F8B018] hover:text-black font-semibold text-xs tracking-wider transition-all duration-200 shadow-sm cursor-pointer !w-auto !h-9"
            >
              <UserRound size={14} className="stroke-[2.2]" />
              <span>{currentUser ? (profile?.name || currentUser.displayName || 'My Account') : 'Account'}</span>
              <ChevronDown size={13} className="opacity-75" />
            </button>
          </nav>
          <button
            type="button"
            onClick={() => setSheet((prev) => !prev)}
            aria-label="Open menu"
            className="p-2 text-gray-700 hover:text-[#D97706] hover:bg-amber-50 rounded-xl cursor-pointer bg-transparent border-0 transition-colors"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Hero Section with Purple Coach, yellow eyebrow and two-tone bold typography */}
      <section className="availability-hero !h-[140px] min-h-[140px]">
        <div className="availability-hero-overlay" />
        <div className="availability-hero-copy !py-4 !px-4">
          <h1 className="!text-[2rem] !leading-[0.88]" suppressHydrationWarning>
            {currentUser ? (
              <>
                MY
                <br />
                <span>ACCOUNT.</span>
              </>
            ) : authMode === 'register' ? (
              <>
                CREATE YOUR
                <br />
                <span>ACCOUNT.</span>
              </>
            ) : (
              <>
                WELCOME
                <br />
                <span>BACK.</span>
              </>
            )}
          </h1>
        </div>
      </section>

      {/* Main Form & Profile Content Stack */}
      <div className="account-form w-full max-w-[390px] sm:max-w-[460px] md:max-w-6xl lg:max-w-7xl mx-auto px-3 sm:px-6 md:px-8 -mt-8 relative z-[1] space-y-5 pb-24">
        {/* Loading Spinner */}
        {loadingAuth && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm max-w-[460px] mx-auto">
            <span className="spinner inline-block !border-gray-300 !border-t-[#F8B018] w-6 h-6" />
            <p className="text-xs text-gray-500 mt-2 font-medium">Checking session...</p>
          </div>
        )}

        {/* LOGGED IN: MY ACCOUNT DASHBOARD */}
        {!loadingAuth && currentUser && (
          <>
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 shadow-sm">
                <Check size={18} className="text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Horizontal Personal Profile Card */}
            <section className="profile-card !p-4 sm:!p-5 md:!p-6 bg-white border border-gray-200/90 shadow-sm rounded-2xl space-y-4">
              <div className="profile-card-title border-b border-gray-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#F8B018]">
                  <UserRound size={18} />
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0">Personal Profile</h2>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check size={12} className="text-emerald-600" /> Verified Profile
                </span>
              </div>

              {/* Horizontal layout on desktop, stacked on mobile */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pt-1">
                {/* Left: Avatar & Contact Info */}
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#F8B018] to-[#F59E0B] text-gray-950 font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                    {profile?.name
                      ? profile.name.trim().charAt(0).toUpperCase()
                      : currentUser.displayName
                      ? currentUser.displayName.trim().charAt(0).toUpperCase()
                      : 'U'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider block truncate">
                      Full Name
                    </span>
                    <strong className="block text-base sm:text-lg text-gray-900 font-extrabold truncate">
                      {profile?.name || currentUser.displayName || regName || '—'}
                    </strong>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1 font-mono font-medium text-gray-800">
                        <Phone size={12} className="text-gray-400 shrink-0" />
                        <span className="text-[10px] text-gray-400 font-sans uppercase font-semibold mr-0.5 hidden sm:inline">Mobile Number:</span>
                        {formatDisplayMobile(
                          profile?.mobile || currentUser.phoneNumber || (currentUser.email ? currentUser.email.split('@')[0] : '—')
                        )}
                      </span>
                      {profile?.email && (
                        <span className="flex items-center gap-1 font-mono text-gray-500 text-[11px] sm:text-xs truncate max-w-[200px]">
                          <Mail size={12} className="text-gray-400 shrink-0" />
                          {profile.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Gender, Age, Wallet Balance, Log out */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 md:border-l md:border-gray-100 md:pl-5 lg:pl-6">
                  {/* Gender */}
                  <div className="bg-gray-50/80 px-3 py-1.5 sm:py-2 rounded-xl border border-gray-100 min-w-[70px]">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Gender
                    </span>
                    <div className="mt-0.5">
                      {profile?.gender ? (
                        <span
                          className={`inline-block uppercase text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${
                            profile.gender.toLowerCase() === 'female' || profile.gender.toLowerCase() === 'woman'
                              ? 'bg-pink-100 text-pink-700'
                              : profile.gender.toLowerCase() === 'male' || profile.gender.toLowerCase() === 'man'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {profile.gender}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-900 font-bold">—</span>
                      )}
                    </div>
                  </div>

                  {/* Age */}
                  <div className="bg-gray-50/80 px-3 py-1.5 sm:py-2 rounded-xl border border-gray-100 min-w-[65px]">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Age
                    </span>
                    <strong className="block text-xs sm:text-sm text-gray-900 font-mono font-bold mt-0.5">
                      {profile?.age ? `${profile.age} yrs` : '—'}
                    </strong>
                  </div>

                  {/* Wallet Balance */}
                  <div className="bg-amber-50/70 px-3 py-1.5 sm:py-2 rounded-xl border border-amber-200/60 min-w-[95px]">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
                      Wallet Balance
                    </span>
                    <strong className="block text-xs sm:text-sm text-[#B45309] font-mono font-bold mt-0.5">
                      {loadingWallet ? '...' : (wallet ? wallet.availableDisplay : '₹0.00')}
                    </strong>
                  </div>

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto md:ml-0"
                    title="Log Out of Account"
                  >
                    <LogOut size={14} />
                    <span className="hidden sm:inline">Log out</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 2-Column Responsive Layout on Laptop: Left = Saved Travellers, Right = Wallet + Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Left Column (Laptop: 7 cols or 8 cols): Saved Travellers / Co-Passenger Directory */}
              <div className="md:col-span-7 lg:col-span-8 space-y-5">
                <section className="profile-card !p-4 sm:!p-5 bg-white border border-gray-200/90 shadow-sm rounded-2xl">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users size={18} className="text-[#F8B018] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0 truncate">
                        Saved Travellers <span className="text-gray-500 font-mono text-xs font-normal">({savedPassengers.length})</span>
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddPassenger(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-amber-300/80 px-2.5 sm:px-3 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Plus size={14} className="text-[#B45309]" />
                      <span>Add Co-Passenger</span>
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mb-1">
                    Travellers saved here are available for 1-click selection during booking.
                  </p>

                  {/* Passenger Notice */}
                  {passengerNotice && (
                    <div className="pt-1">
                      <ThemedErrorBanner
                        variant={passengerNotice.type === 'success' ? 'success' : 'error'}
                        message={passengerNotice.message}
                        onDismiss={() => setPassengerNotice(null)}
                        compact
                      />
                    </div>
                  )}

                  {/* Saved Passengers List */}
                  <div className="space-y-2.5 pt-1">
                    {savedPassengers.length === 0 ? (
                      <div className="text-center py-6 px-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                        <Users size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-xs text-gray-600 font-medium">No saved co-passengers yet.</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Click &quot;Add Co-Passenger&quot; to save frequent travellers.</p>
                      </div>
                    ) : (
                      savedPassengers.map((pass) => {
                        const isFemale = pass.gender?.toLowerCase() === 'woman' || pass.gender?.toLowerCase() === 'female'
                        return (
                          <div
                            key={pass.id}
                            className="flex items-center justify-between p-3.5 border border-gray-200 rounded-xl bg-gray-50/70 hover:bg-white hover:border-amber-300/60 hover:shadow-2xs transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isFemale
                                    ? 'bg-pink-100 text-pink-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {isFemale ? '♀' : '♂'}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <strong className="text-sm text-gray-900 truncate">{pass.name}</strong>
                                  {pass.isSelf && (
                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                      Self
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 block truncate">
                                  {pass.age} years · {isFemale ? 'Female' : 'Male'}
                                </span>
                              </div>
                            </div>

                            {!pass.isSelf && (
                              <button
                                type="button"
                                onClick={() => setPassengerToDelete(pass)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Delete passenger"
                                aria-label={`Delete ${pass.name}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Inline Add Passenger Form */}
                  {showAddPassenger && (
                    <form onSubmit={handleAddPassenger} className="mt-3 p-4 border border-amber-200 bg-amber-50/60 rounded-xl space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                        <strong className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Add New Co-Passenger
                        </strong>
                        <button
                          type="button"
                          onClick={() => setShowAddPassenger(false)}
                          className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="account-label">Full Name</label>
                          <input
                            type="text"
                            value={newPassName}
                            onChange={(e) => setNewPassName(e.target.value)}
                            placeholder="As per ID proof"
                            required
                          />
                        </div>
                        <div>
                          <label className="account-label">Age</label>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={newPassAge}
                            onChange={(e) => setNewPassAge(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="account-label">Gender</label>
                          <ThemedDropdown
                            id="newPassGender"
                            value={newPassGender}
                            onChange={(val) => setNewPassGender(val as 'Male' | 'Female')}
                            placeholder="Select"
                            required
                            icon={null}
                            options={[
                              { value: 'Male', label: 'Male' },
                              { value: 'Female', label: 'Female' },
                            ]}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={savingPass}
                          className="account-primary text-xs py-2.5 !min-h-[40px] flex-1 cursor-pointer"
                        >
                          {savingPass ? 'Saving...' : 'Save Passenger'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddPassenger(false)}
                          className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-300 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              </div>

              {/* Right Column: Wallet + Quick Actions */}
              <div className="md:col-span-5 lg:col-span-4 space-y-5">
                {/* Uday Travels In-Wallet Amount Card */}
                <section className="profile-card !p-4 sm:!p-5 border border-amber-200/90 bg-gradient-to-br from-[#FFFDF5] via-[#FEF3C7]/40 to-white shadow-sm overflow-hidden !gap-3 rounded-2xl">
                  {/* Header: Brand Wallet Title + Remaining Balance Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-amber-100/80 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#F8B018] to-[#F59E0B] flex items-center justify-center text-white shadow-xs shrink-0">
                        <Wallet size={15} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#92400E] truncate">
                        Uday Travels Wallet
                      </span>
                    </div>
                    <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-amber-300/80 whitespace-nowrap shrink-0">
                      Remaining Balance
                    </span>
                  </div>

                  {/* Main Balance Row */}
                  <div className="flex items-baseline justify-between pt-0.5">
                    <div>
                      <span className="text-[11px] text-gray-500 font-medium block">Available in Wallet</span>
                      <div className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-0.5">
                        {loadingWallet ? '...' : (wallet ? wallet.availableDisplay : '₹0.00')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchWallet()}
                      disabled={loadingWallet}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
                      title="Refresh wallet balance"
                      aria-label="Refresh wallet balance"
                    >
                      <RefreshCw size={12} className={loadingWallet ? 'animate-spin' : ''} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* Hold breakdown if active holds exist */}
                  {wallet && wallet.balancePaise !== wallet.availablePaise && (
                    <div className="text-xs text-amber-800 bg-amber-100/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between border border-amber-200/60">
                      <span>Total Balance: <strong>{wallet.balanceDisplay}</strong></span>
                      <span className="text-gray-500 text-[10px]">Active Seat Hold</span>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-amber-100/80 flex items-center justify-between gap-2 text-xs text-gray-600">
                    <p className="text-[11px] text-gray-500 m-0 leading-tight">
                      Automatically applies toward your next bus booking.
                    </p>
                    <Link
                      href="/availability"
                      className="text-xs font-bold text-[#B45309] hover:text-[#92400E] hover:underline flex items-center gap-0.5 whitespace-nowrap ml-2 shrink-0"
                    >
                      Book Bus &rarr;
                    </Link>
                  </div>
                </section>

                {/* Quick Navigation Card */}
                <section className="profile-card !p-4 sm:!p-5 bg-white border border-gray-200 shadow-sm rounded-2xl space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    Quick Navigation
                  </span>

                  <Link
                    href="/bookings"
                    className="w-full flex items-center justify-center gap-2 p-3 bg-amber-50 hover:bg-amber-100/70 border border-amber-200/80 rounded-xl text-xs font-bold text-gray-900 transition-colors"
                  >
                    <Ticket size={16} className="text-[#B45309]" />
                    <span>View My Bookings & Tickets</span>
                  </Link>

                  <a
                    href="tel:+919890066580"
                    className="w-full flex items-center justify-center gap-2 p-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Phone size={14} className="text-gray-400" />
                    <span>Support: +91 98900 66580</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>Log Out of Account</span>
                  </button>
                </section>
              </div>
            </div>

            {/* Sticky Priority Downside Dock for Mobile */}
            <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 py-3 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden">
              <div className="max-w-[460px] mx-auto flex items-center gap-2.5">
                <Link
                  href="/availability"
                  data-testid="sticky-account-book-now"
                  className="flex-1 min-h-[48px] bg-[#F8B018] hover:bg-[#E09E14] text-gray-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#F8B018]/30 transition-transform active:scale-[0.99] border border-[#E09E14]/40"
                >
                  <BusFront size={19} />
                  <span>Book Now</span>
                  <ArrowRight size={17} />
                </Link>
                <Link
                  href="/bookings"
                  className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-800 transition-colors shrink-0"
                  title="View My Bookings"
                  aria-label="View My Bookings"
                >
                  <Ticket size={20} />
                </Link>
              </div>
            </div>
          </>
        )}

        {/* LOGGED OUT: TABBED LOGIN / CREATE ACCOUNT FORM */}
        {!loadingAuth && !currentUser && (
          <div className="w-full max-w-[460px] md:max-w-5xl mx-auto md:grid md:grid-cols-12 md:gap-8 items-start">
            {/* Left side on laptop: Uday Travels Benefits Card */}
            <div className="hidden md:block md:col-span-5 space-y-4 pt-1">
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-100/30 to-purple-900/10 border border-amber-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center text-xs">UT</span>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900">Uday Travels Account</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 leading-snug">
                  Fast, seamless bus booking between Ahilyanagar & Pune
                </h3>
                <ul className="space-y-3.5 text-xs text-gray-700">
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Instant Wallet Refunds:</strong> 100% money back to your Uday Travels Wallet on cancellations.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>1-Click Saved Travellers:</strong> Save family & friends to autofill passenger details instantly.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Live WhatsApp & SMS Tickets:</strong> Digital QR tickets sent directly to your phone.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Verified Safety:</strong> Guaranteed gender-safe neighbour seating for female passengers.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right side (Mobile: 100%, Laptop: 7 cols): Mode Tabs + Auth Form */}
            <div className="w-full md:col-span-7 space-y-3.5">
              {redirectUrl && (
                <div className="rounded-xl border border-[#F8B018]/40 bg-[#F8B018]/10 p-3.5 text-xs text-[#8c5900] flex items-center gap-2.5 shadow-sm">
                  <Sparkles className="w-5 h-5 flex-shrink-0 text-[#F8B018]" />
                  <div>
                    <strong className="block text-gray-900 font-bold mb-0.5">
                      {authMode === 'register' ? 'Create an account to continue' : 'Sign in to continue'}
                    </strong>
                    <span className="text-gray-700">
                      {authMode === 'register'
                        ? 'Create your account to view live bus availability and book your journey.'
                        : 'Sign in to view live bus availability and proceed with your journey.'}
                    </span>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
                  <Check size={18} className="text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Mode Tabs Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-1 flex shadow-sm">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('register')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-[#F8B018] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-[#F8B018] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Log In
                </button>
              </div>

              {/* Theme-matched Error Banner for Auth / Validation Issues */}
              {(authError || errorMessage) && (
                <div>
                  <ThemedErrorBanner
                    title={authError?.title || 'Notice'}
                    message={authError?.message || errorMessage}
                    suggestion={authError?.suggestion}
                    actionLabel={authError?.action?.label}
                    onAction={handleAuthAction}
                    onDismiss={() => {
                      setAuthError(null)
                      setErrorMessage('')
                    }}
                    variant={authError?.code === 'auth/email-already-in-use' ? 'warning' : 'error'}
                  />
                </div>
              )}

              {/* TAB 1: CREATE ACCOUNT FORM */}
              {authMode === 'register' && (
                <form onSubmit={handleRegister} noValidate className="space-y-3">
                  <section className="profile-card">
                    <div className="profile-card-title">
                      <div>
                        <UserRound size={18} />
                        <h2>Passenger details</h2>
                      </div>
                      <span>* Required</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label htmlFor="regName" className="account-label">
                          Full name <i>*</i>
                        </label>
                        <input
                          id="regName"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="As per ID proof"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="regGender" className="account-label">
                            Gender <i>*</i>
                          </label>
                          <ThemedDropdown
                            id="regGender"
                            value={regGender}
                            onChange={(val) => setRegGender(val as 'Male' | 'Female' | '')}
                            placeholder="Select"
                            required
                            icon={null}
                            options={[
                              { value: 'Male', label: 'Male' },
                              { value: 'Female', label: 'Female' },
                            ]}
                          />
                        </div>

                        <div>
                          <label htmlFor="regAge" className="account-label">
                            Age <i>*</i>
                          </label>
                          <input
                            id="regAge"
                            type="number"
                            min={18}
                            max={100}
                            value={regAge}
                            onChange={(e) => setRegAge(e.target.value)}
                            placeholder="Age"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="regMobile" className="account-label">
                          Mobile number <i>*</i>
                        </label>
                        <div className="phone-field">
                          <span>+91</span>
                          <input
                            id="regMobile"
                            inputMode="numeric"
                            maxLength={10}
                            value={regMobile}
                            onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="98XXXXXXXX"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="regEmail" className="account-label">
                          Email address <span>(Optional for ticket copy)</span>
                        </label>
                        <input
                          id="regEmail"
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>

                      <div>
                        <label htmlFor="regPassword" className="account-label">
                          Create Password <i>*</i>
                        </label>
                        <input
                          id="regPassword"
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                        />
                      </div>
                    </div>
                  </section>

                  <div className="consent-card">
                    <label>
                      <input
                        type="checkbox"
                        required
                        checked={regIdentityConsent}
                        onChange={(e) => setRegIdentityConsent(e.target.checked)}
                      />
                      <span>
                        I confirm my gender and name are accurate as per ID proof. <b>*</b>
                      </span>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        required
                        checked={regTermsConsent}
                        onChange={(e) => setRegTermsConsent(e.target.checked)}
                      />
                      <span>
                        I accept the <a href="/policies" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="/policies" target="_blank" rel="noopener noreferrer">Cancellation Policy</a>. <b>*</b>
                      </span>
                    </label>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button type="submit" className="account-primary cursor-pointer" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner" /> Creating account...
                        </>
                      ) : (
                        <>
                          <LockKeyhole size={17} /> Create account & Continue
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-gray-500">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('login')}
                        className="font-bold text-[#F8B018] hover:underline cursor-pointer"
                      >
                        Log in here
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* TAB 2: LOG IN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} noValidate className="space-y-3">
                  <section className="profile-card">
                    <div className="profile-card-title">
                      <div>
                        <LockKeyhole size={18} />
                        <h2>Account Login</h2>
                      </div>
                      <span>Returning Traveller</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label htmlFor="loginIdentifier" className="account-label">
                          Mobile Number or Email <i>*</i>
                        </label>
                        <input
                          id="loginIdentifier"
                          type="text"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="98XXXXXXXX or email"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="loginPassword" className="account-label">
                          Password <i>*</i>
                        </label>
                        <input
                          id="loginPassword"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                        />
                      </div>
                    </div>
                  </section>

                  <div className="space-y-2 pt-1">
                    <button type="submit" className="account-primary cursor-pointer" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner" /> Signing in...
                        </>
                      ) : (
                        <>
                          <LockKeyhole size={17} /> Log in to My Account
                        </>
                      )}
                    </button>
                    <p className="text-center text-xs text-gray-500">
                      Don&apos;t have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('register')}
                        className="font-bold text-[#F8B018] hover:underline cursor-pointer"
                      >
                        Create account here
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {passengerToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-jakarta"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1.5">
              <h3 id="delete-modal-title" className="text-base sm:text-lg font-bold text-gray-900">
                Delete Passenger?
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Are you sure you want to remove <strong className="text-gray-900 font-semibold">{passengerToDelete.name}</strong> from your saved travellers?
              </p>
              <div className="text-[11px] text-gray-500 bg-gray-50 rounded-lg py-1.5 px-2.5 inline-block border border-gray-100">
                {passengerToDelete.gender} · {passengerToDelete.age} years
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingPassenger}
                onClick={() => setPassengerToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPassenger}
                onClick={confirmDeletePassenger}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingPassenger ? (
                  <span className="spinner w-4 h-4 !border-white !border-t-transparent inline-block" />
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Drawer matching User's Mockup in Light Theme */}
      <NavDrawer
        open={sheet}
        onClose={() => setSheet(false)}
        currentUser={currentUser}
        userName={profile?.name || ''}
        userPhone={profile?.mobile || ''}
        onLogout={handleLogout}
        theme="light"
      />
    </main>
  )
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="account-page flex items-center justify-center min-h-[60vh] font-jakarta animate-in fade-in duration-300">
          <div className="text-center">
            <div className="relative w-14 h-14 flex items-center justify-center mx-auto mb-3">
              <div className="absolute inset-0 rounded-2xl bg-[#F8B018]/15 animate-ping" />
              <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 shadow-sm flex items-center justify-center relative z-10">
                <div className="w-6 h-6 rounded-full border-2 border-amber-100 border-t-[#F8B018] animate-spin" />
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700 font-mono">
              Loading...
            </p>
          </div>
        </main>
      }
    >
      <AccountPageContent />
    </Suspense>
  )
}
