import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/screenshots'
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true })
}

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  // 1. Laptop view
  const pageLaptop = await browser.newPage()
  await pageLaptop.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await pageLaptop.goto('http://localhost:3000/booking/summary', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1200))
  const laptopPath = path.join(artifactDir, '49_booking_summary_laptop.png')
  await pageLaptop.screenshot({ path: laptopPath, fullPage: true })
  console.log('Saved laptop screenshot to:', laptopPath)

  // 2. Mobile view
  const pageMobile = await browser.newPage()
  await pageMobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await pageMobile.goto('http://localhost:3000/booking/summary', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1200))
  const mobilePath = path.join(artifactDir, '49_booking_summary_mobile.png')
  await pageMobile.screenshot({ path: mobilePath, fullPage: true })
  console.log('Saved mobile screenshot to:', mobilePath)

  // 3. Focused summary card view
  const cardElement = await pageLaptop.$('.booking-card-clean')
  if (cardElement) {
    const cardPath = path.join(artifactDir, '49_booking_summary_card_focus.png')
    await cardElement.screenshot({ path: cardPath })
    console.log('Saved focused card screenshot to:', cardPath)
  }

  await browser.close()
}

capture().catch(err => {
  console.error(err)
  process.exit(1)
})
