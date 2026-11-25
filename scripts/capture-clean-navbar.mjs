import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function capture() {
  console.log('Launching browser to capture clean navbar...')
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  const page = await browser.newPage()
  page.setDefaultTimeout(30000)

  // 1. Mobile view navbar closed
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 1500))

  // Screenshot top navbar area
  const navClosedPath = path.join(ARTIFACT_DIR, '33_clean_navbar_mobile.png')
  await page.screenshot({
    path: navClosedPath,
    clip: { x: 0, y: 0, width: 390, height: 75 },
  })
  console.log('Saved 33_clean_navbar_mobile.png')

  // 2. Open drawer and screenshot top
  const menuBtn = await page.$('button[aria-label="Open navigation menu"]')
  if (menuBtn) {
    await menuBtn.click()
    await new Promise((r) => setTimeout(r, 800))
    const navOpenPath = path.join(ARTIFACT_DIR, '33_clean_navbar_drawer_open_mobile.png')
    await page.screenshot({
      path: navOpenPath,
      clip: { x: 0, y: 0, width: 390, height: 85 },
    })
    console.log('Saved 33_clean_navbar_drawer_open_mobile.png')
  }

  // 3. Laptop view
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 1500))

  const navLaptopPath = path.join(ARTIFACT_DIR, '33_clean_navbar_laptop.png')
  await page.screenshot({
    path: navLaptopPath,
    clip: { x: 0, y: 0, width: 1440, height: 85 },
  })
  console.log('Saved 33_clean_navbar_laptop.png')

  // Full page mobile & laptop updates
  const fullMob = path.join(ARTIFACT_DIR, 'screenshots', '01_home_mobile.png')
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 1500))
  await page.screenshot({ path: fullMob, fullPage: true })

  const fullLap = path.join(ARTIFACT_DIR, 'screenshots', '01_home_laptop.png')
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 1500))
  await page.screenshot({ path: fullLap, fullPage: true })

  await browser.close()
  console.log('Finished capturing clean navbar!')
}

capture().catch((err) => {
  console.error('Navbar capture failed:', err)
  process.exit(1)
})
