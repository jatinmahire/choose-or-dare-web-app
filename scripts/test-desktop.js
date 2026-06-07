// scripts/test-desktop.js — Puppeteer test for Choose or Dare
// Tests both desktop and mobile viewports, takes screenshots

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.TEST_URL || 'http://localhost:4173';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function screenshot(page, name) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 Saved: test-screenshots/${name}.png`);
  return file;
}

async function run() {
  console.log('🚀 Launching Chrome...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox'],
  });

  const page = await browser.newPage();

  // ─── TEST 1: Desktop 1280×800 ──────────────────────────────────────────────
  console.log('═══════════════════════════════════════════');
  console.log('TEST 1: Desktop 1280×800');
  console.log('═══════════════════════════════════════════');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  const hash1 = await page.evaluate(() => window.location.hash);
  const title1 = await page.evaluate(() => document.title);
  const hasApp = await page.evaluate(() => !!document.querySelector('#app')?.children.length);
  console.log(`  URL hash: ${hash1 || '(none)'}`);
  console.log(`  Title:    ${title1}`);
  console.log(`  App rendered: ${hasApp ? '✅ YES' : '❌ NO'}`);

  const bodyText = await page.evaluate(() =>
    document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)
  );
  console.log(`  Content:  ${bodyText}`);
  await screenshot(page, '01-desktop-1280');

  // ─── TEST 2: Laptop 1024×768 ───────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('TEST 2: Laptop 1024×768');
  console.log('═══════════════════════════════════════════');
  await page.setViewport({ width: 1024, height: 768 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(page, '02-laptop-1024');

  // ─── TEST 3: Tablet 768×1024 ───────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('TEST 3: Tablet 768×1024');
  console.log('═══════════════════════════════════════════');
  await page.setViewport({ width: 768, height: 1024 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(page, '03-tablet-768');

  // ─── TEST 4: Mobile 390×844 (iPhone 14) ───────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('TEST 4: Mobile 390×844 (iPhone 14)');
  console.log('═══════════════════════════════════════════');
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(page, '04-mobile-390');

  // ─── TEST 5: Click through to /setup on desktop ────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('TEST 5: Navigate to /setup on desktop');
  console.log('═══════════════════════════════════════════');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(BASE_URL + '/#/setup', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));
  const setupText = await page.evaluate(() =>
    document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 300)
  );
  console.log(`  Setup page content: ${setupText}`);
  await screenshot(page, '05-setup-desktop');

  console.log('\n✅ All tests complete!');
  console.log('📁 Screenshots saved to: test-screenshots/');
  console.log('🔍 Keeping browser open — press Ctrl+C to close.\n');

  // Keep open for manual inspection
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
}

run().catch(err => {
  console.error('❌ Test error:', err.message);
  process.exit(1);
});
