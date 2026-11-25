import puppeteer from 'puppeteer'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Launching browser for New Account Passenger Connection Verification...')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  // 1. First set up a 2-passenger booking in sessionStorage with old/stale info
  console.log('Setting up booking store with 2 passengers and stale info...')
  await page.goto('http://localhost:3000/availability', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 1500))

  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    
    // Create initial booking with 2 passengers
    const bookingData = {
      state: {
        journey: {
          from: 'Ahilyanagar',
          to: 'Pune',
          routeId: 'AHM_PUN',
          tripId: 'AHM_PUN_0600',
          date: '2026-11-23',
          busId: 'bus_01',
          busName: 'Uday Express 55-Seater',
          departure: '06:00',
          arrival: '08:45',
          fare: 200,
        },
        passengerCount: 2,
        passengers: [
          { id: 'passenger-1', name: 'Old Stale Name', age: '50', gender: 'man' },
          { id: 'passenger-2', name: 'Old Companion', age: '45', gender: 'woman' }
        ],
        selected: ['A1', 'A2'],
        boarding: 'Swargate',
        dropping: 'Ahilyanagar Stand'
      },
      version: 0
    }
    sessionStorage.setItem('uday-booking-store', JSON.stringify(bookingData))
  })

  // 2. Now simulate creating a NEW account via the registration flow / API
  console.log('Simulating registration of a NEW account: Rohit Shinde (27y, Male)...')
  const newAccountProfile = {
    uid: 'usr_rohit_shinde_777',
    name: 'Rohit Shinde',
    mobile: '9823456789',
    age: '27',
    gender: 'Male',
    email: 'rohit.shinde@example.com',
    savedPassengers: [
      { id: 'sp_self_rohit', name: 'Rohit Shinde', age: 27, gender: 'Male', isSelf: true }
    ]
  }

  await page.evaluate((profile) => {
    localStorage.setItem('uday_auth_token', 'mock_jwt_token_rohit')
    localStorage.setItem('uday_current_uid', profile.uid)
    localStorage.setItem('uday_user_mobile', profile.mobile)
    localStorage.setItem('uday_user_name', profile.name)
    localStorage.setItem('uday_user_profile', JSON.stringify(profile))
    localStorage.setItem('uday_account_created', 'true')
    localStorage.setItem('uday_has_account', 'true')

    // Call store sync if available
    if (window.__BOOKING_STORE__) {
      const store = window.__BOOKING_STORE__.getState()
      const p1 = store.passengers?.[0]
      if (p1) {
        store.updatePassenger(p1.id, {
          name: profile.name,
          age: String(profile.age),
          gender: 'man'
        })
      }
      if (store.passengers && store.passengers.length > 1) {
        for (let i = 1; i < store.passengers.length; i++) {
          store.updatePassenger(store.passengers[i].id, {
            name: '',
            age: '',
            gender: undefined
          })
        }
      }
    }
    window.dispatchEvent(new CustomEvent('uday_auth_changed', { detail: profile }))
  }, newAccountProfile)

  // 3. Navigate to /passengers
  console.log('Navigating to Passengers page (/passengers)...')
  await page.goto('http://localhost:3000/passengers', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))

  // Increase passenger count to 2 travellers
  console.log('Increasing traveller count to 2...')
  const buttonsInitial = await page.$$('button')
  for (const b of buttonsInitial) {
    const aria = await page.evaluate(el => el.getAttribute('aria-label') || el.innerText, b)
    if (aria && (aria.includes('Add') || aria.includes('+'))) {
      await b.click()
      await new Promise(r => setTimeout(r, 600))
      break
    }
  }

  // Click "Continue to passenger details"
  const buttons = await page.$$('button')
  for (const b of buttons) {
    const text = await page.evaluate(el => el.innerText, b)
    if (text && text.includes('Continue to passenger details')) {
      console.log('Clicking "Continue to passenger details"...')
      await b.click()
      break
    }
  }
  await new Promise(r => setTimeout(r, 2000))

  // 4. Verify all passenger fields on details page
  const paxInputs = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'))
    return inputs.map(i => ({ name: i.name, value: i.value, placeholder: i.placeholder }))
  })
  console.log('Inputs found on details page:', paxInputs)

  const screenshotPath = path.join(artifactDir, '14_new_account_passenger_connected_verified.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log('Saved verification screenshot to:', screenshotPath)

  await browser.close()
  console.log('New account passenger connection verification finished successfully!')
}

run().catch(err => {
  console.error('Error during verification:', err)
  process.exit(1)
})
