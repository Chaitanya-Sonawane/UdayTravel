import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'
const screenshotsDir = path.join(artifactDir, 'screenshots')
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const consoleLogs = []
  const pageErrors = []

  const setupPageListeners = (p) => {
    p.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      // Ignore React DevTools notice or standard Vite/Next info
      if (
        !text.includes('[Fast Refresh]') &&
        !text.includes('React DevTools') &&
        !text.includes('Download the React DevTools')
      ) {
        consoleLogs.push({ type, text })
      }
    })
    p.on('pageerror', (err) => {
      pageErrors.push(err.message)
    })
  }

  // 1. TICKET PAGE - DESKTOP / LAPTOP (1440x900)
  console.log('Capturing Ticket Page on Laptop (1440x900)...')
  const pageDesktop = await browser.newPage()
  setupPageListeners(pageDesktop)
  await pageDesktop.setViewport({ width: 1440, height: 900 })
  await pageDesktop.goto('http://localhost:3000/ticket/UT-AP-QCS2UE', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  })
  await new Promise((r) => setTimeout(r, 1500))

  const ticketDesktopPath = path.join(screenshotsDir, '60_ticket_laptop_view.png')
  await pageDesktop.screenshot({ path: ticketDesktopPath, fullPage: true })
  fs.copyFileSync(ticketDesktopPath, path.join(artifactDir, '60_ticket_laptop_view.png'))
  console.log('Saved 60_ticket_laptop_view.png')

  // 2. TICKET PAGE - MOBILE (390x844)
  console.log('Capturing Ticket Page on Mobile (390x844)...')
  const pageMobile = await browser.newPage()
  setupPageListeners(pageMobile)
  await pageMobile.setViewport({ width: 390, height: 844, isMobile: true })
  await pageMobile.goto('http://localhost:3000/ticket/UT-AP-QCS2UE', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  })
  await new Promise((r) => setTimeout(r, 1500))

  const ticketMobilePath = path.join(screenshotsDir, '60_ticket_mobile_view.png')
  await pageMobile.screenshot({ path: ticketMobilePath, fullPage: true })
  fs.copyFileSync(ticketMobilePath, path.join(artifactDir, '60_ticket_mobile_view.png'))
  console.log('Saved 60_ticket_mobile_view.png')

  // 3. SEATS PAGE - LAPTOP (1440x900)
  console.log('Capturing Seats Page on Laptop (1440x900)...')
  const pageSeats = await browser.newPage()
  setupPageListeners(pageSeats)
  await pageSeats.setViewport({ width: 1440, height: 900 })
  await pageSeats.goto('http://localhost:3000/seats?route=AHM_PUN&date=2026-11-26&tripId=AHM_PUN_0600', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  })
  await new Promise((r) => setTimeout(r, 1500))

  const seatsDesktopPath = path.join(screenshotsDir, '60_seats_laptop_view.png')
  await pageSeats.screenshot({ path: seatsDesktopPath, fullPage: false })
  fs.copyFileSync(seatsDesktopPath, path.join(artifactDir, '60_seats_laptop_view.png'))
  console.log('Saved 60_seats_laptop_view.png')

  // 4. BOOKINGS PAGE - LAPTOP (1440x900)
  console.log('Capturing Bookings Page on Laptop (1440x900)...')
  const pageBookings = await browser.newPage()
  setupPageListeners(pageBookings)
  await pageBookings.setViewport({ width: 1440, height: 900 })
  await pageBookings.goto('http://localhost:3000/bookings', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  })
  await pageBookings.waitForSelector('.booking-card', { timeout: 5000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 1000))

  const bookingsDesktopPath = path.join(screenshotsDir, '60_bookings_laptop_view.png')
  await pageBookings.screenshot({ path: bookingsDesktopPath, fullPage: true })
  fs.copyFileSync(bookingsDesktopPath, path.join(artifactDir, '60_bookings_laptop_view.png'))
  console.log('Saved 60_bookings_laptop_view.png')

  // 4b. BOOKING SUMMARY PAGE - LAPTOP (1440x900)
  console.log('Capturing Booking Summary on Laptop (1440x900)...')
  const pageSummary = await browser.newPage()
  setupPageListeners(pageSummary)
  await pageSummary.setViewport({ width: 1440, height: 900 })
  await pageSummary.goto('http://localhost:3000/booking/summary?tripId=AHM_PUN_0600&date=2026-11-26', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  })
  await new Promise((r) => setTimeout(r, 1500))

  const summaryDesktopPath = path.join(screenshotsDir, '60_summary_laptop_view.png')
  await pageSummary.screenshot({ path: summaryDesktopPath, fullPage: true })
  fs.copyFileSync(summaryDesktopPath, path.join(artifactDir, '60_summary_laptop_view.png'))
  console.log('Saved 60_summary_laptop_view.png')

  // 5. HOMEPAGE STATS COUNTER - SCROLLED INTO VIEW (1440x900)
  console.log('Capturing Homepage Stats Counter on Laptop...')
  const pageHome = await browser.newPage()
  setupPageListeners(pageHome)
  await pageHome.setViewport({ width: 1440, height: 900 })
  await pageHome.goto('http://localhost:3000/', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  })
  // Scroll to stats section to trigger count up animation
  await pageHome.evaluate(() => {
    const el = document.getElementById('live-stats')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  // Wait 2.2 seconds for count up to complete smoothly
  await new Promise((r) => setTimeout(r, 2200))

  const statsSection = await pageHome.$('#live-stats')
  if (statsSection) {
    const statsDesktopPath = path.join(screenshotsDir, '60_stats_scrolled_laptop.png')
    await statsSection.screenshot({ path: statsDesktopPath })
    fs.copyFileSync(statsDesktopPath, path.join(artifactDir, '60_stats_scrolled_laptop.png'))
    console.log('Saved 60_stats_scrolled_laptop.png')
  }

  await browser.close()

  console.log('\n--- Console Logs & Errors Audit ---')
  console.log('Total console events captured:', consoleLogs.length)
  const warningsOrErrors = consoleLogs.filter((l) => l.type === 'warn' || l.type === 'error')
  console.log('Warnings or Errors:', warningsOrErrors.length)
  warningsOrErrors.forEach((w) => console.log(`[${w.type.toUpperCase()}] ${w.text}`))
  console.log('Page runtime errors:', pageErrors.length)
  pageErrors.forEach((e) => console.log(`[PAGE ERROR] ${e}`))
}

run().catch((err) => {
  console.error('Run failed:', err)
  process.exit(1)
})
