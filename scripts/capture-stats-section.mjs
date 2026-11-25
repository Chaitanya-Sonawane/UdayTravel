import puppeteer from 'puppeteer'
import path from 'path'

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  })

  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(30000)

    // 1. Laptop View (1440x900)
    await page.setViewport({ width: 1440, height: 900 })
    console.log('Navigating to http://localhost:3000...')
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 1000))

    // Scroll to stats section to trigger animation
    const statsEl = await page.$('#live-stats')
    if (statsEl) {
      await statsEl.scrollIntoView()
      // Wait for count-up animation to reach final numbers
      await new Promise(r => setTimeout(r, 2600))

      await statsEl.screenshot({ path: path.join(ARTIFACT_DIR, '39_dark_theme_stats_updated_laptop.png') })
      console.log('Captured 39_dark_theme_stats_updated_laptop.png')
    }

    // Capture context: bottom of hero + stats section
    await page.evaluate(() => window.scrollTo(0, 600))
    await new Promise(r => setTimeout(r, 500))
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '39_hero_and_stats_updated_laptop.png') })
    console.log('Captured 39_hero_and_stats_updated_laptop.png')

    // 2. Mobile View (390x844)
    console.log('Capturing mobile view...')
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 1000))

    const mobileStats = await page.$('#live-stats')
    if (mobileStats) {
      await mobileStats.scrollIntoView()
      await new Promise(r => setTimeout(r, 2600))
      await mobileStats.screenshot({ path: path.join(ARTIFACT_DIR, '39_dark_theme_stats_updated_mobile.png') })
      console.log('Captured 39_dark_theme_stats_updated_mobile.png')
    }

    console.log('All updated stats screenshots captured successfully!')
  } finally {
    await browser.close()
  }
}

run().catch(console.error)
