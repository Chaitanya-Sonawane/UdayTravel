import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/screenshots'
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true })
}
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots', { recursive: true })
}

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    // 1. Confirmed Ticket - Desktop
    const pageConfirmedDesktop = await browser.newPage()
    await pageConfirmedDesktop.setViewport({ width: 1280, height: 950, deviceScaleFactor: 2 })
    console.log('Navigating to confirmed ticket desktop...')
    await pageConfirmedDesktop.goto('http://localhost:3000/ticket/UT-AP-X8B4BR', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))
    await pageConfirmedDesktop.screenshot({ path: 'screenshots/51_ticket_confirmed_desktop.png', fullPage: true })
    await pageConfirmedDesktop.screenshot({ path: path.join(artifactDir, '51_ticket_confirmed_desktop.png'), fullPage: true })
    console.log('Saved 51_ticket_confirmed_desktop.png')
    await pageConfirmedDesktop.close()

    // 2. Confirmed Ticket - Mobile
    const pageConfirmedMobile = await browser.newPage()
    await pageConfirmedMobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    console.log('Navigating to confirmed ticket mobile...')
    await pageConfirmedMobile.goto('http://localhost:3000/ticket/UT-AP-X8B4BR', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))
    await pageConfirmedMobile.screenshot({ path: 'screenshots/51_ticket_confirmed_mobile.png', fullPage: true })
    await pageConfirmedMobile.screenshot({ path: path.join(artifactDir, '51_ticket_confirmed_mobile.png'), fullPage: true })
    console.log('Saved 51_ticket_confirmed_mobile.png')
    await pageConfirmedMobile.close()

    // 3. Cancelled Ticket - Desktop
    const pageCancelledDesktop = await browser.newPage()
    await pageCancelledDesktop.setViewport({ width: 1280, height: 950, deviceScaleFactor: 2 })
    console.log('Navigating to cancelled ticket desktop...')
    await pageCancelledDesktop.goto('http://localhost:3000/ticket/UT-CANCELLED-01', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))
    await pageCancelledDesktop.screenshot({ path: 'screenshots/51_ticket_cancelled_desktop.png', fullPage: true })
    await pageCancelledDesktop.screenshot({ path: path.join(artifactDir, '51_ticket_cancelled_desktop.png'), fullPage: true })
    console.log('Saved 51_ticket_cancelled_desktop.png')
    await pageCancelledDesktop.close()

    // 4. Cancelled Ticket - Mobile
    const pageCancelledMobile = await browser.newPage()
    await pageCancelledMobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    console.log('Navigating to cancelled ticket mobile...')
    await pageCancelledMobile.goto('http://localhost:3000/ticket/UT-CANCELLED-01', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))
    await pageCancelledMobile.screenshot({ path: 'screenshots/51_ticket_cancelled_mobile.png', fullPage: true })
    await pageCancelledMobile.screenshot({ path: path.join(artifactDir, '51_ticket_cancelled_mobile.png'), fullPage: true })
    console.log('Saved 51_ticket_cancelled_mobile.png')
    await pageCancelledMobile.close()

    // 5. Seats Page Suggestions (Desktop)
    const pageSeats = await browser.newPage()
    await pageSeats.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })
    console.log('Navigating to seats page with mixed gender group...')
    await pageSeats.goto('http://localhost:3000/seats?route=AHM_PUN&date=2026-11-25&tripId=AHM_PUN_0600_1003', { waitUntil: 'domcontentloaded' })
    await pageSeats.evaluate(() => {
      try {
        const store = {
          state: {
            fromCity: 'Ahilyanagar',
            toCity: 'Pune',
            travelDate: '2026-11-25',
            busName: 'Uday Express 55-Seater',
            busTemplateId: 'BUS_55',
            busNumber: 'MH 16 DP 4951',
            departureTime: '06:30',
            arrivalTime: '09:30',
            family: true,
            passengers: [
              { id: 'p1', name: 'Chaitanya', age: '22', gender: 'man' },
              { id: 'p2', name: 'ShreeNidhi', age: '20', gender: 'woman' },
            ],
            seatPrice: 200,
          },
          version: 0,
        }
        localStorage.setItem('uday_booking_store', JSON.stringify(store))
      } catch (e) {}
    })
    await pageSeats.reload({ waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2500))
    await pageSeats.screenshot({ path: 'screenshots/51_seats_suggestions_options_desktop.png', fullPage: false })
    await pageSeats.screenshot({ path: path.join(artifactDir, '51_seats_suggestions_options_desktop.png'), fullPage: false })
    console.log('Saved 51_seats_suggestions_options_desktop.png')
    await pageSeats.close()

  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
  }
}

capture()
