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
  Calendar,
  Sparkles,
  Menu,
  X,
  MapPin,
  Wallet,
  RefreshCw,
} from 'lucide-react'
import {
  subscribeToAuth,
  signUpUser,
  signInUser,
  signOutUser,
  fetchCurrentProfile,
  hasDeviceAccount,
} from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'
import { UserProfile, SavedPassenger } from '@/lib/schema/account'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { parseAuthError, UdayAuthError, type FormattedAuthError } from '@/lib/auth/auth-errors'
import { ThemedErrorBanner } from '@/components/ui/ThemedErrorBanner'
import { ThemedDropdown } from '@/components/ui/ThemedDropdown'

export function AccountPageContent({
  initialUser = null,
  initialLoadingAuth = true,
  initialWallet = null,
}: {
  initialUser?: User | null
  initialLoadingAuth?: boolean
  initialWallet?: {
    balancePaise: number
    availablePaise: number
    balanceDisplay: string
    availableDisplay: string
  } | null
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
    } catch (err) {
      console.warn('Wallet fetch warning:', err)
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
    const unsub = subscribeToAuth(async (user) => {
      if (user && !user.isAnonymous) {
        setCurrentUser(user)
        try {
          const data = await fetchCurrentProfile()
          if (data.profile) setProfile(data.profile)
          if (data.savedPassengers) setSavedPassengers(data.savedPassengers)
        } catch (err) {
          console.warn('Profile fetch warning:', err)
        }
        await fetchWallet()
      } else {
        setCurrentUser(null)
        setProfile(null)
        setSavedPassengers([])
        setWallet(null)
      }
      setLoadingAuth(false)
    })
    return () => unsub()
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

      console.warn(`[Registration handled notice]: ${formatted.code} - ${formatted.message}`)
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
      if (data.profile) setProfile(data.profile)
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

      console.warn(`[Login handled notice]: ${formatted.code} - ${formatted.message}`)
      setAuthError(formatted)
      setErrorMessage(formatted.message)
    } finally {
      setSubmitting(false)
    }
  }

  // 4. Handle Logout
  const handleLogout = async () => {
    await signOutUser()
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

  // 6. Delete Saved Passenger
  const handleDeletePassenger = async (passengerId: string) => {
    setPassengerNotice(null)
    try {
      const headers = await getApiAuthHeaders()
      const res = await fetch(`/api/account/passengers/${passengerId}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error?.message || 'Could not delete passenger')
      }
      const data = await res.json()
      setSavedPassengers(data.savedPassengers || [])
      setPassengerNotice({
        type: 'success',
        message: 'Passenger removed from saved travellers.',
      })
    } catch (err: any) {
      setPassengerNotice({
        type: 'error',
        message: err.message || 'Could not remove passenger. Please try again.',
      })
    }
  }

  return (
    <main className="availability-page account-page">
      {/* Header matching brand standard & screenshot */}
      <header className="availability-header sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs">
        <Link className="availability-logo" href="/">
          <span className="page-brand">
            <span className="page-brand-mark">UT</span>
            <span className="page-brand-name">UDAY TRAVELS</span>
          </span>
        </Link>
        <button onClick={() => setSheet(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
      </header>

      {/* Hero Section with Purple Coach, yellow eyebrow and two-tone bold typography */}
      <section className="availability-hero !h-[140px] min-h-[140px]">
        <div className="availability-hero-overlay" />
        <div className="availability-hero-copy !py-4 !px-4">
          <p className="!mb-1">01 / PROFILE</p>
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
      <div className="account-form w-full max-w-[390px] mx-auto px-4 -mt-8 relative z-[1] space-y-3 pb-16">
        {/* Loading Spinner */}
        {loadingAuth && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
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

            {/* Uday Travels In-Wallet Amount Card */}
            <section className="profile-card border border-amber-200/90 bg-gradient-to-br from-[#FFFDF5] via-[#FEF3C7]/40 to-white shadow-sm overflow-hidden !gap-2.5">
              {/* Header: Brand Wallet Title + Remaining Balance Badge */}
              <div className="flex items-center justify-between gap-2 border-b border-amber-100/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#F8B018] to-[#F59E0B] flex items-center justify-center text-white shadow-xs flex-shrink-0">
                    <Wallet size={15} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#92400E]">
                    Uday Travels Wallet
                  </span>
                </div>
                <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide text-[#92400E] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-amber-300/80 whitespace-nowrap">
                  Remaining Balance
                </span>
              </div>

              {/* Main Balance Row: Available balance on left, Refresh button on right */}
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
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                  title="Refresh wallet balance"
                  aria-label="Refresh wallet balance"
                >
                  <RefreshCw size={12} className={loadingWallet ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Hold breakdown if active holds exist */}
              {wallet && wallet.balancePaise !== wallet.availablePaise && (
                <div className="text-[11px] text-amber-800 bg-amber-100/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between border border-amber-200/60">
                  <span>Total Balance: <strong>{wallet.balanceDisplay}</strong></span>
                  <span className="text-gray-500 text-[10px]">Active Seat Hold in progress</span>
                </div>
              )}

              <div className="pt-2 border-t border-amber-100/80 flex items-center justify-between text-xs text-gray-600">
                <p className="text-[11px] text-gray-500 m-0 leading-tight">
                  Automatically applies toward your next bus booking.
                </p>
                <Link
                  href="/availability"
                  className="text-[11px] font-bold text-[#B45309] hover:text-[#92400E] hover:underline flex items-center gap-0.5 whitespace-nowrap ml-2 flex-shrink-0"
                >
                  Book Bus &rarr;
                </Link>
              </div>
            </section>

            {/* User Profile Card */}
            <section className="profile-card">
              <div className="profile-card-title">
                <div className="flex items-center gap-2 text-[#F8B018]">
                  <UserRound size={18} />
                  <h2 className="text-base font-bold text-gray-900 m-0">Personal Profile</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Full Name</span>
                  <strong className="block text-sm text-gray-900 mt-0.5">
                    {profile?.name || currentUser.displayName || regName || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Mobile Number</span>
                  <strong className="block text-sm text-gray-900 mt-0.5 font-mono">
                    +91 {profile?.mobile || currentUser.phoneNumber || (currentUser.email ? currentUser.email.split('@')[0] : '—')}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Gender</span>
                  <span className="gender-pill inline-block mt-0.5 uppercase text-xs">
                    {profile?.gender || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Age</span>
                  <strong className="block text-sm text-gray-900 mt-0.5">
                    {profile?.age ? `${profile.age} years` : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Wallet Balance</span>
                  <strong className="block text-sm text-[#B45309] font-mono font-bold mt-0.5">
                    {loadingWallet ? '...' : (wallet ? wallet.availableDisplay : '₹0.00')}
                  </strong>
                </div>
                {profile?.email && (
                  <div>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Email Address</span>
                    <span className="block text-sm text-gray-700 mt-0.5 font-mono">{profile.email}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Saved Travellers / Passenger Directory */}
            <section className="profile-card">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-[#F8B018] flex-shrink-0" />
                  <h2 className="text-sm font-bold text-gray-900 m-0">
                    Saved Travellers <span className="text-gray-500 font-mono text-xs font-normal">({savedPassengers.length})</span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPassenger(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-amber-300/80 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap flex-shrink-0"
                >
                  <Plus size={13} className="text-[#B45309]" />
                  <span>Add Co-Passenger</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-1">
                Travellers saved here are available for 1-click selection during booking.
              </p>

              {/* In-theme Passenger Action Notice */}
              {passengerNotice && (
                <div>
                  <ThemedErrorBanner
                    variant={passengerNotice.type === 'success' ? 'success' : 'error'}
                    message={passengerNotice.message}
                    onDismiss={() => setPassengerNotice(null)}
                    compact
                  />
                </div>
              )}

              {/* Saved Passengers List */}
              <div className="space-y-2">
                {savedPassengers.map((pass) => {
                  const isFemale = pass.gender?.toLowerCase() === 'woman' || pass.gender?.toLowerCase() === 'female'
                  return (
                    <div
                      key={pass.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50/70"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isFemale
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isFemale ? '♀' : '♂'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm text-gray-900">{pass.name}</strong>
                            {pass.isSelf && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                                Self
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {pass.age} years · {isFemale ? 'Female' : 'Male'}
                          </span>
                        </div>
                      </div>

                      {!pass.isSelf && (
                        <button
                          type="button"
                          onClick={() => handleDeletePassenger(pass.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete passenger"
                          aria-label={`Delete ${pass.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Inline Add Passenger Form */}
              {showAddPassenger && (
                <form onSubmit={handleAddPassenger} className="mt-3 p-3.5 border border-amber-200 bg-amber-50/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Add New Co-Passenger
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowAddPassenger(false)}
                      className="text-xs text-gray-500 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="account-label">Full Name</label>
                      <input
                        type="text"
                        value={newPassName}
                        onChange={(e) => setNewPassName(e.target.value)}
                        placeholder="As per ID proof"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
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
                  </div>

                  <button
                    type="submit"
                    disabled={savingPass}
                    className="account-primary text-xs py-2.5 !min-h-[40px]"
                  >
                    {savingPass ? 'Saving...' : 'Save Passenger'}
                  </button>
                </form>
              )}
            </section>

            {/* Quick Navigation Card */}
            <section className="profile-card space-y-2.5">
              <Link
                href="/bookings"
                className="w-full flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <Ticket size={16} /> View My Bookings & Tickets
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} /> Log Out of Account
              </button>
            </section>
          </>
        )}

        {/* LOGGED OUT: TABBED LOGIN / CREATE ACCOUNT FORM */}
        {!loadingAuth && !currentUser && (
          <>
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
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
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
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
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
                  <button type="submit" className="account-primary" disabled={submitting}>
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
                      className="font-bold text-[#F8B018] hover:underline"
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
                  <button type="submit" className="account-primary" disabled={submitting}>
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
                      className="font-bold text-[#F8B018] hover:underline"
                    >
                      Create account here
                    </button>
                  </p>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Slide-over menu sheet */}
      {sheet && (
        <div className="sheet-overlay" onClick={() => setSheet(false)}>
          <aside className="availability-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-close" onClick={() => setSheet(false)} aria-label="Close menu">
              <X size={20} />
            </button>
            <strong className="tracking-widest">UDAY TRAVELS</strong>
            <nav>
              <Link href="/" onClick={() => setSheet(false)}>Home</Link>
              <Link href="/availability" onClick={() => setSheet(false)}>Book a Seat</Link>
              <Link href="/bookings" onClick={() => setSheet(false)}>My Bookings</Link>
              <Link href="/account" onClick={() => setSheet(false)}>My Profile</Link>
              <Link href="/policies" onClick={() => setSheet(false)}>Policies & Rules</Link>
              <Link href="/contact" onClick={() => setSheet(false)}>Contact Support</Link>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setSheet(false)
                    handleLogout()
                  }}
                  className="text-left text-red-600 font-bold mt-2"
                >
                  Sign Out
                </button>
              )}
            </nav>
          </aside>
        </div>
      )}
    </main>
  )
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="account-page flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#F8B018] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs uppercase tracking-widest text-gray-500">Loading Account...</p>
          </div>
        </main>
      }
    >
      <AccountPageContent />
    </Suspense>
  )
}
