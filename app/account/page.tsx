'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  LockKeyhole,
  ShieldCheck,
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
} from 'lucide-react'
import {
  subscribeToAuth,
  signUpUser,
  signInUser,
  signOutUser,
  fetchCurrentProfile,
} from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'
import { UserProfile, SavedPassenger } from '@/lib/schema/account'
import { getApiAuthHeaders } from '@/lib/firebase/client'

export default function AccountPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [savedPassengers, setSavedPassengers] = useState<SavedPassenger[]>([])

  // Auth Mode: 'register' | 'login'
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register')

  // Register form fields
  const [regName, setRegName] = useState('')
  const [regGender, setRegGender] = useState<'man' | 'woman'>('man')
  const [regAge, setRegAge] = useState('24')
  const [regMobile, setRegMobile] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regIdentityConsent, setRegIdentityConsent] = useState(true)
  const [regTermsConsent, setRegTermsConsent] = useState(true)

  // Login form fields
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Add passenger modal / form
  const [showAddPassenger, setShowAddPassenger] = useState(false)
  const [newPassName, setNewPassName] = useState('')
  const [newPassAge, setNewPassAge] = useState('25')
  const [newPassGender, setNewPassGender] = useState<'man' | 'woman'>('woman')
  const [savingPass, setSavingPass] = useState(false)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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
      } else {
        setCurrentUser(null)
        setProfile(null)
        setSavedPassengers([])
      }
      setLoadingAuth(false)
    })
    return () => unsub()
  }, [])

  // 2. Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!regName.trim() || regName.trim().length < 2) {
      return setErrorMessage('Enter your full name as per government ID.')
    }
    if (!/^[6-9]\d{9}$/.test(regMobile.trim())) {
      return setErrorMessage('Enter a valid 10-digit Indian mobile number.')
    }
    const ageNum = parseInt(regAge, 10)
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      return setErrorMessage('Primary account holder must be 18 years or above.')
    }
    if (!regPassword || regPassword.length < 6) {
      return setErrorMessage('Password must be at least 6 characters long.')
    }
    if (!regIdentityConsent || !regTermsConsent) {
      return setErrorMessage('Please accept the ID confirmation and policies.')
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
      setSavedPassengers(createdProfile.savedPassengers || [])
      setSuccessMessage('Account created successfully! Welcome to Uday Travels.')
    } catch (err: any) {
      console.error('Registration failed:', err)
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('This mobile number or email is already registered. Please log in.')
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use a stronger password.')
      } else {
        setErrorMessage(err.message || 'Could not create account. Please check your connection.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // 3. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!loginIdentifier.trim()) {
      return setErrorMessage('Please enter your mobile number or email.')
    }
    if (!loginPassword) {
      return setErrorMessage('Please enter your password.')
    }

    setSubmitting(true)
    try {
      await signInUser(loginIdentifier.trim(), loginPassword)
      const data = await fetchCurrentProfile()
      if (data.profile) setProfile(data.profile)
      if (data.savedPassengers) setSavedPassengers(data.savedPassengers)
      setSuccessMessage('Logged in successfully!')
    } catch (err: any) {
      console.error('Login failed:', err)
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setErrorMessage('Invalid mobile number/email or password. Please try again.')
      } else {
        setErrorMessage(err.message || 'Failed to sign in. Please try again.')
      }
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
    setAuthMode('login')
  }

  // 5. Add Saved Passenger
  const handleAddPassenger = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassName.trim() || newPassName.trim().length < 2) {
      return alert('Enter a valid passenger name.')
    }
    const ageNum = parseInt(newPassAge, 10)
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return alert('Enter a valid age.')
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
      if (!res.ok) throw new Error('Failed to save passenger')
      const data = await res.json()
      setSavedPassengers(data.savedPassengers || [])
      setNewPassName('')
      setNewPassAge('25')
      setShowAddPassenger(false)
    } catch (err: any) {
      alert(err.message || 'Failed to save co-passenger.')
    } finally {
      setSavingPass(false)
    }
  }

  // 6. Delete Saved Passenger
  const handleDeletePassenger = async (passengerId: string) => {
    if (!confirm('Remove this passenger from saved travellers?')) return
    try {
      const headers = await getApiAuthHeaders()
      const res = await fetch(`/api/account/passengers/${passengerId}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error('Failed to delete')
      const data = await res.json()
      setSavedPassengers(data.savedPassengers || [])
    } catch (err: any) {
      alert(err.message || 'Could not remove passenger.')
    }
  }

  return (
    <main className="account-page">
      <header className="account-header">
        <Link href="/" className="account-back" aria-label="Back to home">
          <ArrowLeft size={20} />
        </Link>
        <Link href="/" className="account-brand">
          <span>UT</span>
          <strong>UDAY TRAVELS</strong>
        </Link>
      </header>

      <section className="account-hero">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Purple%20Coach%20on%20a%20Scenic%20Mountain%20Highway-TSaeVT07TMIavvjQrPeiy7sFnyQTFD.png"
          alt="Purple coach on mountain highway"
        />
        <div className="account-hero-overlay" />
        <div className="account-hero-copy">
          <h1>
            {currentUser ? 'MY PASSENGER' : authMode === 'register' ? 'CREATE YOUR' : 'WELCOME'}
            <br />
            <span>{currentUser ? 'ACCOUNT.' : authMode === 'register' ? 'ACCOUNT.' : 'BACK.'}</span>
          </h1>
        </div>
      </section>

      {/* Loading Spinner */}
      {loadingAuth && (
        <div className="text-center py-16">
          <span className="spinner inline-block" />
          <p className="text-sm text-gray-500 mt-2">Checking session...</p>
        </div>
      )}

      {/* LOGGED IN: MY ACCOUNT DASHBOARD */}
      {!loadingAuth && currentUser && (
        <div className="account-form">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm mb-4 flex items-center gap-2">
              <Check size={18} className="text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* User Profile Card */}
          <section className="profile-card">
            <div className="profile-card-title">
              <div>
                <UserRound size={18} />
                <h2>Personal Profile</h2>
              </div>
              <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                <Check size={14} /> Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <span className="text-xs text-gray-500">Full Name</span>
                <strong className="block text-base text-gray-900 mt-0.5">
                  {profile?.name || currentUser.displayName || 'Passenger'}
                </strong>
              </div>
              <div>
                <span className="text-xs text-gray-500">Mobile Number</span>
                <strong className="block text-base text-gray-900 mt-0.5 font-mono">
                  +91 {profile?.mobile || currentUser.phoneNumber || (currentUser.email ? currentUser.email.split('@')[0] : '—')}
                </strong>
              </div>
              <div>
                <span className="text-xs text-gray-500">Gender</span>
                <span className="gender-pill inline-block mt-0.5 uppercase">
                  {profile?.gender || 'MAN'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500">Age</span>
                <strong className="block text-base text-gray-900 mt-0.5">
                  {profile?.age ? `${profile.age} years` : '—'}
                </strong>
              </div>
              {profile?.email && (
                <div className="md:col-span-2">
                  <span className="text-xs text-gray-500">Email Address</span>
                  <span className="block text-sm text-gray-700 mt-0.5">{profile.email}</span>
                </div>
              )}
            </div>
          </section>

          {/* Saved Travellers / Passenger Directory */}
          <section className="profile-card mt-6">
            <div className="profile-card-title">
              <div>
                <Users size={18} />
                <h2>Saved Travellers ({savedPassengers.length})</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPassenger(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#FF9D00] hover:text-[#d98200]"
              >
                <Plus size={15} /> Add Co-Passenger
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Travellers saved here are available for 1-click selection during booking.
            </p>

            {/* Saved Passengers List */}
            <div className="space-y-2.5">
              {savedPassengers.map((pass) => (
                <div
                  key={pass.id}
                  className="flex items-center justify-between p-3.5 border border-gray-200 rounded-lg bg-gray-50/50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        pass.gender === 'woman'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {pass.gender === 'woman' ? '♀' : '♂'}
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
                        {pass.age} years · {pass.gender === 'woman' ? 'Woman' : 'Man'}
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
              ))}
            </div>

            {/* Inline Add Passenger Form */}
            {showAddPassenger && (
              <form onSubmit={handleAddPassenger} className="mt-4 p-4 border border-amber-200 bg-amber-50/60 rounded-lg space-y-3">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    <div className="select-wrap">
                      <select
                        value={newPassGender}
                        onChange={(e) => setNewPassGender(e.target.value as any)}
                      >
                        <option value="woman">Woman</option>
                        <option value="man">Man</option>
                      </select>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPass}
                  className="account-primary text-xs py-2.5"
                >
                  {savingPass ? 'Saving...' : 'Save Passenger'}
                </button>
              </form>
            )}
          </section>

          {/* Quick Booking Actions */}
          <div className="mt-6 space-y-3">
            <Link href="/availability" className="account-primary text-center flex items-center justify-center gap-2">
              Book a Journey <ArrowRight size={18} />
            </Link>

            <Link
              href="/bookings"
              className="w-full flex items-center justify-center gap-2 p-3.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <Ticket size={17} /> View My Bookings & Tickets
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} /> Log Out of Account
            </button>
          </div>
        </div>
      )}

      {/* LOGGED OUT: TABBED LOGIN / CREATE ACCOUNT FORM */}
      {!loadingAuth && !currentUser && (
        <div className="account-form">
          {/* Mode Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('register')
                setErrorMessage('')
              }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                authMode === 'register'
                  ? 'border-[#FF9D00] text-[#FF9D00]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login')
                setErrorMessage('')
              }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
                authMode === 'login'
                  ? 'border-[#FF9D00] text-[#FF9D00]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Log In
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4" role="alert">
              ! {errorMessage}
            </div>
          )}

          {/* TAB 1: CREATE ACCOUNT FORM */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} noValidate>
              <section className="profile-card">
                <div className="profile-card-title">
                  <div>
                    <UserRound size={18} />
                    <h2>Passenger details</h2>
                  </div>
                  <span>* Required</span>
                </div>

                <div className="name-row">
                  <div className="name-input">
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
                  <div>
                    <label htmlFor="regGender" className="account-label">
                      Gender <i>*</i>
                    </label>
                    <div className="select-wrap">
                      <select
                        id="regGender"
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value as any)}
                      >
                        <option value="man">MAN</option>
                        <option value="woman">WOMAN</option>
                      </select>
                      <ChevronDown size={16} />
                    </div>
                  </div>
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
                    required
                  />
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
              </section>

              <div className="consent-card">
                <label>
                  <input
                    type="checkbox"
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
                    checked={regTermsConsent}
                    onChange={(e) => setRegTermsConsent(e.target.checked)}
                  />
                  <span>
                    I accept the <a href="/policies">Terms and Conditions</a> and <a href="/policies">Cancellation Policy</a>. <b>*</b>
                  </span>
                </label>
              </div>

              <div className="account-info">
                <ShieldCheck size={20} />
                <p>
                  <strong>Your details stay with your journey.</strong> We save your passenger profile securely in Firebase to make future bookings fast and seamless.
                </p>
              </div>

              <div className="account-bottom">
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
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login')
                      setErrorMessage('')
                    }}
                    className="font-bold text-[#FF9D00] hover:underline"
                  >
                    Log in here
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* TAB 2: LOG IN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} noValidate>
              <section className="profile-card">
                <div className="profile-card-title">
                  <div>
                    <LockKeyhole size={18} />
                    <h2>Passenger Login</h2>
                  </div>
                  <span>Returning Traveller</span>
                </div>

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
              </section>

              <div className="account-bottom mt-6">
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
                <p>
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register')
                      setErrorMessage('')
                    }}
                    className="font-bold text-[#FF9D00] hover:underline"
                  >
                    Create account here
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      )}
    </main>
  )
}
