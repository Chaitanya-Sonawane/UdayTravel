const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.error('ERR:', err.message));

  await page.goto('http://localhost:3000/account', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const state = await page.evaluate(() => {
    return {
      title: document.title,
      htmlText: document.body.innerText.slice(0, 300),
      hasSpinner: !!document.querySelector('.spinner'),
      hasProfileCard: !!document.querySelector('.profile-card'),
      localStorage: { ...localStorage },
    };
  });
  console.log('Page state:', state);

  await browser.close();
}

main().catch(console.error);
