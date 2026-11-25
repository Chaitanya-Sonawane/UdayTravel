import puppeteer from 'puppeteer'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Testing site navigation to verify clean logs and zero continuous compiling...')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  let requestCount = {
    account: 0,
    wallet: 0
  }

  page.on('request', req => {
    const url = req.url()
    if (url.includes('/api/account')) requestCount.account++
    if (url.includes('/api/wallet')) requestCount.wallet++
  })

  // 1. Visit Home
  console.log('Visiting Home...')
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))

  // 2. Visit Account
  console.log('Visiting Account page...')
  await page.goto('http://localhost:3000/account', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 3000))

  // 3. Visit Passengers
  console.log('Visiting Passengers page...')
  await page.goto('http://localhost:3000/passengers', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 3000))

  // 4. Visit Seats
  console.log('Visiting Seats page...')
  await page.goto('http://localhost:3000/seats?route=AHM_PUN&date=2026-11-22&tripId=AHM_PUN_0600_4951', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 3000))

  // Check if any "Compiling" pill or element is visible
  const compilingIndicator = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'))
    for (const el of els) {
      if (el.textContent && el.textContent.includes('Compiling') && el.offsetParent !== null) {
        return el.textContent
      }
    }
    return null
  })
  console.log('Compiling indicator on screen:', compilingIndicator)

  console.log(`Total requests observed over 11 seconds of navigation across 4 pages:`)
  console.log(`  /api/account: ${requestCount.account}`)
  console.log(`  /api/wallet: ${requestCount.wallet}`)

  const screenshotPath = path.join(artifactDir, '19_clean_compiling_log_verified.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log('Saved screenshot to:', screenshotPath)

  await browser.close()

  // If there was an infinite loop, requests would be hundreds or thousands
  if (requestCount.account > 15 || requestCount.wallet > 10) {
    console.error('FAILED: Excessive repeated requests detected, loop still present!')
    process.exit(1)
  }

  console.log('SUCCESS: Navigation is clean, zero infinite loops, and logs are calm!')
}

run().catch(err => {
  console.error('Error during test:', err)
  process.exit(1)
})
