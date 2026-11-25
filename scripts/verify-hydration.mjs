import puppeteer from 'puppeteer'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Testing hydration on Homepage (http://localhost:3000/)...')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const hydrationErrors = []
  page.on('console', (msg) => {
    const text = msg.text()
    if (
      text.toLowerCase().includes('hydration') ||
      text.toLowerCase().includes('mismatch') ||
      text.includes("didn't match")
    ) {
      console.error('[HYDRATION CONSOLE ERROR DETECTED]:', text)
      hydrationErrors.push(text)
    }
  })

  page.on('pageerror', (err) => {
    const text = err.message || String(err)
    if (
      text.toLowerCase().includes('hydration') ||
      text.toLowerCase().includes('mismatch') ||
      text.includes("didn't match")
    ) {
      console.error('[HYDRATION PAGE ERROR DETECTED]:', text)
      hydrationErrors.push(text)
    }
  })

  // Case 1: First test as an authenticated user with token in localStorage
  console.log('--- Test 1: Authenticated User (with token in localStorage) ---')
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.setItem('uday_auth_token', 'test_auth_token_for_user')
    localStorage.setItem('uday_current_uid', 'usr_chaitanya_test')
    localStorage.setItem('uday_user_name', 'Chaitanya Sonawane')
  })

  // Reload to test SSR + Hydration with token present in client localStorage
  await page.reload({ waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 2000))

  const screenshotAuth = path.join(artifactDir, '18_home_page_hydration_verified.png')
  await page.screenshot({ path: screenshotAuth, fullPage: true })
  console.log('Saved Screenshot to:', screenshotAuth)

  // Case 2: Test as a guest (logged out)
  console.log('--- Test 2: Guest User (empty localStorage) ---')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 2000))

  await browser.close()

  if (hydrationErrors.length > 0) {
    console.error('FAILED: Hydration errors detected:', hydrationErrors)
    process.exit(1)
  }

  console.log('SUCCESS: Zero hydration mismatch errors detected!')
}

run().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
