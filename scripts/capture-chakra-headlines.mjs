import puppeteer from 'puppeteer'
import path from 'path'

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  })

  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(30000)

    // 1. Laptop View (1440x900)
    await page.setViewport({ width: 1440, height: 900 })
    console.log('Navigating to http://localhost:3000 on laptop...')
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 2000))

    // Capture Row 1 About
    const sec1 = await page.$('#about-us')
    if (sec1) {
      await sec1.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await sec1.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_row1_about_laptop.png') })
      console.log('Captured 37_chakra_row1_about_laptop.png')
    }

    // Capture Row 2 Support
    const sec2 = await page.$('#support')
    if (sec2) {
      await sec2.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await sec2.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_row2_support_laptop.png') })
      console.log('Captured 37_chakra_row2_support_laptop.png')
    }

    // Capture Row 3 Policy
    const sec3 = await page.$('#policy')
    if (sec3) {
      await sec3.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await sec3.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_row3_policy_laptop.png') })
      console.log('Captured 37_chakra_row3_policy_laptop.png')
    }

    // Capture Row 4 Contact
    const sec4 = await page.$('#contact')
    if (sec4) {
      await sec4.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await sec4.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_row4_contact_laptop.png') })
      console.log('Captured 37_chakra_row4_contact_laptop.png')
    }

    // Capture entire Editorial section on Laptop
    const editorial = await page.$('section.w-full.bg-white')
    if (editorial) {
      await editorial.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_editorial_laptop.png') })
      console.log('Captured 37_chakra_editorial_laptop.png')
    }

    // 2. Mobile View (390x844)
    console.log('Capturing mobile view...')
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 2000))

    const mSec1 = await page.$('#about-us')
    if (mSec1) {
      await mSec1.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await mSec1.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_row1_about_mobile.png') })
      console.log('Captured 37_chakra_row1_about_mobile.png')
    }

    const mSec2 = await page.$('#support')
    if (mSec2) {
      await mSec2.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await mSec2.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_row2_support_mobile.png') })
      console.log('Captured 37_chakra_row2_support_mobile.png')
    }

    const mSec3 = await page.$('#policy')
    if (mSec3) {
      await mSec3.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await mSec3.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_row3_policy_mobile.png') })
      console.log('Captured 37_chakra_row3_policy_mobile.png')
    }

    const mSec4 = await page.$('#contact')
    if (mSec4) {
      await mSec4.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await mSec4.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_row4_contact_mobile.png') })
      console.log('Captured 37_chakra_row4_contact_mobile.png')
    }

    const mEditorial = await page.$('section.w-full.bg-white')
    if (mEditorial) {
      await mEditorial.screenshot({ path: path.join(ARTIFACT_DIR, '37_chakra_editorial_mobile.png') })
      console.log('Captured 37_chakra_editorial_mobile.png')
    }

    console.log('All Chakra Petch screenshots captured!')
  } finally {
    await browser.close()
  }
}

run().catch(console.error)
