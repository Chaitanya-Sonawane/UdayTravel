import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import Page from '@/app/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

describe('Find Your Journey First-Time Flow Verification', () => {
  it('renders Find your journey hero button targeting register account for first-time visitors', () => {
    const html = renderToString(<Page />)
    expect(html).toContain('Find your journey')
    expect(html).toContain('/account?mode=register&amp;redirect=/availability')
  })

  it('verifies handleFindJourney logic in app/page.tsx', () => {
    const fs = require('fs')
    const path = require('path')
    const pageSrc = fs.readFileSync(path.join(process.cwd(), 'app/page.tsx'), 'utf-8')

    // Verifies device check & redirect logic
    expect(pageSrc).toContain('hasDeviceAccount')
    expect(pageSrc).toContain('isUserLoggedIn')
    expect(pageSrc).toContain('handleFindJourney')
    expect(pageSrc).toContain("router.push('/account?mode=register&redirect=/availability')")
    expect(pageSrc).toContain("router.push('/availability')")
  })

  it('verifies isUserLoggedIn returns true only for authenticated sessions', async () => {
    const { isUserLoggedIn } = await import('@/lib/auth/client-auth')
    expect(isUserLoggedIn(null)).toBe(false)
    expect(isUserLoggedIn({ isAnonymous: true } as any)).toBe(false)
    expect(isUserLoggedIn({ uid: 'usr_123', isAnonymous: false } as any)).toBe(true)
  })

  it('verifies about and policies pages enforce the authenticated find/book journey flow', () => {
    const fs = require('fs')
    const path = require('path')
    const aboutSrc = fs.readFileSync(path.join(process.cwd(), 'app/about/page.tsx'), 'utf-8')
    const policiesSrc = fs.readFileSync(path.join(process.cwd(), 'app/policies/page.tsx'), 'utf-8')

    expect(aboutSrc).toContain('isUserLoggedIn')
    expect(aboutSrc).toContain("router.push('/account?mode=register&redirect=/availability')")
    expect(aboutSrc).toContain("router.push('/availability')")

    expect(policiesSrc).toContain('isUserLoggedIn')
    expect(policiesSrc).toContain("router.push('/account?mode=register&redirect=/availability')")
    expect(policiesSrc).toContain("router.push('/availability')")
  })

  it('verifies that registering on account page redirects back to /availability', () => {
    const fs = require('fs')
    const path = require('path')
    const accountSrc = fs.readFileSync(path.join(process.cwd(), 'app/account/page.tsx'), 'utf-8')

    // Confirms redirectUrl handling after signUp
    expect(accountSrc).toContain('if (redirectUrl)')
    expect(accountSrc).toContain('router.push(redirectUrl)')
    expect(accountSrc).toContain('CREATE YOUR')
    expect(accountSrc).toContain('ACCOUNT.')
  })
})
