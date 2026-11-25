import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const outDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Laptop view (1440x900) - Default BUS_44
  await page.setViewport({ width: 1440, height: 950 });
  console.log('Navigating to /seats (Laptop)...');
  await page.goto('http://localhost:3000/seats?route=AHM_PUN&date=2026-11-25&tripId=AHM_PUN_0600_1003', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(outDir, '48_seats_realistic_bus44_laptop.png'), fullPage: false });
  console.log('Saved 48_seats_realistic_bus44_laptop.png');

  // Select a seat (e.g. first available seat) to test dynamic selection
  const availableSeat = await page.$('.flow-seat.available');
  if (availableSeat) {
    await availableSeat.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '48_seats_selected_state_laptop.png'), fullPage: false });
    console.log('Saved 48_seats_selected_state_laptop.png');
  }

  // Click 55-Seater tab
  const tab55 = await page.$('button::-p-text(55-Seater)');
  if (tab55) {
    await tab55.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '48_seats_bus55_laptop.png'), fullPage: false });
    console.log('Saved 48_seats_bus55_laptop.png');
  }

  // Click 33-Seater tab
  const tab33 = await page.$('button::-p-text(33-Seater)');
  if (tab33) {
    await tab33.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '48_seats_bus33_laptop.png'), fullPage: false });
    console.log('Saved 48_seats_bus33_laptop.png');
  }

  // 2. Mobile View (390x844)
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/seats?route=AHM_PUN&date=2026-11-25&tripId=AHM_PUN_0600_1003', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(outDir, '48_seats_realistic_bus44_mobile.png'), fullPage: false });
  console.log('Saved 48_seats_realistic_bus44_mobile.png');

  await browser.close();
  console.log('Completed all realistic seat screenshots!');
}

run().catch(console.error);
