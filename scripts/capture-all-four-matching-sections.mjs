import puppeteer from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'

async function run() {
  console.log('Launching Chrome browser...')
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-four-sections-'))}`,
    ],
  })

  try {
    // 1. LAPTOP VIEW (1440 x 900)
    const laptopPage = await browser.newPage()
    await laptopPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
    console.log('Navigating to http://localhost:3000/ on Laptop...')
    await laptopPage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await laptopPage.waitForSelector('#support', { timeout: 15000 })
    await new Promise((r) => setTimeout(r, 1500))

    // Capture each of the 4 sections
    const sections = ['about-us', 'support', 'policy', 'contact']
    for (const sec of sections) {
      const el = await laptopPage.$(`#${sec}`)
      if (el) {
        await el.scrollIntoView()
        await new Promise((r) => setTimeout(r, 600))
        await el.screenshot({
          path: path.join(ARTIFACT_DIR, `47_${sec}_laptop.png`),
        })
        console.log(`Saved 47_${sec}_laptop.png`)
      }
    }
    await laptopPage.close()

    // 2. MOBILE VIEW (390 x 844)
    const mobilePage = await browser.newPage()
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })
    console.log('Navigating to http://localhost:3000/ on Mobile...')
    await mobilePage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await mobilePage.waitForSelector('#support', { timeout: 15000 })
    await new Promise((r) => setTimeout(r, 1500))

    for (const sec of sections) {
      const el = await mobilePage.$(`#${sec}`)
      if (el) {
        await el.scrollIntoView()
        await new Promise((r) => setTimeout(r, 600))
        await el.screenshot({
          path: path.join(ARTIFACT_DIR, `47_${sec}_mobile.png`),
        })
        console.log(`Saved 47_${sec}_mobile.png`)
      }
    }
    await mobilePage.close()

    console.log('All 4 section screenshots captured successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
  }
}

run()
