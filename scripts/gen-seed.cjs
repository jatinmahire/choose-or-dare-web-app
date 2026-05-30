const fs = require('fs');
const path = require('path');


// All card data: [text, type, category, difficulty, is_adult_only]
const cards = JSON.parse(fs.readFileSync(path.join(__dirname,'../scripts/cards-data.json'),'utf8'));

const header = [
  '-- migrations/002_seed_cards.sql',
  '-- 320 party game seed cards: 40 truths + 40 dares per category',
  '-- FRIENDLY (adult=0, diff 1-3), PARTY (adult=0, diff 2-4)',
  '-- COUPLES (adult=1, diff 2-4), DIRTY (adult=1, diff 4-5)',
  ''
].join('\n');

const inserts = cards.map(([text, type, cat, diff, adult]) => {
  const safe = text.replace(/'/g, "''");
  return `INSERT INTO cards(text,type,category,difficulty,is_adult_only) VALUES ('${safe}','${type}','${cat}',${diff},${adult});`;
});

fs.writeFileSync(
  path.join(__dirname,'../migrations/002_seed_cards.sql'),
  header + inserts.join('\n') + '\n',
  'utf8'
);
console.log('Written ' + cards.length + ' cards');

