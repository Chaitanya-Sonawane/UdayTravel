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
      `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-step3-'))}`,
    ],
  })

  try {
    // 1. LAPTOP VIEW (1440 x 900)
    const laptopPage = await browser.newPage()
    await laptopPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
    console.log('1. Loading Availability on Laptop...')
    await laptopPage.goto('http://127.0.0.1:3000/availability', { waitUntil: 'load', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 1500))

    const searchCardLaptop = await laptopPage.$('.search-card')
    if (searchCardLaptop) {
      await searchCardLaptop.screenshot({
        path: path.join(ARTIFACT_DIR, '46_restored_search_card_laptop.png'),
      })
      console.log('Saved 46_restored_search_card_laptop.png')
    }

    const passengerStepLaptop = await laptopPage.$('.passenger-step')
    if (passengerStepLaptop) {
      await passengerStepLaptop.screenshot({
        path: path.join(ARTIFACT_DIR, '46_restored_passenger_step_laptop.png'),
      })
      console.log('Saved 46_restored_passenger_step_laptop.png')
    }
    await laptopPage.close()

    // 2. TABLET VIEW (768 x 1024)
    const tabletPage = await browser.newPage()
    await tabletPage.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 })
    console.log('2. Loading Availability on Tablet...')
    await tabletPage.goto('http://127.0.0.1:3000/availability', { waitUntil: 'load', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 1500))

    const searchCardTablet = await tabletPage.$('.search-card')
    if (searchCardTablet) {
      await searchCardTablet.screenshot({
        path: path.join(ARTIFACT_DIR, '46_restored_search_card_tablet.png'),
      })
      console.log('Saved 46_restored_search_card_tablet.png')
    }
    await tabletPage.close()

    // 3. MOBILE VIEW (390 x 844)
    const mobilePage = await browser.newPage()
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })
    console.log('3. Loading Availability on Mobile...')
    await mobilePage.goto('http://127.0.0.1:3000/availability', { waitUntil: 'load', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 1500))

    const searchCardMobile = await mobilePage.$('.search-card')
    if (searchCardMobile) {
      await searchCardMobile.screenshot({
        path: path.join(ARTIFACT_DIR, '46_restored_search_card_mobile.png'),
      })
      console.log('Saved 46_restored_search_card_mobile.png')
    }

    const passengerStepMobile = await mobilePage.$('.passenger-step')
    if (passengerStepMobile) {
      await passengerStepMobile.screenshot({
        path: path.join(ARTIFACT_DIR, '46_restored_passenger_step_mobile.png'),
      })
      console.log('Saved 46_restored_passenger_step_mobile.png')
    }
    await mobilePage.close()

    console.log('All restored screenshots captured successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
  }
}

run()
