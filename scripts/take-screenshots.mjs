import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const OUT_DIR = path.resolve(process.cwd(), 'screenshots')
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

const routes = [
  { name: '01_home_page', path: '/' },
  { name: '02_availability_page', path: '/availability' },
  { name: '03_seats_selection_page', path: '/seats?tripId=AHM_PUN_0600' },
  { name: '04_passengers_details_page', path: '/passengers' },
  { name: '05_booking_summary_checkout', path: '/booking/summary' },
  { name: '06_digital_ticket_boarding_pass', path: '/ticket/UTLF9MV8' },
  { name: '07_cancellation_screen', path: '/ticket/UTLF9MV8/cancel' },
  { name: '08_my_bookings_lookup', path: '/bookings' },
  { name: '09_account_and_wallet', path: '/account' },
  { name: '10_live_bus_tracking', path: '/track' },
  { name: '11_admin_dispatch_scheduler', path: '/admin' },
  { name: '12_help_center_faq', path: '/help' },
  { name: '13_about_us', path: '/about' },
  { name: '14_contact_support', path: '/contact' },
  { name: '15_policies_and_terms', path: '/policies' },
]

async function run() {
  console.log('Launching headless browser...')
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/home/chaitanya/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })

  const page = await browser.newPage()

  // 1. Capture Desktop (1280x800 Retina)
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 })

  for (const r of routes) {
    const url = `http://localhost:3000${r.path}`
    const outPath = path.join(OUT_DIR, `${r.name}_desktop.png`)
    console.log(`Capturing ${r.name} from ${url}...`)
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await page.screenshot({ path: outPath, fullPage: true })
      console.log(`Saved: ${outPath}`)
    } catch (err) {
      console.error(`Failed to capture ${r.name}:`, err.message)
    }
  }

  // 2. Capture Key Mobile Viewports (390x844 iPhone 14)
  const mobileRoutes = [
    { name: '01_home_mobile', path: '/' },
    { name: '02_availability_mobile', path: '/availability' },
    { name: '03_seats_mobile', path: '/seats?tripId=AHM_PUN_0600' },
    { name: '06_ticket_mobile', path: '/ticket/UTLF9MV8' },
    { name: '07_cancellation_mobile', path: '/ticket/UTLF9MV8/cancel' },
    { name: '11_admin_mobile', path: '/admin' },
  ]

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })

  for (const r of mobileRoutes) {
    const url = `http://localhost:3000${r.path}`
    const outPath = path.join(OUT_DIR, `${r.name}.png`)
    console.log(`Capturing mobile ${r.name} from ${url}...`)
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await page.screenshot({ path: outPath, fullPage: true })
      console.log(`Saved: ${outPath}`)
    } catch (err) {
      console.error(`Failed to capture mobile ${r.name}:`, err.message)
    }
  }

  await browser.close()
  console.log('All screenshots captured successfully!')
}

run().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
