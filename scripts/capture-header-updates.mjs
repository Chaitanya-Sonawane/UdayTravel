import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/screenshots'
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true })
}

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  // 1. /seats - Laptop view
  const pageSeatsLaptop = await browser.newPage()
  await pageSeatsLaptop.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await pageSeatsLaptop.goto('http://localhost:3000/seats?route=AHM_PUN&date=2026-11-24&tripId=AHM_PUN_0600_1003', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))
  const seatsLaptopPath = path.join(artifactDir, '50_seats_header_laptop.png')
  await pageSeatsLaptop.screenshot({ path: seatsLaptopPath, fullPage: false })
  console.log('Saved:', seatsLaptopPath)

  // 2. /seats - Mobile view
  const pageSeatsMobile = await browser.newPage()
  await pageSeatsMobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await pageSeatsMobile.goto('http://localhost:3000/seats?route=AHM_PUN&date=2026-11-24&tripId=AHM_PUN_0600_1003', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))
  const seatsMobilePath = path.join(artifactDir, '50_seats_header_mobile.png')
  await pageSeatsMobile.screenshot({ path: seatsMobilePath, fullPage: false })
  console.log('Saved:', seatsMobilePath)

  // 3. /booking/summary - Laptop view
  const pageSummaryLaptop = await browser.newPage()
  await pageSummaryLaptop.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await pageSummaryLaptop.goto('http://localhost:3000/booking/summary', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))
  const summaryLaptopPath = path.join(artifactDir, '50_booking_summary_header_laptop.png')
  await pageSummaryLaptop.screenshot({ path: summaryLaptopPath, fullPage: false })
  console.log('Saved:', summaryLaptopPath)

  // 4. /booking/summary - Mobile view
  const pageSummaryMobile = await browser.newPage()
  await pageSummaryMobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await pageSummaryMobile.goto('http://localhost:3000/booking/summary', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))
  const summaryMobilePath = path.join(artifactDir, '50_booking_summary_header_mobile.png')
  await pageSummaryMobile.screenshot({ path: summaryMobilePath, fullPage: false })
  console.log('Saved:', summaryMobilePath)

  await browser.close()
}

capture().catch(err => {
  console.error(err)
  process.exit(1)
})
