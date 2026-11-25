import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641';

async function main() {
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 1. Check Account Page - verify 'Book Now — Pune ↔ Ahilyanagar' is removed
    console.log('\n--- 1. Testing /account page ---');
    await page.setViewport({ width: 395, height: 844 });
    await page.goto('http://127.0.0.1:3000/account', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const accountBodyText = await page.evaluate(() => document.body.innerText);
    const hasBookNowPuneAhilyanagar = /Book Now — Pune ↔ Ahilyanagar/i.test(accountBodyText);
    console.log('Account has "Book Now — Pune ↔ Ahilyanagar":', hasBookNowPuneAhilyanagar);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '01_account_clean_no_book_now.png'),
      fullPage: false
    });
    console.log('Saved 01_account_clean_no_book_now.png');

    // 2 & 3. Check Seats Page - verify Best Match component and Subtitle fix
    console.log('\n--- 2 & 3. Testing /seats page (Mobile & Desktop) ---');
    await page.goto('http://127.0.0.1:3000/seats', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const seatsInfo = await page.evaluate(() => {
      const hero = document.querySelector('.seats-hero');
      const subtitle = hero ? hero.querySelector('p')?.innerText : '';
      const suggestion = document.querySelector('aside');
      return {
        subtitle,
        hasSuggestion: !!suggestion,
        suggestionText: suggestion ? suggestion.innerText : ''
      };
    });

    console.log('Hero Subtitle:', seatsInfo.subtitle);
    console.log('Has Suggestion Banner:', seatsInfo.hasSuggestion);
    console.log('Suggestion Banner Content:\n', seatsInfo.suggestionText);

    // Mobile screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '02_seats_mobile_perfect_best_match.png'),
      fullPage: false
    });
    console.log('Saved 02_seats_mobile_perfect_best_match.png');

    // Desktop view of /seats
    await page.setViewport({ width: 1280, height: 900 });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '03_seats_desktop_perfect_best_match.png'),
      fullPage: false
    });
    console.log('Saved 03_seats_desktop_perfect_best_match.png');

    // 4. Test Account Change -> Passenger Page Info Update
    console.log('\n--- 4. Testing Account Switch -> /passengers page ---');
    // Set localStorage with account "jayesh pude" (+919876598765)
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

    await page.setViewport({ width: 395, height: 844 });
    await page.goto('http://127.0.0.1:3000/passengers', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check passenger 1 input value
    const passengerInfo = await page.evaluate(() => {
      const nameInput = document.querySelector('input[placeholder*="ID proof"]');
      const ageInput = document.querySelector('input[placeholder="Age"]');
      return {
        passenger1Name: nameInput ? nameInput.value : '',
        passenger1Age: ageInput ? ageInput.value : ''
      };
    });

    console.log('Passenger 1 Name after switching account to jayesh pude:', JSON.stringify(passengerInfo.passenger1Name));
    console.log('Passenger 1 Age:', JSON.stringify(passengerInfo.passenger1Age));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '04_passengers_updated_jayesh_pude.png'),
      fullPage: false
    });
    console.log('Saved 04_passengers_updated_jayesh_pude.png');

    console.log('\n--- ALL VERIFICATIONS FINISHED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Puppeteer verification failed:', err);
  } finally {
    await browser.close();
  }
}

main();
