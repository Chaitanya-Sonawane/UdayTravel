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
      `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-avail-'))}`,
    ],
  })

  try {
    // -------------------------------------------------------------
    // 1. LAPTOP VIEW
    // -------------------------------------------------------------
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    // A. Availability page (twilight hero background)
    console.log('Capturing Availability page on Laptop...')
    await page.goto('http://127.0.0.1:3000/availability?route=AHM_PUN&date=2026-11-25', {
      waitUntil: 'load',
      timeout: 30000,
    })
    await new Promise((r) => setTimeout(r, 1500))

    const availHeroEl = await page.$('.availability-hero')
    if (availHeroEl) {
      await availHeroEl.screenshot({ path: path.join(ARTIFACT_DIR, '44_availability_twilight_hero_laptop.png') })
      console.log('Captured 44_availability_twilight_hero_laptop.png')
    }

    // Also screenshot the top of the availability page including search card
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '44_availability_page_top_laptop.png'),
      clip: { x: 0, y: 0, width: 1440, height: 750 },
    })
    console.log('Captured 44_availability_page_top_laptop.png')

    // B. Home page (4 updated headers)
    console.log('Capturing Home page headers on Laptop...')
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'load', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 1500))

    const aboutEl = await page.$('#about-us')
    if (aboutEl) {
      await aboutEl.screenshot({ path: path.join(ARTIFACT_DIR, '44_about_us_card_header_laptop.png') })
      console.log('Captured 44_about_us_card_header_laptop.png')
    }

    const supportEl = await page.$('#support')
    if (supportEl) {
      await supportEl.screenshot({ path: path.join(ARTIFACT_DIR, '44_support_card_header_laptop.png') })
      console.log('Captured 44_support_card_header_laptop.png')
    }

    const policyEl = await page.$('#policy')
    if (policyEl) {
      await policyEl.screenshot({ path: path.join(ARTIFACT_DIR, '44_policy_card_header_laptop.png') })
      console.log('Captured 44_policy_card_header_laptop.png')
    }

    const contactEl = await page.$('#contact')
    if (contactEl) {
      await contactEl.screenshot({ path: path.join(ARTIFACT_DIR, '44_contact_card_header_laptop.png') })
      console.log('Captured 44_contact_card_header_laptop.png')
    }

    // -------------------------------------------------------------
    // 2. MOBILE VIEW
    // -------------------------------------------------------------
    const mobilePage = await browser.newPage()
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true })

    // A. Availability page mobile
    console.log('Capturing Availability page on Mobile...')
    await mobilePage.goto('http://127.0.0.1:3000/availability?route=AHM_PUN&date=2026-11-25', {
      waitUntil: 'load',
      timeout: 30000,
    })
    await new Promise((r) => setTimeout(r, 1500))

    const mobileAvailHeroEl = await mobilePage.$('.availability-hero')
    if (mobileAvailHeroEl) {
      await mobileAvailHeroEl.screenshot({ path: path.join(ARTIFACT_DIR, '44_availability_twilight_hero_mobile.png') })
      console.log('Captured 44_availability_twilight_hero_mobile.png')
    }

    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, '44_availability_page_top_mobile.png'),
      clip: { x: 0, y: 0, width: 390, height: 750 },
    })
    console.log('Captured 44_availability_page_top_mobile.png')

    // B. Home page mobile headers
    console.log('Capturing Home page headers on Mobile...')
    await mobilePage.goto('http://127.0.0.1:3000/', { waitUntil: 'load', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 1500))

    const mobileAboutEl = await mobilePage.$('#about-us')
    if (mobileAboutEl) {
      await mobileAboutEl.screenshot({ path: path.join(ARTIFACT_DIR, '44_about_us_card_header_mobile.png') })
      console.log('Captured 44_about_us_card_header_mobile.png')
    }

    const mobileSupportEl = await mobilePage.$('#support')
    if (mobileSupportEl) {
      await mobileSupportEl.screenshot({ path: path.join(ARTIFACT_DIR, '44_support_card_header_mobile.png') })
      console.log('Captured 44_support_card_header_mobile.png')
    }

    console.log('All verification captures completed successfully!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
