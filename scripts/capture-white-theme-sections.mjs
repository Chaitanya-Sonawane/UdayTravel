import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = 'http://localhost:3000'
const OUT_DIR = path.resolve(process.cwd(), 'screenshots')
const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function capture() {
  console.log('Launching browser for white theme verification...')
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--user-data-dir=/tmp/puppeteer-profile-white-theme',
    ],
  })

  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  page.setDefaultNavigationTimeout(30000)

  // 1. Laptop view
  console.log('Capturing home page in laptop view (1440x900)...')
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2000))

  // Full page screenshot
  const fullLaptopPath = path.join(OUT_DIR, '01_home_laptop.png')
  const artifactFullLaptop = path.join(ARTIFACT_DIR, 'screenshots', '01_home_laptop.png')
  await page.screenshot({ path: fullLaptopPath, fullPage: true })
  fs.copyFileSync(fullLaptopPath, artifactFullLaptop)

  // Section screenshot
  const sectionElement = await page.$('.w-full.bg-white.text-gray-900')
  if (sectionElement) {
    const sectionLaptopPath = path.join(ARTIFACT_DIR, '31_white_theme_section_laptop.png')
    await sectionElement.screenshot({ path: sectionLaptopPath })
    console.log('Saved 31_white_theme_section_laptop.png')
  }

  // 2. Mobile view
  console.log('Capturing home page in mobile view (390x844)...')
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2000))

  const fullMobilePath = path.join(OUT_DIR, '01_home_mobile.png')
  const artifactFullMobile = path.join(ARTIFACT_DIR, 'screenshots', '01_home_mobile.png')
  await page.screenshot({ path: fullMobilePath, fullPage: true })
  fs.copyFileSync(fullMobilePath, artifactFullMobile)

  const sectionMobileElement = await page.$('.w-full.bg-white.text-gray-900')
  if (sectionMobileElement) {
    const sectionMobilePath = path.join(ARTIFACT_DIR, '31_white_theme_section_mobile.png')
    await sectionMobileElement.screenshot({ path: sectionMobilePath })
    console.log('Saved 31_white_theme_section_mobile.png')
  }

  // 3. Availability view with yellow badge and person counter
  console.log('Capturing availability view with yellow elements and person counter...')
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(`${BASE_URL}/availability?route=AHM_PUN&date=2026-11-24`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2000))

  const availLaptopPath = path.join(ARTIFACT_DIR, '32_availability_person_counter_laptop.png')
  await page.screenshot({ path: availLaptopPath, fullPage: false })
  console.log('Saved 32_availability_person_counter_laptop.png')

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(`${BASE_URL}/availability?route=AHM_PUN&date=2026-11-24`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2000))

  const availMobilePath = path.join(ARTIFACT_DIR, '32_availability_person_counter_mobile.png')
  await page.screenshot({ path: availMobilePath, fullPage: false })
  console.log('Saved 32_availability_person_counter_mobile.png')

  await browser.close()
  console.log('All captures completed successfully!')
}

capture().catch((err) => {
  console.error('Capture failed:', err)
  process.exit(1)
})
