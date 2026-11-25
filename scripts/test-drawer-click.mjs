import puppeteer from 'puppeteer'

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto('http://localhost:3000/account?mode=register&redirect=/availability', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1000))
  
  const menuBtn = await page.$('button[aria-label="Open menu"]')
  if (menuBtn) {
    console.log('Found menu button, clicking...')
    await menuBtn.click()
    await new Promise(r => setTimeout(r, 1000))
    await page.screenshot({ path: '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/11_drawer_open_account.png' })
    console.log('Screenshot saved to 11_drawer_open_account.png')
  } else {
    console.log('Menu button not found!')
  }
  await browser.close()
}

run().catch(console.error)
