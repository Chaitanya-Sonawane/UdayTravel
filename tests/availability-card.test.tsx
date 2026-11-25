import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import AvailabilityPage from '@/app/availability/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('route=AHM_PUN&date=2026-11-25'),
}))

vi.mock('@/lib/auth/client-auth', () => ({
  subscribeToAuth: (cb: any) => {
    cb(null)
    return () => {}
  },
  signOutUser: vi.fn(),
}))

vi.mock('@/lib/firebase/client', () => ({
  getApiAuthHeaders: vi.fn().mockResolvedValue({}),
}))

describe('Availability Page - Proper Card & Clearly Viewed Step 1 and Step 2', () => {
  it('renders search card with high-contrast step 1 and step 2 badges', () => {
    const html = renderToString(<AvailabilityPage />)

    // Check search-card container
    expect(html).toContain('search-card')
    expect(html).toContain('search-step')
    expect(html).toContain('search-step-label')

    // Check step 1 label and tag
    expect(html).toContain('STEP 1')
    expect(html).toContain('ROUTE')
    expect(html).toContain('step-tag')
    expect(html).toContain('step-name')

    // Check step 2 label and tag
    expect(html).toContain('STEP 2')
    expect(html).toContain('DATE')

    // Check route options
    expect(html).toContain('Ahilyanagar to Pune')
    expect(html).toContain('Pune to Ahilyanagar')
    expect(html).toContain('swap-route')

    // Check date buttons
    expect(html).toContain('Today')
    expect(html).toContain('Tomorrow')
    expect(html).toContain('Choose date')
  })

  it('renders the header and hero copy properly', () => {
    const html = renderToString(<AvailabilityPage />)
    expect(html).toContain('availability-header')
    expect(html).toContain('CHOOSE YOUR')
    expect(html).toContain('JOURNEY.')
  })
})
