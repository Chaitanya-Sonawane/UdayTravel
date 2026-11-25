const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER PAGEERROR:', err.message));

  await page.goto('http://127.0.0.1:3000/account', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  await browser.close();
}

main().catch(console.error);
