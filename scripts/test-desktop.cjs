// scripts/test-desktop.cjs — Puppeteer headless test against LIVE Cloudflare site

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://choose-or-dare.pages.dev';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function screenshot(page, name) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 test-screenshots/${name}.png`);
  return file;
}

async function waitForApp(page, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ready = await page.evaluate(() => {
      const spinner = document.getElementById('init-spinner');
      const app = document.querySelector('#app');
      // App is ready when spinner is gone AND #app has content
      return (!spinner || spinner.style.opacity === '0' || !spinner.isConnected)
        && app && app.children.length > 0;
    }).catch(() => false);
    if (ready) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('  ⚠️  App took >12s — capturing screenshot anyway');
  return false;
}

async function getInfo(page) {
  return page.evaluate(() => ({
    hash: window.location.hash,
    content: document.querySelector('#app')?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 200) || '(empty)',
    spinnerGone: !document.getElementById('init-spinner'),
    appMaxWidth: getComputedStyle(document.querySelector('#app') || document.body).maxWidth,
    appRadius: getComputedStyle(document.querySelector('#app') || document.body).borderRadius,
    bodyDisplay: getComputedStyle(document.body).display,
  }));
}

async function runTests() {
  console.log(`🚀 Launching headless Chrome → ${BASE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const viewports = [
    { name: '01-desktop-1280x800', w: 1280, h: 800,  label: 'Desktop  1280×800' },
    { name: '02-laptop-1024x768',  w: 1024, h: 768,  label: 'Laptop   1024×768' },
    { name: '03-tablet-768x1024',  w: 768,  h: 1024, label: 'Tablet    768×1024' },
    { name: '04-mobile-390x844',   w: 390,  h: 844,  label: 'Mobile    390×844'  },
  ];

  const results = [];

  for (const vp of viewports) {
    console.log(`\n══ ${vp.label} ══`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h });

    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const ready = await waitForApp(page, 12000);
      const info = await getInfo(page);

      const pass = ready && (info.hash === '#/setup' || info.hash === '#/home');
      console.log(`  Routed to:   "${info.hash}" ${pass ? '✅' : '⚠️  expected #/setup'}`);
      console.log(`  Spinner:     ${info.spinnerGone ? '✅ gone' : '❌ still showing'}`);
      console.log(`  #app max-w:  ${info.appMaxWidth}  (should be 430px on desktop)`);
      console.log(`  #app radius: ${info.appRadius}  (should be 24px on desktop)`);
      console.log(`  Content:     "${info.content.slice(0, 120)}"`);

      await screenshot(page, vp.name);
      results.push({ label: vp.label, pass, ...info });
    } catch (err) {
      console.log(`  ❌ ${err.message}`);
      await screenshot(page, vp.name).catch(() => {});
      results.push({ label: vp.label, pass: false, error: err.message });
    }
    await page.close();
  }

  await browser.close();

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('═══════════════════════════════════════════════');
  results.forEach(r => {
    console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'}  ${r.label}`);
    if (r.error) console.log(`        Error: ${r.error}`);
  });
  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length} tests passed`);
  console.log('📁 Screenshots: test-screenshots/\n');
}

runTests().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
