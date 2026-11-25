import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outDir = path.join(rootDir, 'screenshots/logo_verification')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const pagesToTest = [
  { name: '01_home', url: 'http://localhost:3000/' },
  { name: '02_availability', url: 'http://localhost:3000/availability' },
  { name: '03_seats', url: 'http://localhost:3000/seats' },
  { name: '04_passengers', url: 'http://localhost:3000/passengers' },
  { name: '05_bookings', url: 'http://localhost:3000/bookings' },
  { name: '06_ticket', url: 'http://localhost:3000/ticket/UT25354' },
  { name: '07_account', url: 'http://localhost:3000/account' },
  { name: '08_about', url: 'http://localhost:3000/about' },
  { name: '09_admin', url: 'http://localhost:3000/admin' },
]

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  console.log('--- Verifying Logo on Each and Every Page ---')

  for (const pageInfo of pagesToTest) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })

    try {
      await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 15000 })
    } catch (e) {
      console.warn(`Navigation to ${pageInfo.url} timed out, proceeding anyway...`)
    }

    // Wait a brief moment for client rendering
    await new Promise((r) => setTimeout(r, 1000))

    // Capture header crop and inspect logo
    const logoMetrics = await page.evaluate(() => {
      // Find element with text "UT" or brand mark
      const marks = Array.from(document.querySelectorAll('.page-brand-mark, .home-brand-mark, .brand-logo-mark, header span, a span'))
      const utMark = marks.find((el) => el.textContent?.trim() === 'UT')

      if (!utMark) {
        return { found: false }
      }

      const rect = utMark.getBoundingClientRect()
      const style = window.getComputedStyle(utMark)

      return {
        found: true,
        text: utMark.textContent.trim(),
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontWeight: style.fontWeight,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      }
    })

    console.log(`\nPage: ${pageInfo.name} (${pageInfo.url})`)
    console.log(`  Logo Mark Found: ${logoMetrics.found}`)
    if (logoMetrics.found) {
      console.log(`  Mark Text: "${logoMetrics.text}"`)
      console.log(`  Mark Color (UT text): ${logoMetrics.color}`)
      console.log(`  Mark Background: ${logoMetrics.backgroundColor}`)
      console.log(`  Mark Font Weight: ${logoMetrics.fontWeight}`)
      console.log(`  Mark Bounding Box:`, logoMetrics.rect)
    }

    // Save full page screenshot
    const shotPath = path.join(outDir, `${pageInfo.name}_desktop.png`)
    await page.screenshot({ path: shotPath })
    console.log(`  Saved full screenshot: ${shotPath}`)

    // If logo mark found, save close-up crop of header/logo
    if (logoMetrics.found && logoMetrics.rect.width > 0) {
      const clipX = Math.max(0, logoMetrics.rect.x - 20)
      const clipY = Math.max(0, logoMetrics.rect.y - 10)
      const clipW = Math.min(300, 1280 - clipX)
      const clipH = Math.min(80, 800 - clipY)

      const cropPath = path.join(outDir, `${pageInfo.name}_logo_crop.png`)
      await page.screenshot({
        path: cropPath,
        clip: {
          x: clipX,
          y: clipY,
          width: clipW,
          height: clipH,
        },
      })
      console.log(`  Saved close-up logo crop: ${cropPath}`)
    }

    await page.close()
  }

  await browser.close()
  console.log('\n--- Logo Verification Completed Successfully ---')
}

main().catch((err) => {
  console.error('Error verifying logo:', err)
  process.exit(1)
})
