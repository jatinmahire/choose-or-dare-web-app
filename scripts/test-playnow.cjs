// scripts/test-playnow.cjs — Tests that Play Now button actually navigates to /setup

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://choose-or-dare.pages.dev';
const SCREENSHOTS = path.join(__dirname, '..', 'test-screenshots');
if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runTest() {
  console.log('🚀 Opening Chrome → Testing "Play Now" button click\n');

  const browser = await puppeteer.launch({
    headless: false,          // SHOW the browser so you can watch
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: { width: 390, height: 844 },  // iPhone size
    args: ['--no-sandbox', '--window-size=430,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  // ── STEP 1: Open landing page directly ──────────────────────────────────────
  console.log('STEP 1: Opening landing page...');
  await page.goto(BASE_URL + '/#/landing', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });
  await sleep(4000); // wait for auth + render

  const step1Hash = await page.evaluate(() => window.location.hash);
  const playBtn = await page.$('#landing-play-btn');
  console.log(`  Current hash: ${step1Hash}`);
  console.log(`  Play Now button found: ${playBtn ? '✅ YES' : '❌ NO'}`);

  await page.screenshot({ path: path.join(SCREENSHOTS, 'click-01-landing.png') });
  console.log('  📸 click-01-landing.png');

  if (!playBtn) {
    console.log('\n❌ FAIL: Play Now button not in DOM. Cannot test click.');
    await sleep(5000);
    await browser.close();
    return;
  }

  // ── STEP 2: Click Play Now ──────────────────────────────────────────────────
  console.log('\nSTEP 2: Clicking Play Now...');

  // Listen for hash changes
  let hashChanged = false;
  let newHash = '';
  await page.exposeFunction('onHashChange', (hash) => {
    hashChanged = true;
    newHash = hash;
    console.log(`  ↳ hashchange fired! new hash: ${hash}`);
  });
  await page.evaluate(() => {
    window.addEventListener('hashchange', () => {
      window.onHashChange(window.location.hash);
    });
  });

  // Also listen for navigation
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log(`  ↳ Navigation: ${frame.url()}`);
    }
  });

  // Click the button
  await playBtn.click();
  console.log('  ✅ Click sent');

  // Wait up to 5s for hash to change
  for (let i = 0; i < 10; i++) {
    await sleep(500);
    const currentHash = await page.evaluate(() => window.location.hash);
    if (currentHash !== step1Hash) {
      console.log(`  ↳ Hash changed to: ${currentHash}`);
      break;
    }
    if (i === 9) {
      console.log(`  ⚠️ Hash did NOT change after 5s (still: ${currentHash})`);
    }
  }

  const step2Hash = await page.evaluate(() => window.location.hash);
  const step2Content = await page.evaluate(() =>
    document.querySelector('#app')?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 200) || '(empty)'
  );

  console.log(`\n  Hash after click: "${step2Hash}"`);
  console.log(`  Expected:         "#/setup"`);
  console.log(`  Navigation OK:    ${step2Hash === '#/setup' ? '✅ YES' : '❌ NO — STILL ON LANDING!'}`);
  console.log(`  Content: "${step2Content.slice(0, 100)}"`);

  await page.screenshot({ path: path.join(SCREENSHOTS, 'click-02-after-playnow.png') });
  console.log('  📸 click-02-after-playnow.png');

  // ── STEP 3: If stuck, diagnose ──────────────────────────────────────────────
  if (step2Hash !== '#/setup') {
    console.log('\n🔍 DIAGNOSING why Play Now did not work...');

    const diagnosis = await page.evaluate(() => {
      const btn = document.querySelector('#landing-play-btn');
      const info = {
        btnExists: !!btn,
        btnText: btn?.textContent?.trim(),
        btnDisabled: btn?.disabled,
        btnListeners: 'unknown (cannot inspect from page)',
        hash: window.location.hash,
        hasHashChangeListener: typeof window._hashChangeAdded !== 'undefined',
      };

      // Try calling the click handler manually
      if (btn) {
        try {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          info.manualClickDispatched = true;
        } catch (e) {
          info.manualClickError = e.message;
        }
      }
      return info;
    });

    console.log('  Button info:', JSON.stringify(diagnosis, null, 2));

    await sleep(1000);
    const hashAfterManual = await page.evaluate(() => window.location.hash);
    console.log(`  Hash after manual dispatch: "${hashAfterManual}"`);

    await page.screenshot({ path: path.join(SCREENSHOTS, 'click-03-diagnosis.png') });
    console.log('  📸 click-03-diagnosis.png');
  }

  // ── RESULT ──────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  if (step2Hash === '#/setup') {
    console.log('✅ PASS: Play Now navigated to /setup correctly!');
  } else {
    console.log('❌ FAIL: Play Now did NOT navigate to /setup');
    console.log(`   Stuck at: ${step2Hash}`);
  }
  console.log('══════════════════════════════════════════');

  console.log('\n🔍 Browser stays open 20s for manual inspection...');
  await sleep(20000);
  await browser.close();
}

runTest().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
