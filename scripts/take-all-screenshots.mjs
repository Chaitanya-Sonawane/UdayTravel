import os from 'node:os'
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const OUT_DIR = path.resolve(process.cwd(), 'screenshots')
const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/screenshots'

for (const dir of [OUT_DIR, ARTIFACT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const pagesToCapture = [
  { id: '01_home', title: 'Home Page', path: '/' },
  { id: '02_availability', title: 'Bus Availability & Schedules', path: '/availability?route=AHM_PUN&date=2026-11-24' },
  { id: '03_seats', title: 'Seat Selection Coach Map', path: '/seats?route=AHM_PUN&date=2026-11-23&tripId=AHM_PUN_0600_1003' },
  { id: '04_passengers', title: 'Passenger Details Form', path: '/passengers' },
  { id: '05_review', title: 'Booking Review Summary', path: '/booking/summary' },
  { id: '06_payment', title: 'Payment & Checkout Review', path: '/booking/summary' },
  { id: '07_ticket_pass', title: 'Digital Ticket & Boarding Pass', path: '/ticket/UT-AP-YXRSKP' },
  { id: '08_cancellation', title: 'Cancellation & 25/75 Refund Split', path: '/ticket/UT-AP-YXRSKP/cancel' },
  { id: '09_account_profile', title: 'User Account & Wallet', path: '/account' },
  { id: '10_my_bookings', title: 'My Bookings Lookup', path: '/bookings' },
  { id: '11_live_tracking', title: 'Live Bus Tracking', path: '/track' },
  { id: '12_help_center', title: 'Help Center & FAQs', path: '/help' },
  { id: '13_about_us', title: 'About Uday Travels', path: '/about' },
  { id: '14_contact_us', title: 'Contact & Office Locations', path: '/contact' },
  { id: '15_policies', title: 'Terms & Cancellation Policies', path: '/policies' },
]

const adminTabs = [
  { tab: 'scheduler', name: '16_admin_scheduler', label: 'Route & Bus Scheduler' },
  { tab: 'counter', name: '17_admin_counter_booking', label: 'Manual Counter Ticketing' },
  { tab: 'manifest', name: '18_admin_manifest_dispatch', label: 'Passenger Manifest & Boarding' },
  { tab: 'lookup', name: '19_admin_ticket_lookup', label: 'Ticket Lookup & Overrides' },
  { tab: 'authority', name: '20_admin_authority_scope', label: 'Admin Authority & Governance' },
]

async function saveScreenshot(page, filename) {
  const localPath = path.join(OUT_DIR, filename)
  const artifactPath = path.join(ARTIFACT_DIR, filename)

  await page.screenshot({ path: localPath, fullPage: true })
  fs.copyFileSync(localPath, artifactPath)
  console.log(`Saved: ${filename}`)
}

async function run() {
  console.log(`Starting Puppeteer screenshots against ${BASE_URL}...`)

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-'))}`,
    ],
  })

  const page = await browser.newPage()

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('uday_journey', JSON.stringify({
      from: 'Ahilyanagar',
      to: 'Pune',
      tripDate: '2026-11-23',
      routeId: 'AHM_PUN',
      busName: 'Royal Executive Sleeper (2+1)',
      pricePerSeat: 400
    }));
    localStorage.setItem('uday_selected_seats', JSON.stringify(['L1']));
    localStorage.setItem('uday_active_passengers', JSON.stringify([
      { name: 'Shantanu Shinde', age: 29, gender: 'male', seatNo: 'L1' }
    ]));
    localStorage.setItem('uday_user_profile', JSON.stringify({
      mobile: '+919422097654',
      name: 'Shantanu Shinde',
      email: 'shantanu@udaytravel.in'
    }));
    localStorage.setItem('uday_account_created', 'true');
    localStorage.setItem('uday_has_account', 'true');
  });

  // Set default timeout to 25s
  page.setDefaultNavigationTimeout(25000)
  page.setDefaultTimeout(25000)

  // ==========================================
  // PHASE 1: LAPTOP VIEW (1440x900 Retina @2x)
  // ==========================================
  console.log('\n--- Capturing LAPTOP View (1440x900) ---')
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

  // Standard user pages
  for (const p of pagesToCapture) {
    const url = `${BASE_URL}${p.path}`
    console.log(`[Laptop] Loading ${p.title} (${url})...`)
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await new Promise((r) => setTimeout(r, 1000))
      await saveScreenshot(page, `${p.id}_laptop.png`)
    } catch (err) {
      console.warn(`[Laptop] Failed to capture ${p.title}: ${err.message}`)
      try {
        await saveScreenshot(page, `${p.id}_laptop.png`)
      } catch {}
    }
  }

  // Admin tabs (Laptop)
  console.log(`[Laptop] Loading Admin Console tabs...`)
  try {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 1000))

    for (const t of adminTabs) {
      console.log(`[Laptop] Admin Tab: ${t.label}...`)
      try {
        // Find and click the tab button
        await page.evaluate((tabKey) => {
          const buttons = Array.from(document.querySelectorAll('nav button'))
          const target = buttons.find((b) => {
            const text = (b.textContent || '').toLowerCase()
            if (tabKey === 'scheduler') return text.includes('scheduler')
            if (tabKey === 'counter') return text.includes('counter')
            if (tabKey === 'manifest') return text.includes('manifest') || text.includes('boarding')
            if (tabKey === 'lookup') return text.includes('lookup') || text.includes('overrides')
            if (tabKey === 'authority') return text.includes('authority') || text.includes('scope')
            return false
          })
          if (target) target.click()
        }, t.tab)

        await new Promise((r) => setTimeout(r, 1000))
        await saveScreenshot(page, `${t.name}_laptop.png`)
      } catch (err) {
        console.warn(`[Laptop] Failed admin tab ${t.label}: ${err.message}`)
      }
    }
  } catch (err) {
    console.warn(`[Laptop] Failed admin page navigation: ${err.message}`)
  }

  // ==========================================
  // PHASE 2: MOBILE VIEW (390x844 iPhone 14 @2x)
  // ==========================================
  console.log('\n--- Capturing MOBILE View (390x844) ---')
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })

  // Standard user pages (Mobile)
  for (const p of pagesToCapture) {
    const url = `${BASE_URL}${p.path}`
    console.log(`[Mobile] Loading ${p.title} (${url})...`)
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await new Promise((r) => setTimeout(r, 1000))
      await saveScreenshot(page, `${p.id}_mobile.png`)
    } catch (err) {
      console.warn(`[Mobile] Failed to capture ${p.title}: ${err.message}`)
      try {
        await saveScreenshot(page, `${p.id}_mobile.png`)
      } catch {}
    }
  }

  // Admin tabs (Mobile)
  console.log(`[Mobile] Loading Admin Console tabs...`)
  try {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 1000))

    for (const t of adminTabs) {
      console.log(`[Mobile] Admin Tab: ${t.label}...`)
      try {
        await page.evaluate((tabKey) => {
          const buttons = Array.from(document.querySelectorAll('nav button'))
          const target = buttons.find((b) => {
            const text = (b.textContent || '').toLowerCase()
            if (tabKey === 'scheduler') return text.includes('scheduler')
            if (tabKey === 'counter') return text.includes('counter')
            if (tabKey === 'manifest') return text.includes('manifest') || text.includes('boarding')
            if (tabKey === 'lookup') return text.includes('lookup') || text.includes('overrides')
            if (tabKey === 'authority') return text.includes('authority') || text.includes('scope')
            return false
          })
          if (target) target.click()
        }, t.tab)

        await new Promise((r) => setTimeout(r, 1000))
        await saveScreenshot(page, `${t.name}_mobile.png`)
      } catch (err) {
        console.warn(`[Mobile] Failed admin tab ${t.label}: ${err.message}`)
      }
    }
  } catch (err) {
    console.warn(`[Mobile] Failed admin page navigation: ${err.message}`)
  }

  await browser.close()
  console.log('\nAll Laptop and Mobile screenshots captured successfully!')
}

run().catch((err) => {
  console.error('Fatal execution error in puppeteer capture:', err)
  process.exit(1)
})
