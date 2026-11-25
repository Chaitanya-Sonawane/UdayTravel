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

  // ==================== 1. Logged Out Laptop Screenshot ====================
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  console.log('Navigating page1...');
  await page1.goto('http://localhost:3000/account', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page1.waitForSelector('.account-form', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  await page1.screenshot({
    path: path.join(screenshotDir, '52_profile_logged_out_laptop.png'),
    fullPage: false,
  });
  console.log('1. Captured 52_profile_logged_out_laptop.png');
  await page1.close();

  // ==================== 2. Logged In Laptop & Modal Screenshot ====================
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  await page2.evaluateOnNewDocument(() => {
    const profile = {
      uid: 'user_chaitanya_test',
      name: 'Chaitanya Sonawane',
      mobile: '9890066580',
      age: 22,
      gender: 'Male',
      email: 'chaitanya@udaytravel.in',
      savedPassengers: [
        { id: 'pax-1', name: 'Chaitanya Sonawane', age: 22, gender: 'Male', isSelf: true },
        { id: 'pax-2', name: 'ShreeNidhi Sonawane', age: 20, gender: 'Female', isSelf: false },
        { id: 'pax-3', name: 'Manav Sharma', age: 32, gender: 'Male', isSelf: false },
      ],
    };

    localStorage.setItem('uday_auth_token', 'mock_token_chaitanya');
    localStorage.setItem('uday_current_uid', 'user_chaitanya_test');
    localStorage.setItem('uday_user_profile', JSON.stringify(profile));
    localStorage.setItem('uday_user_name', profile.name);
    localStorage.setItem('uday_user_mobile', profile.mobile);
    localStorage.setItem('uday_account_created', 'true');
    localStorage.setItem('uday_has_account', 'true');
  });

  console.log('Navigating page2...');
  await page2.goto('http://localhost:3000/account', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page2.waitForSelector('button[aria-label="Delete ShreeNidhi Sonawane"]', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 600));

  await page2.screenshot({
    path: path.join(screenshotDir, '52_profile_laptop.png'),
    fullPage: false,
  });
  console.log('2. Captured 52_profile_laptop.png');

  // Trigger Delete confirmation modal
  const deleteBtn = await page2.$('button[aria-label="Delete ShreeNidhi Sonawane"]');
  if (deleteBtn) {
    console.log('Clicking delete button for ShreeNidhi Sonawane...');
    await deleteBtn.click();
    await page2.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 400));
    await page2.screenshot({
      path: path.join(screenshotDir, '52_profile_delete_confirmation_modal.png'),
      fullPage: false,
    });
    console.log('3. Captured 52_profile_delete_confirmation_modal.png');
  }
  await page2.close();

  // ==================== 3. Logged In Mobile Screenshot ====================
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

  await page3.evaluateOnNewDocument(() => {
    const profile = {
      uid: 'user_chaitanya_test',
      name: 'Chaitanya Sonawane',
      mobile: '9890066580',
      age: 22,
      gender: 'Male',
      email: 'chaitanya@udaytravel.in',
      savedPassengers: [
        { id: 'pax-1', name: 'Chaitanya Sonawane', age: 22, gender: 'Male', isSelf: true },
        { id: 'pax-2', name: 'ShreeNidhi Sonawane', age: 20, gender: 'Female', isSelf: false },
        { id: 'pax-3', name: 'Manav Sharma', age: 32, gender: 'Male', isSelf: false },
      ],
    };

    localStorage.setItem('uday_auth_token', 'mock_token_chaitanya');
    localStorage.setItem('uday_current_uid', 'user_chaitanya_test');
    localStorage.setItem('uday_user_profile', JSON.stringify(profile));
    localStorage.setItem('uday_user_name', profile.name);
    localStorage.setItem('uday_user_mobile', profile.mobile);
    localStorage.setItem('uday_account_created', 'true');
    localStorage.setItem('uday_has_account', 'true');
  });

  console.log('Navigating page3...');
  await page3.goto('http://localhost:3000/account', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page3.waitForSelector('button[aria-label="Delete ShreeNidhi Sonawane"]', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 600));

  await page3.screenshot({
    path: path.join(screenshotDir, '52_profile_mobile.png'),
    fullPage: false,
  });
  console.log('4. Captured 52_profile_mobile.png');
  await page3.close();

  await browser.close();
  console.log('All screenshots completed successfully!');
}

main().catch(console.error);
