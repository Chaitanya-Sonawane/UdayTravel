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
  await page.goto('http://127.0.0.1:3000/account', { waitUntil: 'domcontentloaded' });

  // Wait for session check to resolve
  try {
    await page.waitForFunction(() => !document.body.innerText.includes('Checking session...'), { timeout: 8000 });
  } catch (e) {
    console.log('Timeout waiting for checking session to disappear');
  }

  await new Promise(r => setTimeout(r, 1000));

  // Capture logged out view
  await page.screenshot({
    path: path.join(screenshotDir, '52_profile_logged_out_laptop.png'),
    fullPage: false,
  });
  console.log('Captured 52_profile_logged_out_laptop.png');

  // Now create an account via register API or login
  console.log('Registering user via API...');
  const regRes = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Chaitanya Sonawane',
          mobile: '9890066580',
          age: 22,
          gender: 'Male',
          email: 'chaitanya@example.com',
          password: 'Password123!',
        }),
      });
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('Register response:', regRes);

  if (regRes?.token) {
    await page.evaluate((data) => {
      localStorage.setItem('uday_auth_token', data.token);
      localStorage.setItem('uday_current_uid', data.user.uid);
      localStorage.setItem('uday_user_profile', JSON.stringify(data.profile));
      localStorage.setItem('uday_user_name', data.profile.name);
      localStorage.setItem('uday_user_mobile', data.profile.mobile);
    }, regRes);
  } else {
    // Try login
    const loginRes = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: '9890066580',
            password: 'Password123!',
          }),
        });
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('Login response:', loginRes);
    if (loginRes?.token) {
      await page.evaluate((data) => {
        localStorage.setItem('uday_auth_token', data.token);
        localStorage.setItem('uday_current_uid', data.user.uid);
        localStorage.setItem('uday_user_profile', JSON.stringify(data.profile));
        localStorage.setItem('uday_user_name', data.profile.name);
        localStorage.setItem('uday_user_mobile', data.profile.mobile);
      }, loginRes);
    }
  }

  // Add saved passengers to user profile via POST /api/account/passengers
  const passRes = await page.evaluate(async () => {
    const token = localStorage.getItem('uday_auth_token');
    const res = await fetch('/api/account/passengers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'ShreeNidhi Sonawane',
        age: 20,
        gender: 'Female',
      }),
    });
    return await res.json();
  });
  console.log('Add passenger response:', passRes);

  // Reload page to display authenticated state
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({
    path: path.join(screenshotDir, '52_profile_laptop.png'),
    fullPage: false,
  });
  console.log('Captured 52_profile_laptop.png');

  // Click delete button on passenger
  const deleteBtn = await page.$('button[aria-label^="Delete "]');
  if (deleteBtn) {
    await deleteBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(screenshotDir, '52_profile_delete_confirmation_modal.png'),
      fullPage: false,
    });
    console.log('Captured 52_profile_delete_confirmation_modal.png');

    // Cancel modal
    const cancelBtn = await page.$('button::-p-text(Cancel)');
    if (cancelBtn) await cancelBtn.click();
    await new Promise(r => setTimeout(r, 300));
  } else {
    console.log('No delete button found');
  }

  // Mobile screenshot
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({
    path: path.join(screenshotDir, '52_profile_mobile.png'),
    fullPage: false,
  });
  console.log('Captured 52_profile_mobile.png');

  await browser.close();
  console.log('All done!');
}

main().catch(console.error);
