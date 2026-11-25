import puppeteer from 'puppeteer'
import path from 'path'

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ]
  })

  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(30000)
    await page.setViewport({ width: 1440, height: 900 })

    console.log('Navigating to http://localhost:3000...')
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 2000))

    // Capture Row 4 Contact Section close-up (with square Google Maps button and no WhatsApp statement)
    const contactSection = await page.$('#contact')
    if (contactSection) {
      await contactSection.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await contactSection.screenshot({
        path: path.join(ARTIFACT_DIR, '36_square_button_row4_contact_laptop.png')
      })
      console.log('Captured 36_square_button_row4_contact_laptop.png')
    }

    // Capture Row 1 About Section close-up
    const aboutSection = await page.$('#about-us')
    if (aboutSection) {
      await aboutSection.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await aboutSection.screenshot({
        path: path.join(ARTIFACT_DIR, '36_square_button_row1_about_laptop.png')
      })
      console.log('Captured 36_square_button_row1_about_laptop.png')
    }

    // Capture Row 2 Support Section close-up
    const supportSection = await page.$('#support')
    if (supportSection) {
      await supportSection.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await supportSection.screenshot({
        path: path.join(ARTIFACT_DIR, '36_square_button_row2_support_laptop.png')
      })
      console.log('Captured 36_square_button_row2_support_laptop.png')
    }

    // Capture Row 3 Policy Section close-up
    const policySection = await page.$('#policy')
    if (policySection) {
      await policySection.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await policySection.screenshot({
        path: path.join(ARTIFACT_DIR, '36_square_button_row3_policy_laptop.png')
      })
      console.log('Captured 36_square_button_row3_policy_laptop.png')
    }

    // Capture entire Editorial section
    const editorialSection = await page.$('section.w-full.bg-white')
    if (editorialSection) {
      await editorialSection.screenshot({
        path: path.join(ARTIFACT_DIR, '36_square_buttons_all_editorial_laptop.png')
      })
      console.log('Captured 36_square_buttons_all_editorial_laptop.png')
    }

    // Check Availability page for square Select seats button
    console.log('Navigating to http://localhost:3000/availability...')
    await page.goto('http://localhost:3000/availability', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 2000))
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '36_availability_square_buttons_laptop.png'),
      fullPage: false
    })
    console.log('Captured 36_availability_square_buttons_laptop.png')

    // Mobile View
    console.log('Capturing Mobile View...')
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 2000))

    const mobileContact = await page.$('#contact')
    if (mobileContact) {
      await mobileContact.scrollIntoView()
      await new Promise(r => setTimeout(r, 600))
      await mobileContact.screenshot({
        path: path.join(ARTIFACT_DIR, '36_square_button_row4_contact_mobile.png')
      })
      console.log('Captured 36_square_button_row4_contact_mobile.png')
    }

    const mobileEditorial = await page.$('section.w-full.bg-white')
    if (mobileEditorial) {
      await mobileEditorial.screenshot({
        path: path.join(ARTIFACT_DIR, '36_square_buttons_editorial_mobile.png')
      })
      console.log('Captured 36_square_buttons_editorial_mobile.png')
    }

    console.log('Done capturing all screenshots!')
  } finally {
    await browser.close()
  }
}

run().catch(console.error)
