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
    await page.setViewport({ width: 1440, height: 1200 })
    await page.goto('http://localhost:3000/availability', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 1500))

    // Click Ahilyanagar to Pune
    const elements = await page.$$('button, label, div')
    for (const el of elements) {
      const text = await page.evaluate(e => e.textContent, el)
      if (text && text.includes('Ahilyanagar to Pune') && text.length < 50) {
        await el.click()
        console.log('Clicked route option')
        break
      }
    }
    await new Promise(r => setTimeout(r, 1500))

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '36_availability_buses_active.png') })
    console.log('Saved 36_availability_buses_active.png')
  } finally {
    await browser.close()
  }
}

run().catch(console.error)
