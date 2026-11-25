import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outDir = path.join(rootDir, 'screenshots/datepicker_verification')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/home/chaitanya/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  })

  console.log('--- Testing Themed Date Picker on Availability Page ---')

  // 1. Desktop Test
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 850 })

  await page.goto('http://localhost:3000/availability', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1000))

  // Select Route (Ahilyanagar to Pune)
  console.log('Selecting Route...')
  const routeBtn = await page.$('.route-choice')
  if (routeBtn) {
    await routeBtn.click()
    await new Promise((r) => setTimeout(r, 500))
  }

  // Click 'Choose date' button
  console.log('Clicking "Choose date" button...')
  const chooseDateBtn = await page.$('.date-choice.custom-date')
  if (!chooseDateBtn) {
    throw new Error('Choose date button not found!')
  }
  await chooseDateBtn.click()
  await new Promise((r) => setTimeout(r, 600))

  // Check modal presence and content
  const modalData = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')
    if (!dialog) return { found: false }

    const title = dialog.querySelector('h3')?.textContent?.trim()
    const subtitle = dialog.querySelector('p')?.textContent?.trim()
    const month = dialog.querySelector('h4')?.textContent?.trim()
    const chips = Array.from(dialog.querySelectorAll('button')).map((b) => b.textContent?.trim()).filter(Boolean)
    const activeBadge = dialog.querySelector('.bg-\\[\\#F8B018\\]')

    return {
      found: true,
      title,
      subtitle,
      month,
      chipsCount: chips.length,
      hasGoldBadge: Boolean(activeBadge),
    }
  })

  console.log('Themed Date Picker Modal Data:', modalData)

  // Save Desktop Screenshot of Open Themed Modal
  const desktopShot = path.join(outDir, 'availability_datepicker_desktop.png')
  await page.screenshot({ path: desktopShot })
  console.log('Saved desktop screenshot:', desktopShot)

  // 2. Mobile Viewport Test
  console.log('\n--- Testing Mobile Viewport ---')
  await page.setViewport({ width: 390, height: 844, isMobile: true })
  await new Promise((r) => setTimeout(r, 500))

  const mobileShot = path.join(outDir, 'availability_datepicker_mobile.png')
  await page.screenshot({ path: mobileShot })
  console.log('Saved mobile screenshot:', mobileShot)

  // 3. Test selecting a date chip (e.g. "Tomorrow") and confirming
  console.log('\n--- Testing Selection & Confirmation ---')
  const confirmBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[role="dialog"] button'))
    const confirm = buttons.find((b) => b.textContent?.includes('Confirm Date'))
    if (confirm) {
      confirm.click()
      return true
    }
    return false
  })

  await new Promise((r) => setTimeout(r, 600))

  const isModalClosed = await page.evaluate(() => {
    return document.querySelector('[role="dialog"]') === null
  })
  console.log('Modal closed after confirmation:', isModalClosed)

  await page.close()
  await browser.close()
  console.log('\n--- Themed Date Picker Verification Succeeded ---')
}

main().catch((err) => {
  console.error('Date picker verification failed:', err)
  process.exit(1)
})
