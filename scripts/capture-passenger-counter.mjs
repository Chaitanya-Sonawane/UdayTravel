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

    // 1. Laptop View - SearchCard Close-up (Unselected)
    await page.setViewport({ width: 1440, height: 1100 })
    console.log('Navigating to http://localhost:3000/availability...')
    await page.goto('http://localhost:3000/availability', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 1500))

    const searchCard = await page.$('.search-card')
    if (searchCard) {
      await searchCard.screenshot({ path: path.join(ARTIFACT_DIR, '40_search_card_with_passenger_counter_laptop.png') })
      console.log('Captured 40_search_card_with_passenger_counter_laptop.png')
    }

    // 2. Select Route & Date to view Bus Cards with 1 and 3 passengers
    await page.goto('http://localhost:3000/availability?route=AHM_PUN&date=2026-11-24', { waitUntil: 'networkidle2' })
    await new Promise(r => setTimeout(r, 1500))

    if (searchCard) {
      const card2 = await page.$('.search-card')
      if (card2) {
        await card2.screenshot({ path: path.join(ARTIFACT_DIR, '40_search_card_active_laptop.png') })
      }
    }

    // Capture bus cards
    const busList = await page.$('.bus-list')
    if (busList) {
      await busList.screenshot({ path: path.join(ARTIFACT_DIR, '40_bus_cards_clean_laptop.png') })
      console.log('Captured 40_bus_cards_clean_laptop.png')
    }

    // Click '3' passengers on SearchCard
    const pill3 = await page.$('button[aria-label="3 passengers"]')
    if (pill3) {
      await pill3.click()
      await new Promise(r => setTimeout(r, 600))
      const cardWith3 = await page.$('.search-card')
      if (cardWith3) {
        await cardWith3.screenshot({ path: path.join(ARTIFACT_DIR, '40_search_card_3_passengers_laptop.png') })
        console.log('Captured 40_search_card_3_passengers_laptop.png')
      }
      if (busList) {
        await busList.screenshot({ path: path.join(ARTIFACT_DIR, '40_bus_cards_3_passengers_laptop.png') })
        console.log('Captured 40_bus_cards_3_passengers_laptop.png')
      }
    }

    // 3. Mobile View (390x844)
    console.log('Capturing mobile view...')
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await page.goto('http://localhost:3000/availability', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 1500))

    const mSearchCard = await page.$('.search-card')
    if (mSearchCard) {
      await mSearchCard.screenshot({ path: path.join(ARTIFACT_DIR, '40_search_card_passenger_counter_mobile.png') })
      console.log('Captured 40_search_card_passenger_counter_mobile.png')
    }

    console.log('All passenger counter screenshots captured successfully!')
  } finally {
    await browser.close()
  }
}

run().catch(console.error)
