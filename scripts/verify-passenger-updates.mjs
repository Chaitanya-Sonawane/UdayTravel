import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Launching Puppeteer...')
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    console.log('Navigating to http://localhost:3000/availability?route=AHM_PUN&date=2026-11-25...')
    await page.goto('http://localhost:3000/availability?route=AHM_PUN&date=2026-11-25', {
      waitUntil: 'networkidle2',
    })

    // 1. Capture 1 Passenger (Default state - enlarged 40%, no rupees line)
    const cardEl = await page.$('.availability-search')
    if (cardEl) {
      await cardEl.screenshot({
        path: path.join(ARTIFACT_DIR, '41_search_card_large_1_passenger_laptop.png'),
      })
      console.log('Captured 41_search_card_large_1_passenger_laptop.png')
    }

    // 2. Select 2 passengers by clicking the "2" pill
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.passenger-step button'))
      const btn2 = btns.find((b) => b.textContent.trim() === '2')
      if (btn2) btn2.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    // Capture Search card with 2 passengers selected
    if (cardEl) {
      await cardEl.screenshot({
        path: path.join(ARTIFACT_DIR, '41_search_card_large_2_passengers_laptop.png'),
      })
      console.log('Captured 41_search_card_large_2_passengers_laptop.png')
    }

    // Capture Bus list with "Select 2 seats →"
    const busListEl = await page.$('.bus-list')
    if (busListEl) {
      await busListEl.screenshot({
        path: path.join(ARTIFACT_DIR, '41_bus_cards_2_seats_laptop.png'),
      })
      console.log('Captured 41_bus_cards_2_seats_laptop.png')
    }

    // 3. Click the first bus's "Select 2 seats →" button
    console.log('Clicking "Select 2 seats →" to go to next page (/passengers)...')
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.evaluate(() => {
        const btn = document.querySelector('.bus-list button')
        if (btn) btn.click()
      }),
    ])

    console.log('Arrived at URL:', page.url())

    // 4. Capture Passenger Details page showing Passenger 1 and Passenger 2 cards!
    await new Promise((r) => setTimeout(r, 800))
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '41_passenger_details_page_2_travellers_laptop.png'),
      fullPage: false,
    })
    console.log('Captured 41_passenger_details_page_2_travellers_laptop.png')

    // 5. Mobile view capture
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    console.log('Capturing mobile view on /availability...')
    await page.goto('http://localhost:3000/availability?route=AHM_PUN&date=2026-11-25', {
      waitUntil: 'networkidle2',
    })

    // Click 2 passengers on mobile
    await page.evaluate(() => {
      const stepperPlus = document.querySelector('.passenger-step button[aria-label="Increase passenger count"]')
      if (stepperPlus) stepperPlus.click()
    })
    await new Promise((r) => setTimeout(r, 600))

    const mobileSearchCard = await page.$('.availability-search')
    if (mobileSearchCard) {
      await mobileSearchCard.screenshot({
        path: path.join(ARTIFACT_DIR, '41_search_card_large_2_passengers_mobile.png'),
      })
      console.log('Captured 41_search_card_large_2_passengers_mobile.png')
    }

    // Mobile click to /passengers
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.evaluate(() => {
        const btn = document.querySelector('.bus-list button')
        if (btn) btn.click()
      }),
    ])
    await new Promise((r) => setTimeout(r, 800))
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '41_passenger_details_page_2_travellers_mobile.png'),
      fullPage: false,
    })
    console.log('Captured 41_passenger_details_page_2_travellers_mobile.png')

    console.log('All verification captures completed successfully!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Error in verification:', err)
  process.exit(1)
})
