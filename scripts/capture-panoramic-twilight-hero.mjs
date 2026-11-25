import puppeteer from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Launching Chrome browser...')
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
    // =============================================================
    // 1. LAPTOP VIEW (1440 x 900)
    // =============================================================
    const laptopPage = await browser.newPage()
    await laptopPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

    // A. Availability on Laptop
    console.log('1. Loading Availability page on Laptop...')
    await laptopPage.goto('http://127.0.0.1:3000/availability', {
      waitUntil: 'load',
      timeout: 30000,
    })
    await new Promise((r) => setTimeout(r, 1500))

    const availHeroLaptop = await laptopPage.$('.availability-hero')
    if (availHeroLaptop) {
      await availHeroLaptop.screenshot({
        path: path.join(ARTIFACT_DIR, '45_availability_hero_laptop.png'),
      })
      console.log('Saved 45_availability_hero_laptop.png')
    }

    await laptopPage.screenshot({
      path: path.join(ARTIFACT_DIR, '45_availability_page_top_laptop.png'),
      clip: { x: 0, y: 0, width: 1440, height: 750 },
    })
    console.log('Saved 45_availability_page_top_laptop.png')

    // B. Seats Selection on Laptop
    console.log('2. Loading Seats page on Laptop...')
    await laptopPage.goto('http://127.0.0.1:3000/seats?route=AHM_PUN&date=2026-11-25&tripId=AHM_PUN_0600_1003', {
      waitUntil: 'load',
      timeout: 30000,
    })
    await new Promise((r) => setTimeout(r, 1500))

    const seatsHeroLaptop = await laptopPage.$('.seats-hero')
    if (seatsHeroLaptop) {
      await seatsHeroLaptop.screenshot({
        path: path.join(ARTIFACT_DIR, '45_seats_hero_laptop.png'),
      })
      console.log('Saved 45_seats_hero_laptop.png')
    }

    await laptopPage.screenshot({
      path: path.join(ARTIFACT_DIR, '45_seats_page_top_laptop.png'),
      clip: { x: 0, y: 0, width: 1440, height: 750 },
    })
    console.log('Saved 45_seats_page_top_laptop.png')

    await laptopPage.close()

    // =============================================================
    // 2. MOBILE VIEW (390 x 844)
    // =============================================================
    const mobilePage = await browser.newPage()
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })

    // A. Availability on Mobile
    console.log('3. Loading Availability page on Mobile...')
    await mobilePage.goto('http://127.0.0.1:3000/availability', {
      waitUntil: 'load',
      timeout: 30000,
    })
    await new Promise((r) => setTimeout(r, 1500))

    const availHeroMobile = await mobilePage.$('.availability-hero')
    if (availHeroMobile) {
      await availHeroMobile.screenshot({
        path: path.join(ARTIFACT_DIR, '45_availability_hero_mobile.png'),
      })
      console.log('Saved 45_availability_hero_mobile.png')
    }

    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, '45_availability_page_top_mobile.png'),
      clip: { x: 0, y: 0, width: 390, height: 720 },
    })
    console.log('Saved 45_availability_page_top_mobile.png')

    // B. Seats Selection on Mobile
    console.log('4. Loading Seats page on Mobile...')
    await mobilePage.goto('http://127.0.0.1:3000/seats?route=AHM_PUN&date=2026-11-25&tripId=AHM_PUN_0600_1003', {
      waitUntil: 'load',
      timeout: 30000,
    })
    await new Promise((r) => setTimeout(r, 1500))

    const seatsHeroMobile = await mobilePage.$('.seats-hero')
    if (seatsHeroMobile) {
      await seatsHeroMobile.screenshot({
        path: path.join(ARTIFACT_DIR, '45_seats_hero_mobile.png'),
      })
      console.log('Saved 45_seats_hero_mobile.png')
    }

    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, '45_seats_page_top_mobile.png'),
      clip: { x: 0, y: 0, width: 390, height: 720 },
    })
    console.log('Saved 45_seats_page_top_mobile.png')

    await mobilePage.close()
    console.log('All hero screenshots captured successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
  }
}

run()
