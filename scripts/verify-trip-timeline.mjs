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

  // Test 1: Pune -> Ahilyanagar (exact scenario from user screenshot)
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

  // Navigate to summary and inject state
  await page.goto('http://localhost:3000/booking/summary', { waitUntil: 'domcontentloaded', timeout: 60000 })

  await page.evaluate(() => {
    const puneTripState = {
      state: {
        journey: {
          from: 'Pune',
          to: 'Ahilyanagar',
          routeId: 'pune_to_ahilyanagar',
          tripId: 'PUN-AHM-1000',
          date: '2026-11-25',
          busId: 'bus_express_1',
          busName: 'Uday Express Deluxe',
          departure: '10:00',
          arrival: '13:15',
          fare: 200
        },
        passengerCount: 1,
        passengers: [
          { id: 'p1', name: 'Chaitanya Sonawane', age: '22', gender: 'man', seatId: '12' }
        ],
        selected: ['12'],
        boarding: 'Sangamwadi — 6:30 PM', // Simulates legacy raw string
        dropping: 'Ekvira Chowk',
        pickupSnapshot: { pointId: 'pp_sangamwadi', name: 'Sangamwadi', pickupTime: '10:00' },
        dropSnapshot: { pointId: 'dp_ekvira_chowk', name: 'Ekvira Chowk' },
        holdExpiresAt: Date.now() + 600000,
        grp: 'grp_test_pune',
        holdToken: 'ht_test_pune',
        family: false,
        acceptAdjacent: false,
        loadedSeats: []
      },
      version: 0
    }
    window.sessionStorage.setItem('uday-booking-store', JSON.stringify(puneTripState))
    if (window.__BOOKING_STORE__) {
      window.__BOOKING_STORE__.setState(puneTripState.state)
    }
  })

  // Reload so Zustand store re-hydrates
  await page.reload({ waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1000))

  const punePath = path.join(artifactDir, '53_trip_timeline_pune_to_ahilyanagar.png')
  await page.screenshot({ path: punePath, fullPage: false })
  console.log('Saved Pune -> Ahilyanagar screenshot to:', punePath)

  // Mobile screenshot of Pune -> Ahilyanagar
  const mobilePage = await browser.newPage()
  await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await mobilePage.goto('http://localhost:3000/booking/summary', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await mobilePage.evaluate(() => {
    const puneTripState = {
      state: {
        journey: {
          from: 'Pune',
          to: 'Ahilyanagar',
          routeId: 'pune_to_ahilyanagar',
          tripId: 'PUN-AHM-1000',
          date: '2026-11-25',
          busId: 'bus_express_1',
          busName: 'Uday Express Deluxe',
          departure: '10:00',
          arrival: '13:15',
          fare: 200
        },
        passengerCount: 1,
        passengers: [
          { id: 'p1', name: 'Chaitanya Sonawane', age: '22', gender: 'man', seatId: '12' }
        ],
        selected: ['12'],
        boarding: 'Sangamwadi — 6:30 PM',
        dropping: 'Ekvira Chowk',
        pickupSnapshot: { pointId: 'pp_sangamwadi', name: 'Sangamwadi', pickupTime: '10:00' },
        dropSnapshot: { pointId: 'dp_ekvira_chowk', name: 'Ekvira Chowk' },
        holdExpiresAt: Date.now() + 600000,
        grp: 'grp_test_pune_mobile',
        holdToken: 'ht_test_pune_mobile'
      },
      version: 0
    }
    window.sessionStorage.setItem('uday-booking-store', JSON.stringify(puneTripState))
    if (window.__BOOKING_STORE__) {
      window.__BOOKING_STORE__.setState(puneTripState.state)
    }
  })
  await mobilePage.reload({ waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1000))

  const mobilePath = path.join(artifactDir, '53_trip_timeline_pune_mobile.png')
  await mobilePage.screenshot({ path: mobilePath, fullPage: true })
  console.log('Saved Mobile Pune -> Ahilyanagar screenshot to:', mobilePath)

  // Test 2: Ahilyanagar -> Pune
  await page.evaluate(() => {
    const nagarTripState = {
      state: {
        journey: {
          from: 'Ahilyanagar',
          to: 'Pune',
          routeId: 'ahilyanagar_to_pune',
          tripId: 'AHM-PUN-0630',
          date: '2026-11-25',
          busId: 'bus_express_2',
          busName: 'Uday Express',
          departure: '06:30',
          arrival: '09:45',
          fare: 200
        },
        passengerCount: 1,
        passengers: [
          { id: 'p1', name: 'Chaitanya Sonawane', age: '22', gender: 'man', seatId: '5' }
        ],
        selected: ['5'],
        boarding: 'Office — 6:30 AM',
        dropping: 'Sangamwadi',
        pickupSnapshot: { pointId: 'pp_office', name: 'Office', pickupTime: '06:30' },
        dropSnapshot: { pointId: 'dp_sangamwadi', name: 'Sangamwadi' },
        holdExpiresAt: Date.now() + 600000,
        grp: 'grp_test_nagar',
        holdToken: 'ht_test_nagar'
      },
      version: 0
    }
    window.sessionStorage.setItem('uday-booking-store', JSON.stringify(nagarTripState))
    if (window.__BOOKING_STORE__) {
      window.__BOOKING_STORE__.setState(nagarTripState.state)
    }
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1000))

  const nagarPath = path.join(artifactDir, '53_trip_timeline_ahilyanagar_to_pune.png')
  await page.screenshot({ path: nagarPath, fullPage: false })
  console.log('Saved Ahilyanagar -> Pune screenshot to:', nagarPath)

  await browser.close()
}

verify().catch(err => {
  console.error(err)
  process.exit(1)
})
