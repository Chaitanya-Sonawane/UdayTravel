import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = 'http://localhost:3000'
const OUT_DIR = path.resolve(process.cwd(), 'screenshots')
const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function capture() {
  console.log('Launching browser to capture compact professional footer...')
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--user-data-dir=/tmp/puppeteer-profile-footer-clean',
    ],
  })

  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  page.setDefaultNavigationTimeout(30000)

  // 1. Laptop view
  console.log('Capturing laptop view...')
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 1500))

  // Capture full home page
  const fullLaptopPath = path.join(OUT_DIR, '01_home_laptop.png')
  const artifactFullLaptop = path.join(ARTIFACT_DIR, 'screenshots', '01_home_laptop.png')
  await page.screenshot({ path: fullLaptopPath, fullPage: true })
  fs.copyFileSync(fullLaptopPath, artifactFullLaptop)

  // Specifically capture footer element
  const footerElement = await page.$('footer')
  if (footerElement) {
    const footerLaptopPath = path.join(ARTIFACT_DIR, '34_compact_professional_footer_laptop.png')
    await footerElement.screenshot({ path: footerLaptopPath })
    console.log('Saved 34_compact_professional_footer_laptop.png')
  }

  // 2. Mobile view
  console.log('Capturing mobile view...')
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 1500))

  // Capture full home page mobile
  const fullMobilePath = path.join(OUT_DIR, '01_home_mobile.png')
  const artifactFullMobile = path.join(ARTIFACT_DIR, 'screenshots', '01_home_mobile.png')
  await page.screenshot({ path: fullMobilePath, fullPage: true })
  fs.copyFileSync(fullMobilePath, artifactFullMobile)

  // Specifically capture footer element mobile
  const footerMobileElement = await page.$('footer')
  if (footerMobileElement) {
    const footerMobilePath = path.join(ARTIFACT_DIR, '34_compact_professional_footer_mobile.png')
    await footerMobileElement.screenshot({ path: footerMobilePath })
    console.log('Saved 34_compact_professional_footer_mobile.png')
  }

  await browser.close()
  console.log('All compact footer captures finished successfully!')
}

capture().catch((err) => {
  console.error('Capture failed:', err)
  process.exit(1)
})
