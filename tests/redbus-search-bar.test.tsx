import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RedBusSearchBar } from '@/components/home/RedBusSearchBar'
import { RedBusOffersSection } from '@/components/home/RedBusOffersSection'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

describe('RedBus Search Bar & Offers Component Suite', () => {
  it('renders the 4 columns: From, To, Date of Journey, and Booking for women', () => {
    const html = renderToString(<RedBusSearchBar />)

    // Column 1: From
    expect(html).toContain('From')
    expect(html).toContain('Ahilyanagar')

    // Column 2: To
    expect(html).toContain('To')
    expect(html).toContain('Pune')

    // Column 3: Date of Journey
    expect(html).toContain('Date of Journey')
    expect(html).toContain('Today')
    expect(html).toContain('Tomorrow')

    // Column 4: Booking for women
    expect(html).toContain('Booking for women')
    expect(html).toContain('Know more')

    // RedBus style Search buses button
    expect(html).toContain('Search buses')
  })

  it('renders the RedBus Offers for you section with tabs and promo cards', () => {
    const html = renderToString(<RedBusOffersSection />)

    expect(html).toContain('Offers for you')
    expect(html).toContain('View more')
    expect(html).toContain('UDAYFIRST')
    expect(html).toContain('RETURN40')
    expect(html).toContain('All')
    expect(html).toContain('Bus')
  })
})
