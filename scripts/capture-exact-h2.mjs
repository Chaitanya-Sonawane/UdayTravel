import puppeteer from 'puppeteer'
import path from 'path'
import { promises as fs } from 'fs'

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 2000))

    const sections = ['#about-us', '#support', '#policy', '#contact']
    for (let i = 0; i < sections.length; i++) {
      const secId = sections[i]
      const h2 = await page.$(`${secId} h2`)
      if (h2) {
        await h2.scrollIntoView()
        await new Promise(r => setTimeout(r, 300))
        await h2.screenshot({ path: path.join(ARTIFACT_DIR, `37_exact_h${i + 1}.png`) })
        console.log(`Captured 37_exact_h${i + 1}.png`)
      }
    }
  } finally {
    await browser.close()
  }
}

run().catch(console.error)
