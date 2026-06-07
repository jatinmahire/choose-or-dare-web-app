// scripts/trace-landing.cjs — Traces exactly who calls navigate('/landing')

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://choose-or-dare.pages.dev';
const SCREENSHOTS = path.join(__dirname, '..', 'test-screenshots');
if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('🔍 Tracing who calls navigate("/landing")...\n');

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: { width: 390, height: 844 },
    args: ['--no-sandbox', '--window-size=430,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  // Capture console.error from the page
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('[TRACE]')) {
      console.log('  [PAGE]', msg.text());
    }
  });

  // Inject router monkey-patch BEFORE the app loads
  await page.evaluateOnNewDocument(() => {
    // Store navigate calls
    window._navigateCalls = [];
    window._landingCalls = [];

    // Patch history.replaceState to capture stack traces
    const origReplaceState = history.replaceState.bind(history);
    history.replaceState = function(state, title, url) {
      if (url && url.includes('/landing')) {
        const stack = new Error('navigate-to-landing').stack;
        window._landingCalls.push({ url, stack, time: Date.now() });
        console.error('[TRACE] navigate("/landing") called! Stack:\n' + stack);
      }
      return origReplaceState(state, title, url);
    };

    // Patch history.pushState too
    const origPushState = history.pushState.bind(history);
    history.pushState = function(state, title, url) {
      if (url && url.includes('/landing')) {
        const stack = new Error('navigate-to-landing-push').stack;
        window._landingCalls.push({ url, stack, time: Date.now() });
        console.error('[TRACE] pushState("/landing") called! Stack:\n' + stack);
      }
      return origPushState(state, title, url);
    };

    // Also patch location.hash setter
    let _hashSetCount = 0;
    const hashDescriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'hash');
    if (hashDescriptor && hashDescriptor.set) {
      const origSetter = hashDescriptor.set;
      Object.defineProperty(location, 'hash', {
        get: hashDescriptor.get.bind(location),
        set: function(val) {
          console.error('[TRACE] location.hash set to: ' + val + ' | stack: ' + new Error().stack.split('\n')[2]);
          return origSetter.call(this, val);
        },
        configurable: true,
      });
    }
  });

  // Navigate to landing page
  console.log('Opening landing page...');
  await page.goto(BASE_URL + '/#/landing', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });
  await sleep(3000);

  // Check state before click
  const beforeHash = await page.evaluate(() => window.location.hash);
  const hasBtn = await page.$('#landing-play-btn');
  console.log(`Hash: ${beforeHash}, Play Now button: ${hasBtn ? '✅' : '❌'}`);

  await page.screenshot({ path: path.join(SCREENSHOTS, 'trace-01-before.png') });

  if (!hasBtn) {
    console.log('No Play Now button found!');
    await sleep(5000);
    await browser.close();
    return;
  }

  console.log('\nClicking Play Now...');
  await hasBtn.click();
  await sleep(3000);

  // Grab all trace data
  const traces = await page.evaluate(() => {
    return {
      currentHash: window.location.hash,
      landingCalls: window._landingCalls || [],
    };
  });

  console.log(`\nHash after click: ${traces.currentHash}`);
  console.log(`\nNavigate-to-/landing calls captured: ${traces.landingCalls.length}`);
  traces.landingCalls.forEach((call, i) => {
    console.log(`\n--- Call #${i + 1} ---`);
    console.log(`URL: ${call.url}`);
    console.log(`Stack:\n${call.stack}`);
  });

  await page.screenshot({ path: path.join(SCREENSHOTS, 'trace-02-after.png') });

  // Also log all console messages
  console.log('\nKeeping browser open 15s for inspection...');
  await sleep(15000);
  await browser.close();
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
