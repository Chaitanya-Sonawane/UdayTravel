import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'
const screenshotsDir = path.join(artifactDir, 'screenshots')

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots', { recursive: true })
}

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    // 1. Desktop Ticket Page
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 1100, deviceScaleFactor: 2 })
    console.log('Navigating to desktop ticket page...')
    await page.goto('http://localhost:3000/ticket/UT-AP-X8B4BR', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))

    const desktopPath = path.join(screenshotsDir, '58_ticket_availability_header_desktop.png')
    await page.screenshot({ path: desktopPath, fullPage: true })
    fs.copyFileSync(desktopPath, path.join(artifactDir, '58_ticket_availability_header_desktop.png'))
    fs.copyFileSync(desktopPath, 'screenshots/58_ticket_availability_header_desktop.png')
    console.log('Saved 58_ticket_availability_header_desktop.png')
    await page.close()

    // 2. Mobile Ticket Page
    const mobilePage = await browser.newPage()
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    console.log('Navigating to mobile ticket page...')
    await mobilePage.goto('http://localhost:3000/ticket/UT-AP-X8B4BR', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))

    const mobilePath = path.join(screenshotsDir, '58_ticket_availability_header_mobile.png')
    await mobilePage.screenshot({ path: mobilePath, fullPage: true })
    fs.copyFileSync(mobilePath, path.join(artifactDir, '58_ticket_availability_header_mobile.png'))
    fs.copyFileSync(mobilePath, 'screenshots/58_ticket_availability_header_mobile.png')
    console.log('Saved 58_ticket_availability_header_mobile.png')
    await mobilePage.close()

    // 3. Desktop Ticket Cancellation Page
    const cancelPage = await browser.newPage()
    await cancelPage.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })
    console.log('Navigating to cancel ticket page...')
    await cancelPage.goto('http://localhost:3000/ticket/UT-AP-X8B4BR/cancel', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))

    const cancelPath = path.join(screenshotsDir, '58_ticket_cancel_header_desktop.png')
    await cancelPage.screenshot({ path: cancelPath, fullPage: true })
    fs.copyFileSync(cancelPath, path.join(artifactDir, '58_ticket_cancel_header_desktop.png'))
    fs.copyFileSync(cancelPath, 'screenshots/58_ticket_cancel_header_desktop.png')
    console.log('Saved 58_ticket_cancel_header_desktop.png')
    await cancelPage.close()

    console.log('All screenshots captured successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
  }
}

capture()
