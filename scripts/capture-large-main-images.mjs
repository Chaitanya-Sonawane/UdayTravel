import puppeteer from 'puppeteer'
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

    console.log('Navigating to http://localhost:3000/...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))

    // 1. Hero section
    const heroEl = await page.$('.hero-section')
    if (heroEl) {
      await heroEl.screenshot({
        path: path.join(ARTIFACT_DIR, '42_large_hero_laptop.png'),
      })
      console.log('Captured 42_large_hero_laptop.png')
    }

    // 2. About Us section
    const aboutEl = await page.$('#about-us')
    if (aboutEl) {
      await aboutEl.screenshot({
        path: path.join(ARTIFACT_DIR, '42_large_about_image_laptop.png'),
      })
      console.log('Captured 42_large_about_image_laptop.png')
    }

    // 3. Support section
    const supportEl = await page.$('#support')
    if (supportEl) {
      await supportEl.screenshot({
        path: path.join(ARTIFACT_DIR, '42_large_support_image_laptop.png'),
      })
      console.log('Captured 42_large_support_image_laptop.png')
    }

    // 4. Policy section
    const policyEl = await page.$('#policy')
    if (policyEl) {
      await policyEl.screenshot({
        path: path.join(ARTIFACT_DIR, '42_large_policy_image_laptop.png'),
      })
      console.log('Captured 42_large_policy_image_laptop.png')
    }

    // 5. Contact section
    const contactEl = await page.$('#contact')
    if (contactEl) {
      await contactEl.screenshot({
        path: path.join(ARTIFACT_DIR, '42_large_contact_image_laptop.png'),
      })
      console.log('Captured 42_large_contact_image_laptop.png')
    }

    // 6. Mobile captures
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    console.log('Capturing mobile view on main page...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1200))

    const mobileAboutEl = await page.$('#about-us')
    if (mobileAboutEl) {
      await mobileAboutEl.screenshot({
        path: path.join(ARTIFACT_DIR, '42_large_about_image_mobile.png'),
      })
      console.log('Captured 42_large_about_image_mobile.png')
    }

    const mobileSupportEl = await page.$('#support')
    if (mobileSupportEl) {
      await mobileSupportEl.screenshot({
        path: path.join(ARTIFACT_DIR, '42_large_support_image_mobile.png'),
      })
      console.log('Captured 42_large_support_image_mobile.png')
    }

    console.log('All enlarged images captures completed successfully!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Error capturing enlarged images:', err)
  process.exit(1)
})
