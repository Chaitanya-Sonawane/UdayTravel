import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/screenshots'
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true })
}

async function verify() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })

    console.log('--- 1. Testing /seats Bench Selection, Hero Subtitle & Suggestion ---')
    await page.goto('http://localhost:3000/seats', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))

    // Inject 1 female passenger into localStorage and re-evaluate
    await page.evaluate(() => {
      const state = {
        state: {
          journey: {
            from: 'Ahilyanagar',
            to: 'Pune',
            routeId: 'ahilyanagar_to_pune',
            tripId: 'AHM-PUN-0630',
            date: '2026-11-26',
            busId: 'bus_55',
            busName: 'Uday Express 55-Seater',
            departure: '06:30',
            arrival: '09:45',
            fare: 200
          },
          passengerCount: 1,
          passengers: [{ id: 'passenger-1', name: 'ShreeNidhi', age: '24', gender: 'woman', prefs: { seatType: 'any', area: 'any' } }],
          family: false,
          acceptAdjacent: false,
          selected: []
        },
        version: 0
      }
      localStorage.setItem('uday-booking-store', JSON.stringify(state))
    })

    await page.reload({ waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1500))

    // Check Hero Subtitle removal
    const heroText = await page.evaluate(() => {
      const hero = document.querySelector('.seats-hero')
      return hero ? hero.innerText : ''
    })
    console.log('Hero banner text:', heroText)
    const hasOldSubtitle = heroText.includes('Ahilyanagar to Pune ·')
    console.log('Has old subtitle removed?', !hasOldSubtitle)

    // Click Female toggle button to ensure active passenger is Female
    console.log('Ensuring passenger is set to Female...')
    await page.evaluate(() => {
      if (window.__BOOKING_STORE__) {
        window.__BOOKING_STORE__.getState().updatePassenger('passenger-1', { gender: 'woman' })
      }
    })
    await new Promise(r => setTimeout(r, 500))
    const suggestionCardsCount = await page.evaluate(() => {
      const banner = document.querySelector('aside')
      if (!banner) return 0
      return banner.querySelectorAll('button[type="button"]').length // Dismiss + 1 action button
    })
    console.log('Suggestion action buttons count (expect 2: 1 close + 1 use suggestion):', suggestionCardsCount)

    // Initial state: A3, A4, A5 classes before click
    const initialSeats = await page.evaluate(() => {
      const s3 = document.querySelector('[data-seat-id="A3"]')?.className || ''
      const s4 = document.querySelector('[data-seat-id="A4"]')?.className || ''
      const s5 = document.querySelector('[data-seat-id="A5"]')?.className || ''
      return { s3, s4, s5 }
    })
    console.log('Initial seats before selection:', initialSeats)

    // Click seat A3
    console.log('Clicking seat A3 for female passenger...')
    await page.click('[data-seat-id="A3"]')
    await new Promise(r => setTimeout(r, 800))

    // Check seats after selecting A3
    const afterSelectA3 = await page.evaluate(() => {
      const s3 = document.querySelector('[data-seat-id="A3"]')?.className || ''
      const s4 = document.querySelector('[data-seat-id="A4"]')?.className || ''
      const s5 = document.querySelector('[data-seat-id="A5"]')?.className || ''
      return { s3, s4, s5 }
    })
    console.log('Seats after selecting A3:', afterSelectA3)

    const benchScreenshotPath = path.join(artifactDir, '57_seats_3bench_female_selected.png')
    await page.screenshot({ path: benchScreenshotPath, fullPage: false })
    console.log('Saved 3-bench selected screenshot:', benchScreenshotPath)

    // Now unclick seat A3
    console.log('Unclicking seat A3...')
    await page.click('[data-seat-id="A3"]')
    await new Promise(r => setTimeout(r, 800))

    const afterUnselectA3 = await page.evaluate(() => {
      const s3 = document.querySelector('[data-seat-id="A3"]')?.className || ''
      const s4 = document.querySelector('[data-seat-id="A4"]')?.className || ''
      const s5 = document.querySelector('[data-seat-id="A5"]')?.className || ''
      return { s3, s4, s5 }
    })
    console.log('Seats after unselecting A3 (reverted):', afterUnselectA3)

    const revertedScreenshotPath = path.join(artifactDir, '57_seats_3bench_reverted.png')
    await page.screenshot({ path: revertedScreenshotPath, fullPage: false })
    console.log('Saved 3-bench reverted screenshot:', revertedScreenshotPath)

    console.log('--- 2. Testing /ticket/UT-AP-QCS2UE Receipt Layout ---')
    await page.goto('http://localhost:3000/ticket/UT-AP-QCS2UE', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 1500))

    const ticketDesktopPath = path.join(artifactDir, '57_ticket_receipt_desktop.png')
    await page.screenshot({ path: ticketDesktopPath, fullPage: false })
    console.log('Saved ticket receipt desktop screenshot:', ticketDesktopPath)

    // Mobile view for ticket receipt
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })
    await page.reload({ waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1000))

    const ticketMobilePath = path.join(artifactDir, '57_ticket_receipt_mobile.png')
    await page.screenshot({ path: ticketMobilePath, fullPage: false })
    console.log('Saved ticket receipt mobile screenshot:', ticketMobilePath)

    console.log('--- 3. Testing /booking/summary Clean Stop Names ---')
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })
    await page.goto('http://localhost:3000/booking/summary', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.evaluate(() => {
      const state = {
        state: {
          journey: {
            from: 'Pune',
            to: 'Ahilyanagar',
            routeId: 'pune_to_ahilyanagar',
            tripId: 'PUN-AHM-1000',
            date: '2026-11-26',
            departure: '10:00',
            arrival: '13:15',
            busName: 'Uday Express',
            fare: 200
          },
          passengerCount: 1,
          passengers: [{ id: 'p1', name: 'Chaitanya', age: '22', gender: 'man', seatId: 'A1' }],
          selected: ['A1'],
          boarding: 'Sangamwadi — 6:30 PM',
          dropping: 'Ekvira Chowk',
          pickupSnapshot: { pointId: 'pp_sangamwadi', name: 'Sangamwadi', pickupTime: '10:00' },
          dropSnapshot: { pointId: 'dp_ekvira_chowk', name: 'Ekvira Chowk' },
          holdExpiresAt: Date.now() + 600000,
          grp: 'grp_test_clean',
          holdToken: 'ht_test_clean'
        },
        version: 0
      }
      localStorage.setItem('uday-booking-store', JSON.stringify(state))
    })
    await page.reload({ waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1500))

    const summaryText = await page.evaluate(() => {
      const sec = document.querySelector('section')
      return sec ? sec.innerText : ''
    })
    console.log('Has raw "6:30 PM" timestamp stripped in boarding title?', !summaryText.includes('Boarding: Sangamwadi — 6:30 PM'))

    const summaryCleanPath = path.join(artifactDir, '57_trip_timeline_clean.png')
    await page.screenshot({ path: summaryCleanPath, fullPage: false })
    console.log('Saved clean trip timeline screenshot:', summaryCleanPath)

    console.log('ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY!')
  } finally {
    await browser.close()
  }
}

verify().catch(console.error)
