import puppeteer from 'puppeteer'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Launching browser to verify navigation symbol toggle...')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  console.log('Navigating to Create Account page...')
  await page.goto('http://localhost:3000/account?mode=register&redirect=/availability', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))

  // 1. Initially drawer should not be visible
  let drawerExists = await page.$('aside')
  console.log('Initial drawer visible:', Boolean(drawerExists))

  // Find the header navigation symbol button
  const navBtnSelector = 'header.availability-header button[aria-label*="menu"]'
  const navBtn = await page.$(navBtnSelector)
  if (!navBtn) {
    throw new Error('Navigation symbol button not found in availability-header!')
  }

  // 2. Click 1: Open the drawer
  console.log('1st Click: Clicking navigation symbol to open navigation bar...')
  await navBtn.click()
  await new Promise(r => setTimeout(r, 800))

  drawerExists = await page.$('aside')
  console.log('Drawer visible after 1st click:', Boolean(drawerExists))
  if (!drawerExists) {
    throw new Error('Failed to open navigation drawer on 1st click!')
  }

  const openShot = path.join(artifactDir, '12_nav_symbol_clicked_drawer_open.png')
  await page.screenshot({ path: openShot, fullPage: false })
  console.log('Saved open drawer screenshot:', openShot)

  // 3. Click 2: Click the SAME navigation symbol to close the drawer
  console.log('2nd Click: Clicking the SAME navigation symbol again to close navigation bar...')
  await navBtn.click()
  await new Promise(r => setTimeout(r, 800))

  drawerExists = await page.$('aside')
  console.log('Drawer visible after 2nd click (should be null):', Boolean(drawerExists))
  if (drawerExists) {
    throw new Error('FAILED: Navigation drawer is still visible after clicking the same navigation symbol!')
  } else {
    console.log('SUCCESS: Navigation drawer CLOSED after clicking the same navigation symbol!')
  }

  const closedShot = path.join(artifactDir, '13_nav_symbol_clicked_again_drawer_closed.png')
  await page.screenshot({ path: closedShot, fullPage: false })
  console.log('Saved closed drawer screenshot:', closedShot)

  // 4. Also test on Home Page ('/')
  console.log('\nTesting on Home Page (/)...')
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 2000))

  const homeNavBtnSelector = 'header.home-header button[aria-label*="navigation menu"]'
  const homeNavBtn = await page.$(homeNavBtnSelector)
  if (!homeNavBtn) {
    throw new Error('Home navigation symbol button not found!')
  }

  console.log('1st Click on home navigation symbol: opening...')
  await homeNavBtn.click()
  await new Promise(r => setTimeout(r, 800))

  let homeDrawer = await page.$('aside')
  console.log('Home drawer open:', Boolean(homeDrawer))
  if (!homeDrawer) throw new Error('Home drawer did not open!')

  console.log('2nd Click on SAME home navigation symbol: closing...')
  await homeNavBtn.click()
  await new Promise(r => setTimeout(r, 800))

  homeDrawer = await page.$('aside')
  console.log('Home drawer after 2nd click (should be false):', Boolean(homeDrawer))
  if (homeDrawer) throw new Error('Home drawer did not close on 2nd click!')
  console.log('SUCCESS: Home drawer closed on 2nd click of same navigation symbol!')

  await browser.close()
  console.log('\nAll navigation symbol toggle tests PASSED completely!')
}

run().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
