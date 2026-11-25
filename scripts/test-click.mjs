import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://127.0.0.1:3000/passengers', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const jayeshProfile = {
      name: 'jayesh pude',
      mobile: '9876598765',
      age: 28,
      gender: 'man',
      email: 'jayesh@example.com'
    };
    localStorage.setItem('uday_user_profile', JSON.stringify(jayeshProfile));
    localStorage.setItem('uday_current_uid', 'jayesh_uid_123');
    localStorage.setItem('uday_auth_token', 'mock_token_jayesh');
    localStorage.setItem('uday_account_created', 'true');
    window.dispatchEvent(new CustomEvent('uday_auth_changed', { detail: { uid: 'jayesh_uid_123' } }));
  });

  await page.goto('http://127.0.0.1:3000/passengers', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue to passenger details'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked continue button:', clicked);
  await new Promise(r => setTimeout(r, 1500));

  const inputs = await page.evaluate(() => {
    const nameInput = document.querySelector('input[placeholder*="ID proof"]');
    const ageInput = document.querySelector('input[placeholder="Age"]');
    return {
      name: nameInput ? nameInput.value : null,
      age: ageInput ? ageInput.value : null,
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText)
    };
  });
  console.log('Inputs found:', JSON.stringify(inputs, null, 2));

  await page.screenshot({ path: '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641/04_verified_passenger_jayesh.png', fullPage: true });
  await browser.close();
}

main();
