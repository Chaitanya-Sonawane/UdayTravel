import puppeteer from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-hero-'))}`,
    ],
  })

  try {
    // 1. Laptop view
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    console.log('Navigating to http://127.0.0.1:3000/ on Laptop...')
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'load', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 2000))

    // Capture hero
    const heroEl = await page.$('.hero-section')
    if (heroEl) {
      await heroEl.screenshot({ path: path.join(ARTIFACT_DIR, '43_hero_chakra_font_laptop.png') })
      console.log('Captured 43_hero_chakra_font_laptop.png')
    }

    // Capture About Us
    const aboutEl = await page.$('#about-us')
    if (aboutEl) {
      await aboutEl.screenshot({ path: path.join(ARTIFACT_DIR, '43_about_us_chakra_laptop.png') })
      console.log('Captured 43_about_us_chakra_laptop.png')
    }

    // Capture Support
    const supportEl = await page.$('#support')
    if (supportEl) {
      await supportEl.screenshot({ path: path.join(ARTIFACT_DIR, '43_support_chakra_laptop.png') })
      console.log('Captured 43_support_chakra_laptop.png')
    }

    // Capture Policy
    const policyEl = await page.$('#policy')
    if (policyEl) {
      await policyEl.screenshot({ path: path.join(ARTIFACT_DIR, '43_policy_chakra_laptop.png') })
      console.log('Captured 43_policy_chakra_laptop.png')
    }

    // Capture Contact
    const contactEl = await page.$('#contact')
    if (contactEl) {
      await contactEl.screenshot({ path: path.join(ARTIFACT_DIR, '43_contact_chakra_laptop.png') })
      console.log('Captured 43_contact_chakra_laptop.png')
    }

    // 2. Mobile view
    const mobilePage = await browser.newPage()
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true })
    console.log('Navigating to http://127.0.0.1:3000/ on Mobile...')
    await mobilePage.goto('http://127.0.0.1:3000/', { waitUntil: 'load', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 2000))

    const mobileHeroEl = await mobilePage.$('.hero-section')
    if (mobileHeroEl) {
      await mobileHeroEl.screenshot({ path: path.join(ARTIFACT_DIR, '43_hero_chakra_font_mobile.png') })
      console.log('Captured 43_hero_chakra_font_mobile.png')
    }

    const mobileAboutEl = await mobilePage.$('#about-us')
    if (mobileAboutEl) {
      await mobileAboutEl.screenshot({ path: path.join(ARTIFACT_DIR, '43_about_us_chakra_mobile.png') })
      console.log('Captured 43_about_us_chakra_mobile.png')
    }

    console.log('All verification captures complete!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
