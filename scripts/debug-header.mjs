import puppeteer from 'puppeteer'

async function debugHeader() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 432, height: 800, deviceScaleFactor: 1 })
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' })
  await page.screenshot({ path: '/tmp/header_closed.png' })
  
  // Click menu button
  const btn = await page.$('button[aria-label="Open navigation menu"]')
  if (btn) await btn.click()
  await new Promise(r => setTimeout(r, 600))
  await page.screenshot({ path: '/tmp/header_open.png' })
  
  await browser.close()
  console.log('Saved /tmp/header_closed.png and /tmp/header_open.png')
}

debugHeader().catch(console.error)
