import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import NavDrawer from '@/components/navigation/NavDrawer'
import { User } from 'firebase/auth'

describe('NavDrawer light vs dark theme', () => {
  const dummyUser = {
    displayName: 'Chaitanya Test',
    phoneNumber: '+919876543210',
    email: 'test@udaytravels.com',
  } as unknown as User

  it('renders dark mode by default', () => {
    const html = renderToString(
      <NavDrawer
        open={true}
        onClose={vi.fn()}
        currentUser={null}
        onLogout={vi.fn()}
      />
    )
    expect(html).toContain('bg-[#0B0F19]')
    expect(html).toContain('text-white')
    expect(html).toContain('UDAY')
    expect(html).toContain('Bookings')
    expect(html).toContain('Log in to manage your bookings')
  })

  it('renders light mode when theme="light" without user', () => {
    const html = renderToString(
      <NavDrawer
        open={true}
        onClose={vi.fn()}
        currentUser={null}
        onLogout={vi.fn()}
        theme="light"
      />
    )
    expect(html).toContain('bg-white')
    expect(html).toContain('text-gray-900')
    expect(html).toContain('border-amber-200')
    expect(html).toContain('Log in to manage your bookings')
    expect(html).toContain('Bookings')
  })

  it('renders light mode when logged in with profile details', () => {
    const html = renderToString(
      <NavDrawer
        open={true}
        onClose={vi.fn()}
        currentUser={dummyUser}
        userName="Chaitanya Test"
        onLogout={vi.fn()}
        theme="light"
      />
    )
    expect(html).toContain('bg-white')
    expect(html).toContain('text-gray-900')
    expect(html).toContain('Chaitanya Test')
    expect(html).toContain('+919876543210')
    expect(html).toContain('Logout')
  })

  it('verifies availability page integrates NavDrawer with theme="light"', () => {
    const fs = require('fs')
    const path = require('path')
    const src = fs.readFileSync(path.join(process.cwd(), 'app/availability/page.tsx'), 'utf-8')
    expect(src).toContain('theme="light"')
  })
})
