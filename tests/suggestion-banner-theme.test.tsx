import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Seat Suggestion Banner Yellow-Orange Theme Verification', () => {
  it('uses yellow-orange / amber theme instead of green for the suggestion banner', () => {
    const seatsPage = fs.readFileSync(path.join(process.cwd(), 'app/seats/page.tsx'), 'utf-8')

    // Find the suggestion banner code block
    const bannerMatch = seatsPage.match(/topSuggestion && !dismissedSuggestion[\s\S]*?<\/aside>/)
    expect(bannerMatch).not.toBeNull()

    const bannerCode = bannerMatch![0]

    // Verify yellow-orange (amber) colors are present
    expect(bannerCode).toContain('amber')
    expect(bannerCode).toContain('orange')
    expect(bannerCode).toContain('from-amber-500')
    expect(bannerCode).toContain('text-amber-950')
    expect(bannerCode).toContain('Use suggestion')

    // Verify emerald / green is completely removed from the suggestion banner
    expect(bannerCode).not.toContain('emerald')
    expect(bannerCode).not.toContain('bg-green')
    expect(bannerCode).not.toContain('text-green')
  })
})
