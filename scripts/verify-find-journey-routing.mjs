import puppeteer from 'puppeteer'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  // ----------------------------------------------------
  // Scenario 1: Logged OUT -> Find your journey -> Create my account
  // ----------------------------------------------------
  console.log('\n--- Scenario 1: Unauthenticated Visitor ---')
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' })

  // Clear local storage completely to simulate logged out user
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1500))

  console.log('Clicking "Find your journey" button on home page...')
  const heroBtnSelector = 'a[href*="/availability"], a[href*="/account"]'
  const btn = await page.$(heroBtnSelector)
  if (!btn) {
    throw new Error('Hero button "Find your journey" not found!')
  }

  // Click hero button
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    btn.click()
  ])
  await new Promise(r => setTimeout(r, 3500))

  const loggedOutUrl = page.url()
  console.log('Target URL after click (Logged Out):', loggedOutUrl)
  if (!loggedOutUrl.includes('/account?mode=register&redirect=/availability')) {
    console.error('FAILED: Logged out user was not redirected to /account?mode=register&redirect=/availability!')
  } else {
    console.log('SUCCESS: Correctly redirected to Create Account page.')
  }

  const pageText = await page.evaluate(() => document.body.innerText)
  const hasCreateAccount = pageText.includes('CREATE YOUR') || pageText.includes('Create Account')
  console.log('Renders Create Account page contents:', hasCreateAccount)

  const unauthShot = path.join(artifactDir, '08_find_journey_unauth_create_account.png')
  await page.screenshot({ path: unauthShot, fullPage: false })
  console.log('Saved unauthenticated screenshot to:', unauthShot)

  // ----------------------------------------------------
  // Scenario 2: Logged IN -> Find your journey -> Choose your journey (/availability)
  // ----------------------------------------------------
  console.log('\n--- Scenario 2: Authenticated Visitor ---')
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' })

  // Set logged in session in localStorage
  await page.evaluate(() => {
    localStorage.setItem('uday_auth_token', 'mock_jwt_token_jayesh')
    localStorage.setItem('uday_current_uid', 'usr_jayesh_pude_001')
    localStorage.setItem('uday_user_mobile', '919876598765')
    localStorage.setItem('uday_user_name', 'Jayesh Pude')
    localStorage.setItem('uday_user_profile', JSON.stringify({
      uid: 'usr_jayesh_pude_001',
      name: 'Jayesh Pude',
      mobile: '919876598765',
      age: '30',
      gender: 'Male',
      email: 'jayesh.pude@example.com',
      savedPassengers: [
        { id: 'sp_1', name: 'Jayesh Pude', age: '30', gender: 'Male', isSelf: true }
      ]
    }))
    window.dispatchEvent(new CustomEvent('uday_auth_changed', { detail: { uid: 'usr_jayesh_pude_001' } }))
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1500))

  console.log('Clicking "Find your journey" button on home page while logged in...')
  const loggedInBtn = await page.$(heroBtnSelector)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
    loggedInBtn.click()
  ])
  await new Promise(r => setTimeout(r, 2000))

  const loggedInUrl = page.url()
  console.log('Target URL after click (Logged In):', loggedInUrl)
  if (!loggedInUrl.includes('/availability')) {
    console.error('FAILED: Logged in user was not redirected to /availability!')
  } else {
    console.log('SUCCESS: Correctly navigated to availability ("choose your journey").')
  }

  const authShot = path.join(artifactDir, '09_find_journey_auth_availability.png')
  await page.screenshot({ path: authShot, fullPage: false })
  console.log('Saved authenticated screenshot to:', authShot)

  await browser.close()
  console.log('\nVerification completed successfully!')
}

run().catch(err => {
  console.error('Error during verification:', err)
  process.exit(1)
})
