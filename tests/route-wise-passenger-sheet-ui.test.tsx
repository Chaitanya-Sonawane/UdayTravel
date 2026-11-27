import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { RouteWisePassengerSheet } from '@/components/admin/RouteWisePassengerSheet'

describe('RouteWisePassengerSheet — Modern Route Boarding Checklist UI', () => {
  it('renders separate route tabs for Ahilyanagar → Pune and Pune → Ahilyanagar', () => {
    const html = renderToString(<RouteWisePassengerSheet />)

    // Separate route selector cards/tabs
    expect(html).toContain('Ahilyanagar → Pune')
    expect(html).toContain('Pune → Ahilyanagar')
    expect(html).toContain('Route 1 · 20 Stops')
    expect(html).toContain('Route 2 · 11 Stops')
  })

  it('provides the modern boarding checklist without an Excel table', () => {
    const html = renderToString(<RouteWisePassengerSheet />)

    // Verify it is NOT an Excel table
    expect(html).not.toContain('<table')
    expect(html).not.toContain('<thead>')
    expect(html).not.toContain('<tbody>')

    // Verify presence of checklist elements & boarding indicators
    expect(html).toContain('Passenger Boarding Checklist')
    expect(html).toContain('Passengers Boarded')
  })

  it('supports quick date pills for Today and Tomorrow and filter search', () => {
    const html = renderToString(<RouteWisePassengerSheet />)

    expect(html).toContain('Today')
    expect(html).toContain('Tomorrow')
    expect(html).toContain('Search by passenger name, mobile number, or pickup point')
  })
})
