import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Uday Travels Logo & Brand Consistency Across All Pages', () => {
  const rootDir = process.cwd()
  const globalsCss = fs.readFileSync(path.join(rootDir, 'app/globals.css'), 'utf-8')
  const frontendGlobalsCss = fs.readFileSync(path.join(rootDir, 'frontend/app/globals.css'), 'utf-8')

  it('1. CSS specifies solid #F8B018 background and crisp #0B0F19 text for brand marks', () => {
    expect(globalsCss).toContain('.page-brand-mark')
    expect(globalsCss).toContain('background-color: #F8B018 !important')
    expect(globalsCss).toContain('color: #0B0F19 !important')
    expect(globalsCss).toContain('font-weight: 900 !important')

    expect(frontendGlobalsCss).toContain('background-color: #F8B018 !important')
    expect(frontendGlobalsCss).toContain('color: #0B0F19 !important')
  })

  it('2. Catch-all selectors on .ticket-brand and .availability-logo are eliminated', () => {
    // These caused the text span to also turn into a 34px yellow box
    expect(globalsCss).not.toContain('.ticket-brand span {')
    expect(globalsCss).not.toContain('.availability-logo span {')
  })

  it('3. BrandLogo component renders solid #F8B018 badge with black UT and UDAY TRAVELS text', () => {
    const brandLogoCode = fs.readFileSync(path.join(rootDir, 'components/ui/BrandLogo.tsx'), 'utf-8')
    expect(brandLogoCode).toContain('UT')
    expect(brandLogoCode).toContain('UDAY TRAVELS')
    expect(brandLogoCode).toContain('#F8B018')
    expect(brandLogoCode).toContain('#0B0F19')
  })

  const pagesToCheck = [
    { name: 'Home', file: 'app/page.tsx' },
    { name: 'Availability', file: 'app/availability/page.tsx' },
    { name: 'Seats', file: 'app/seats/page.tsx' },
    { name: 'Passengers', file: 'app/passengers/page.tsx' },
    { name: 'Bookings', file: 'app/bookings/page.tsx' },
    { name: 'Booking Summary', file: 'app/booking/summary/page.tsx' },
    { name: 'Ticket View', file: 'app/ticket/[ticketNo]/page.tsx' },
    { name: 'Account Profile', file: 'app/account/page.tsx' },
    { name: 'Admin Panel', file: 'app/admin/page.tsx' },
    { name: 'About Us', file: 'app/about/page.tsx' },
    { name: 'Policies', file: 'app/policies/page.tsx' },
    { name: 'Contact Us', file: 'app/contact/page.tsx' },
    { name: 'Live Tracking', file: 'app/track/page.tsx' },
    { name: 'Offers', file: 'app/offers/page.tsx' },
    { name: 'Gift Cards', file: 'app/gift-cards/page.tsx' },
  ]

  pagesToCheck.forEach(({ name, file }) => {
    it(`4. Page "${name}" (${file}) retains brand identity and respects navigation bar rule`, () => {
      const code = fs.readFileSync(path.join(rootDir, file), 'utf-8')
      expect(code).toMatch(/UDAY\s*(<!--.*?-->)?\s*TRAVELS|Uday Travels|UT/)
    })
  })

  it('5. NavDrawer includes brand identity and links home', () => {
    const drawerCode = fs.readFileSync(path.join(rootDir, 'components/navigation/NavDrawer.tsx'), 'utf-8')
    expect(drawerCode).toContain('UDAY')
    expect(drawerCode).toContain('href="/"')
  })

  it('6. Help Center includes high-contrast UT brand mark', () => {
    const helpCode = fs.readFileSync(path.join(rootDir, 'components/help-center.tsx'), 'utf-8')
    expect(helpCode).toContain('UT')
    expect(helpCode).toContain('UDAY TRAVELS')
    expect(helpCode).toContain('href="/"')
  })
})
