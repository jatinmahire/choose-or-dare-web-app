// scripts/patch-history.js — one-shot patch to refactor history.js PTR/scroll
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'pages', 'history.js');
let c = fs.readFileSync(file, 'utf8');

// 1. Replace inline IntersectionObserver block
c = c.replace(
  /\/\/ \u2500\u2500 IntersectionObserver for infinite scroll[\s\S]+?observer\.observe\(sentinel\);/,
  `  // \u2500\u2500 Infinite scroll via shared utility \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const scroll = addInfiniteScroll(sentinel, () => {
    if (hasMore && !loading) { page++; loadPage(page, true); }
  });`
);

// 2. Replace inline PTR block (touch handlers + event listeners)
c = c.replace(
  /\/\/ \u2500\u2500 Pull-to-refresh[\s\S]+?root\.removeEventListener\('touchend',\s+onTouchEnd\);/,
  `  // \u2500\u2500 Pull-to-refresh via shared utility \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const ptr = initPullToRefresh(ptrEl, async () => {
    page = 1;
    await loadPage(1, false);
  });`
);

// 3. Replace cleanup to use scroll.disconnect + ptr.destroy
c = c.replace(
  /\/\/ Cleanup\s+return \(\) => \{[\s\S]+?observer\.disconnect\(\);[\s\S]+?\};(\s*\})/,
  `  // Cleanup
  return () => {
    scroll.disconnect();
    ptr.destroy();
    document.getElementById('bottom-nav')?.remove();
  };$1`
);

fs.writeFileSync(file, c, 'utf8');

// Verify
const result = fs.readFileSync(file, 'utf8');
console.log('addInfiniteScroll used:', result.includes('addInfiniteScroll(sentinel'));
console.log('initPullToRefresh used:', result.includes('initPullToRefresh(ptrEl'));
console.log('inline observer gone:', !result.includes('new IntersectionObserver'));
console.log('inline onTouchStart gone:', !result.includes('function onTouchStart'));
console.log('Done.');
