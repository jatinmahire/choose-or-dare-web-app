// scripts/test-desktop.cjs — Simplified Puppeteer test (no dynamic waits)

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://choose-or-dare.pages.dev';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runTests() {
  console.log(`🚀 Headless Chrome → ${BASE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    // Use the system Chrome instead of bundled Chromium (avoids V8 snapshot errors on Windows)
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const tests = [
    { name: '01-desktop-1280x800', w: 1280, h: 800,  label: 'Desktop  1280×800' },
    { name: '02-laptop-1024x768',  w: 1024, h: 768,  label: 'Laptop   1024×768'  },
    { name: '03-tablet-768x1024',  w: 768,  h: 1024, label: 'Tablet    768×1024'  },
    { name: '04-mobile-390x844',   w: 390,  h: 844,  label: 'Mobile    390×844'   },
  ];

  for (const t of tests) {
    console.log(`\n── ${t.label} ──`);
    const page = await browser.newPage();

    // Disable images/fonts to speed up load
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'font'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.setViewport({ width: t.w, height: t.h });

    try {
      console.log(`  Navigating...`);
      // Use load event with timeout
      const resp = await page.goto(BASE_URL, {
        waitUntil: 'load',
        timeout: 25000,
      }).catch(e => ({ failed: e.message }));

      if (resp && resp.failed) {
        console.log(`  ❌ Nav failed: ${resp.failed}`);
      } else {
        console.log(`  ✅ Page loaded`);
      }

      // Fixed wait — let Firebase auth + router settle
      console.log(`  Waiting 6s for auth + router...`);
      await sleep(6000);

      // Capture state
      const info = await page.evaluate(() => {
        const app = document.querySelector('#app');
        const spinner = document.getElementById('init-spinner');
        return {
          hash: window.location.hash,
          spinnerVisible: spinner ? (spinner.style.opacity !== '0' && spinner.isConnected) : false,
          appChildCount: app ? app.children.length : 0,
          content: app ? app.innerText.replace(/\s+/g, ' ').trim().slice(0, 150) : '(no #app)',
          appMaxWidth: app ? getComputedStyle(app).maxWidth : 'n/a',
          appRadius: app ? getComputedStyle(app).borderRadius : 'n/a',
          bodyFlex: getComputedStyle(document.body).display,
        };
      }).catch(e => ({ error: e.message }));

      if (info.error) {
        console.log(`  ❌ Eval error: ${info.error}`);
      } else {
        const routed = info.hash === '#/setup' || info.hash === '#/home';
        console.log(`  Hash:        ${info.hash || '(none)'}  ${routed ? '✅' : '⚠️'}`);
        console.log(`  Spinner:     ${info.spinnerVisible ? '❌ still showing' : '✅ gone'}`);
        console.log(`  #app kids:   ${info.appChildCount}`);
        console.log(`  Content:     "${info.content}"`);
        console.log(`  max-width:   ${info.appMaxWidth}  (430px expected on desktop)`);
        console.log(`  radius:      ${info.appRadius}  (24px expected on desktop)`);
        console.log(`  body.display:${info.bodyFlex}  (flex expected on desktop)`);
      }

      // Screenshot
      const file = path.join(SCREENSHOT_DIR, `${t.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`  📸 ${t.name}.png`);

    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n✅ Done! Check test-screenshots/ folder.\n');
}

runTests().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
