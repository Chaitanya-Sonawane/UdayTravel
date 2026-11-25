import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = 'http://localhost:3000'
const OUT_DIR = path.resolve(process.cwd(), 'screenshots')
const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

for (const dir of [OUT_DIR, ARTIFACT_DIR, path.join(ARTIFACT_DIR, 'screenshots')]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function capture() {
  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--user-data-dir=/tmp/puppeteer-profile-cards',
    ],
  })

  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  page.setDefaultNavigationTimeout(30000)

  // 1. Laptop view
  console.log('Capturing laptop view...')
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(`${BASE_URL}/availability?route=AHM_PUN&date=2026-11-24`, {
    waitUntil: 'networkidle2',
  })
  // Wait for bus cards to render
  await page.waitForSelector('.bus-list article', { timeout: 10000 })
  await new Promise((r) => setTimeout(r, 1500))

  const laptopPath = path.join(OUT_DIR, '02_availability_laptop.png')
  const artifactLaptop = path.join(ARTIFACT_DIR, '26_bus_card_redesign_laptop.png')
  const artifactGlobalLaptop = path.join(ARTIFACT_DIR, 'screenshots', '02_availability_laptop.png')
  await page.screenshot({ path: laptopPath, fullPage: true })
  fs.copyFileSync(laptopPath, artifactLaptop)
  fs.copyFileSync(laptopPath, artifactGlobalLaptop)
  console.log('Saved laptop screenshot.')

  // 2. Mobile view
  console.log('Capturing mobile view...')
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(`${BASE_URL}/availability?route=AHM_PUN&date=2026-11-24`, {
    waitUntil: 'networkidle2',
  })
  await page.waitForSelector('.bus-list article', { timeout: 10000 })
  await new Promise((r) => setTimeout(r, 1500))

  const mobilePath = path.join(OUT_DIR, '02_availability_mobile.png')
  const artifactMobile = path.join(ARTIFACT_DIR, '26_bus_card_redesign_mobile.png')
  const artifactGlobalMobile = path.join(ARTIFACT_DIR, 'screenshots', '02_availability_mobile.png')
  await page.screenshot({ path: mobilePath, fullPage: true })
  fs.copyFileSync(mobilePath, artifactMobile)
  fs.copyFileSync(mobilePath, artifactGlobalMobile)
  console.log('Saved mobile screenshot.')

  await browser.close()
  console.log('All captures complete!')
}

capture().catch((err) => {
  console.error('Capture failed:', err)
  process.exit(1)
})
