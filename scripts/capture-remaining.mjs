import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const artifactDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/screenshots'

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    // 1. Cancelled Mobile
    const p1 = await browser.newPage()
    await p1.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await p1.goto('http://localhost:3000/ticket/UT-CANCELLED-01', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await new Promise((r) => setTimeout(r, 1500))
    await p1.screenshot({ path: 'screenshots/51_ticket_cancelled_mobile.png', fullPage: true })
    await p1.screenshot({ path: path.join(artifactDir, '51_ticket_cancelled_mobile.png'), fullPage: true })
    console.log('Saved 51_ticket_cancelled_mobile.png')
    await p1.close()

    // 2. Seats with 3 Suggestions Options
    const p2 = await browser.newPage()
    await p2.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 })
    await p2.goto('http://localhost:3000/seats?route=AHM_PUN&date=2026-11-25&tripId=AHM_PUN_0600_1003', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await p2.evaluate(() => {
      try {
        const store = {
          state: {
            fromCity: 'Ahilyanagar',
            toCity: 'Pune',
            travelDate: '2026-11-25',
            busName: 'Uday Express 55-Seater',
            busTemplateId: 'BUS_55',
            busNumber: 'MH 16 DP 4951',
            departureTime: '06:30',
            arrivalTime: '09:30',
            family: true,
            passengers: [
              { id: 'p1', name: 'Rahul', age: '30', gender: 'man' },
              { id: 'p2', name: 'Sneha', age: '28', gender: 'woman' },
            ],
            seatPrice: 200,
          },
          version: 0,
        }
        localStorage.setItem('uday_booking_store', JSON.stringify(store))
      } catch (e) {}
    })
    await p2.reload({ waitUntil: 'domcontentloaded', timeout: 15000 })
    await new Promise((r) => setTimeout(r, 2000))
    await p2.screenshot({ path: 'screenshots/51_seats_suggestions_options_desktop.png', fullPage: false })
    await p2.screenshot({ path: path.join(artifactDir, '51_seats_suggestions_options_desktop.png'), fullPage: false })
    console.log('Saved 51_seats_suggestions_options_desktop.png')
    await p2.close()
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await browser.close()
  }
}

capture()
