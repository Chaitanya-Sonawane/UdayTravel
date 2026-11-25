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
    // 1. Desktop Standalone Cancellation Page
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 1100, deviceScaleFactor: 2 })
    console.log('Navigating to cancel ticket desktop page...')
    await page.goto('http://localhost:3000/ticket/UT-AP-QCS2UE/cancel', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))

    const desktopPath = path.join(screenshotsDir, '59_cancellation_page_desktop.png')
    await page.screenshot({ path: desktopPath, fullPage: true })
    fs.copyFileSync(desktopPath, path.join(artifactDir, '59_cancellation_page_desktop.png'))
    fs.copyFileSync(desktopPath, 'screenshots/59_cancellation_page_desktop.png')
    console.log('Saved 59_cancellation_page_desktop.png')
    await page.close()

    // 2. Mobile Standalone Cancellation Page
    const mobilePage = await browser.newPage()
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    console.log('Navigating to cancel ticket mobile page...')
    await mobilePage.goto('http://localhost:3000/ticket/UT-AP-QCS2UE/cancel', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))

    const mobilePath = path.join(screenshotsDir, '59_cancellation_page_mobile.png')
    await mobilePage.screenshot({ path: mobilePath, fullPage: true })
    fs.copyFileSync(mobilePath, path.join(artifactDir, '59_cancellation_page_mobile.png'))
    fs.copyFileSync(mobilePath, 'screenshots/59_cancellation_page_mobile.png')
    console.log('Saved 59_cancellation_page_mobile.png')
    await mobilePage.close()

    // 3. Desktop Ticket Page with Cancel Modal Open
    const modalPage = await browser.newPage()
    await modalPage.setViewport({ width: 1280, height: 950, deviceScaleFactor: 2 })
    console.log('Navigating to ticket page to trigger modal...')
    await modalPage.goto('http://localhost:3000/ticket/UT-AP-QCS2UE', { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 2000))

    // Click "Cancel booking" button
    const buttons = await modalPage.$$('button')
    for (const b of buttons) {
      const text = await modalPage.evaluate((el) => el.textContent, b)
      if (text && text.includes('Cancel booking')) {
        await b.click()
        break
      }
    }
    await new Promise((r) => setTimeout(r, 1500))

    const modalPath = path.join(screenshotsDir, '59_cancellation_modal_desktop.png')
    await modalPage.screenshot({ path: modalPath, fullPage: false })
    fs.copyFileSync(modalPath, path.join(artifactDir, '59_cancellation_modal_desktop.png'))
    fs.copyFileSync(modalPath, 'screenshots/59_cancellation_modal_desktop.png')
    console.log('Saved 59_cancellation_modal_desktop.png')
    await modalPage.close()

    console.log('All cancellation screenshots captured successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
  }
}

capture()
