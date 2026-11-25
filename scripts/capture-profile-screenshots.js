const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function main() {
  const screenshotDir = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  // 1. Visit logged out laptop view
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:3000/account', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({
    path: path.join(screenshotDir, '52_profile_logged_out_laptop.png'),
    fullPage: false,
  });
  console.log('Captured 52_profile_logged_out_laptop.png');

  // 2. Set authenticated state in localStorage
  await page.evaluate(() => {
    localStorage.setItem('uday_auth_token', 'mock_verified_token');
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
    localStorage.setItem('uday_user_name', 'Chaitanya Sonawane');
    localStorage.setItem('uday_user_mobile', '9890066580');
    localStorage.setItem('uday_account_created', 'true');
    localStorage.setItem('uday_has_account', 'true');
  });

  // Reload page to reflect auth
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // 3. Capture Logged-in Laptop View (Horizontal Profile card + 2-col dashboard)
  await page.screenshot({
    path: path.join(screenshotDir, '52_profile_laptop.png'),
    fullPage: false,
  });
  console.log('Captured 52_profile_laptop.png');

  // 4. Click delete on passenger to show confirmation dialog
  const trashBtn = await page.$('button[aria-label="Delete ShreeNidhi Sonawane"]');
  if (trashBtn) {
    await trashBtn.click();
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({
      path: path.join(screenshotDir, '52_profile_delete_confirmation_modal.png'),
      fullPage: false,
    });
    console.log('Captured 52_profile_delete_confirmation_modal.png');

    // Cancel modal
    const cancelBtn = await page.$('button::-p-text(Cancel)');
    if (cancelBtn) await cancelBtn.click();
    await new Promise(r => setTimeout(r, 300));
  }

  // 5. Mobile View (390 x 844)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(screenshotDir, '52_profile_mobile.png'),
    fullPage: false,
  });
  console.log('Captured 52_profile_mobile.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
