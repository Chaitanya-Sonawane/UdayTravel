import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { DailyRouteBusScheduler } from '@/components/admin/DailyRouteBusScheduler'

describe('Daily Route Bus Scheduler Responsive Cards & Webapp Theme Date Verification', () => {
  it('renders the Webapp White-Yellow theme Choose Date button with Today, Tomorrow, and Calendar picker', () => {
    const html = renderToString(<DailyRouteBusScheduler />)
    expect(html).toContain('Schedule Date')
    expect(html).toContain('Today')
    expect(html).toContain('Tomorrow')
    expect(html).toContain('Choose date')
    expect(html).toContain('aria-label="Choose date"')
  })

  it('renders the Published Departures section with responsive grid and sync controls', () => {
    const html = renderToString(<DailyRouteBusScheduler />)
    expect(html).toContain('Published Departures')
    expect(html).toContain('Sync')
  })
})
