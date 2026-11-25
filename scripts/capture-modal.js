const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function main() {
  const screenshotDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/screenshots';

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:3000/account', { waitUntil: 'networkidle2' });

  // Set mock user and passengers
  await page.evaluate(() => {
    localStorage.setItem('uday_auth_token', 'mock_token_123');
    localStorage.setItem('uday_current_uid', 'user_chaitanya');
    localStorage.setItem('uday_user_profile', JSON.stringify({
      uid: 'user_chaitanya',
      name: 'Chaitanya Sonawane',
      mobile: '9890066580',
      age: 22,
      gender: 'Male',
      email: 'chaitanya@example.com',
      savedPassengers: [
        { id: 'pax-1', name: 'Chaitanya Sonawane', age: 22, gender: 'Male', isSelf: true },
        { id: 'pax-2', name: 'ShreeNidhi Sonawane', age: 20, gender: 'Female', isSelf: false },
        { id: 'pax-3', name: 'Manav Sharma', age: 32, gender: 'Male', isSelf: false },
      ],
    }));
  });

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Find all buttons with trash or delete
  const buttons = await page.$$('button[aria-label^="Delete "]');
  console.log(`Found ${buttons.length} delete buttons`);
  if (buttons.length > 0) {
    await buttons[0].click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(screenshotDir, '52_profile_delete_confirmation_modal.png'),
      fullPage: false,
    });
    console.log('Saved 52_profile_delete_confirmation_modal.png');
  }

  await browser.close();
}

main().catch(console.error);
