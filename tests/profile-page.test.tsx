import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import AccountPage, { AccountPageContent } from '@/app/account/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}))

describe('Profile / Account Page - Screenshot-matched UI', () => {
  it('renders the brand header on all account modes including create account and login', () => {
    const htmlLogin = renderToString(<AccountPageContent initialAuthMode="login" />)
    expect(htmlLogin).toContain('availability-header')
    expect(htmlLogin).toContain('aria-label="Open menu"')

    // User requirement: put the navigation header on top of CREATE YOUR ACCOUNT
    const htmlRegister = renderToString(<AccountPageContent initialAuthMode="register" />)
    expect(htmlRegister).toContain('availability-header')
    expect(htmlRegister).toContain('aria-label="Open menu"')
  })

  it('renders the hero section with bold typography', () => {
    const html = renderToString(<AccountPage />)
    expect(html).not.toContain('01 / PROFILE')
    expect(html).not.toContain('01 / PASSENGER PROFILE')
    expect(html).toContain('availability-hero')
    expect(html).toContain('availability-hero-copy')
    expect(html).toContain('ACCOUNT.')
  })

  it('does not render the booking search card on the account / create account page', () => {
    const html = renderToString(<AccountPage />)
    expect(html).not.toContain('Find Available Buses')
    expect(html).not.toContain('Quick Journey Search')
  })

  it('renders session check placeholder in card stack awaiting client auth', () => {
    const html = renderToString(<AccountPage />)
    expect(html).toContain('Checking session...')
    expect(html).toContain('account-form')
    expect(html).toContain('max-w-[390px]')
  })

  it('renders Uday Travels Wallet remaining balance card and profile details when logged in', () => {
    const mockUser = {
      uid: 'user_123',
      displayName: 'Rahul Sharma',
      email: 'rahul@example.com',
      phoneNumber: '+919876543210',
    } as any

    const mockWallet = {
      balancePaise: 55000,
      availablePaise: 55000,
      balanceDisplay: '₹550.00',
      availableDisplay: '₹550.00',
    }

    const html = renderToString(
      <AccountPageContent
        initialUser={mockUser}
        initialLoadingAuth={false}
        initialWallet={mockWallet}
      />
    )

    expect(html).toContain('Uday Travels Wallet')
    expect(html).toContain('Remaining Balance')
    expect(html).toContain('₹550.00')
    expect(html).toContain('Wallet Balance')
    expect(html).toContain('Personal Profile')
    expect(html).toContain('Book Bus')
    expect(html).toContain('Automatically applies toward your next bus booking')
    expect(html).not.toContain('MY PASSENGER')
    expect(html).not.toContain('Account created successfully! Welcome to Uday Travels.')
    expect(html).not.toContain('> Active<')
    expect(html).toContain('Saved Travellers')
    expect(html).toContain('Add Co-Passenger')
  })
})
