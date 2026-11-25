import puppeteer from 'puppeteer'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Launching browser to verify Firebase auth/configuration-not-found resolution...')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const detectedErrors = []
  page.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('auth/configuration-not-found') || text.includes('CONFIGURATION_NOT_FOUND')) {
      console.error('[CONSOLE ERROR DETECTED]:', text)
      detectedErrors.push(text)
    }
  })

  page.on('pageerror', (err) => {
    const text = err.message || String(err)
    if (text.includes('auth/configuration-not-found') || text.includes('CONFIGURATION_NOT_FOUND')) {
      console.error('[PAGE ERROR DETECTED]:', text)
      detectedErrors.push(text)
    }
  })

  // 1. Test Passenger Info Page
  console.log('--- Step 1: Testing /passengers page ---')
  await page.goto('http://localhost:3000/availability', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 1000))

  // Seed clean booking state
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    const bookingData = {
      state: {
        journey: {
          from: 'Ahilyanagar',
          to: 'Pune',
          routeId: 'AHM_PUN',
          tripId: 'AHM_PUN_0600',
          date: '2026-11-23',
          busId: 'bus_01',
          busName: 'Uday Express',
          departure: '06:00',
          arrival: '08:45',
          fare: 200,
        },
        passengerCount: 1,
        passengers: [
          { id: 'passenger-1', name: 'Rohan Patil', age: '26', gender: 'man' }
        ],
        selected: [],
        boarding: '',
        dropping: ''
      },
      version: 0
    }
    sessionStorage.setItem('uday-booking-store', JSON.stringify(bookingData))
  })

  await page.goto('http://localhost:3000/passengers', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))

  // Click "Continue to passenger details"
  const buttons = await page.$$('button')
  for (const b of buttons) {
    const text = await page.evaluate(el => el.innerText, b)
    if (text && text.includes('Continue to passenger details')) {
      await b.click()
      break
    }
  }
  await new Promise(r => setTimeout(r, 2000))

  // Select pick-up & drop points if selects exist
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'))
    selects.forEach(s => {
      if (s.options.length > 1) {
        s.selectedIndex = 1
        s.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
  })
  await new Promise(r => setTimeout(r, 500))

  const passengerScreenshot = path.join(artifactDir, '15_passengers_no_firebase_config_error.png')
  await page.screenshot({ path: passengerScreenshot, fullPage: true })
  console.log('Saved Passenger Page screenshot to:', passengerScreenshot)

  // 2. Test Seat Selection Page
  console.log('--- Step 2: Testing /seats page & seat hold ---')
  await page.goto('http://localhost:3000/seats?route=AHM_PUN&date=2026-11-23&tripId=AHM_PUN_0600', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 3000))

  // Check if seat A1 can be clicked
  const seatButtons = await page.$$('button')
  let seatClicked = false
  for (const b of seatButtons) {
    const text = await page.evaluate(el => el.innerText, b)
    if (text && text.trim() === 'A1') {
      console.log('Clicking seat A1...')
      await b.click()
      seatClicked = true
      break
    }
  }

  if (!seatClicked) {
    // Try clicking "Use suggestion" if available
    for (const b of seatButtons) {
      const text = await page.evaluate(el => el.innerText, b)
      if (text && text.includes('Use suggestion')) {
        console.log('Clicking "Use suggestion"...')
        await b.click()
        seatClicked = true
        break
      }
    }
  }

  await new Promise(r => setTimeout(r, 1000))

  const seatsSelectionScreenshot = path.join(artifactDir, '16_seats_selected_no_firebase_config_error.png')
  await page.screenshot({ path: seatsSelectionScreenshot, fullPage: true })
  console.log('Saved Seat Selection screenshot to:', seatsSelectionScreenshot)

  // Now click "Continue" to trigger handleHoldSeats -> getApiAuthHeaders() -> /api/seats/hold
  console.log('Clicking "Continue" / Hold Seats CTA...')
  const actionButtons = await page.$$('button')
  for (const b of actionButtons) {
    const text = await page.evaluate(el => el.innerText, b)
    if (text && text.trim().startsWith('Continue')) {
      console.log('Found Continue button with text:', text.trim())
      await b.click()
      break
    }
  }

  await new Promise(r => setTimeout(r, 3000))

  const currentUrl = page.url()
  console.log('Current URL after hold action:', currentUrl)

  // Check if any error banner or text exists on page
  const errorText = await page.evaluate(() => {
    const errorEl = document.querySelector('[role="alert"], .text-rose-600, .bg-rose-50, .border-rose-300')
    return errorEl ? errorEl.textContent : null
  })
  console.log('Error banner text on page (if any):', errorText)

  const finalScreenshot = path.join(artifactDir, '17_seats_hold_success_booking_summary.png')
  await page.screenshot({ path: finalScreenshot, fullPage: true })
  console.log('Saved Final screenshot to:', finalScreenshot)

  await browser.close()

  if (detectedErrors.length > 0) {
    console.error('FAILED: Found configuration-not-found errors:', detectedErrors)
    process.exit(1)
  }

  if (errorText && errorText.includes('configuration-not-found')) {
    console.error('FAILED: Error banner displayed configuration-not-found:', errorText)
    process.exit(1)
  }

  console.log('SUCCESS: Zero auth/configuration-not-found errors detected on passengers and seats!')
}

run().catch(err => {
  console.error('Test execution error:', err)
  process.exit(1)
})
