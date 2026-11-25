import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import PassengersPage from '@/app/passengers/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

describe('Passenger Information Profile Info & Saved Travellers Verification', () => {
  it('renders passenger information page with stops selection and passenger details', () => {
    const html = renderToString(<PassengersPage />)
    expect(html).toContain('Passenger Details')
    expect(html).toMatch(/Passenger\s*(<!--.*?-->)?\s*1/)
    expect(html).toContain('Continue to select')
  })

  it('contains deduplicated single 1-click option without bloated copy or wasted UI space', () => {
    const fs = require('fs')
    const path = require('path')
    const src = fs.readFileSync(path.join(process.cwd(), 'app/passengers/page.tsx'), 'utf-8')

    // Verifies single unified 1-click fill option inside PassengerCard
    expect(src).toContain('1-Click Auto Fill:')
    expect(src).toContain('quickTravellers')
    expect(src).toContain('savedTravellers')
    expect(src).toContain('onPickProfile')

    // Verifies bulky redundant banner is removed to conserve UI space
    expect(src).not.toContain('Put Profile Info into Passenger 1')
  })

  it('provides 1-Click Auto Fill option for Passenger 1 and all passengers below from saved travellers', () => {
    const fs = require('fs')
    const path = require('path')
    const src = fs.readFileSync(path.join(process.cwd(), 'app/passengers/page.tsx'), 'utf-8')

    // Verifies quickTravellers and savedTravellers are available across all passenger cards
    expect(src).not.toContain('if (index !== 0) return []')
    expect(src).toContain('quickTravellers.length > 0 && (')
    expect(src).toContain('savedTravellers={savedTravellers}')
  })

  it('ensures the auto-save button defaults to OFF (false) and requires user to explicitly turn it on', () => {
    const fs = require('fs')
    const path = require('path')
    const src = fs.readFileSync(path.join(process.cwd(), 'app/passengers/page.tsx'), 'utf-8')

    // Verifies auto-save toggle state defaults to false
    expect(src).toContain('const [saveToProfile, setSaveToProfile] = useState(false)')
    expect(src).toContain('aria-checked={saveToProfile}')
    expect(src).toContain('onClick={() => setSaveToProfile(!saveToProfile)}')
  })
})
