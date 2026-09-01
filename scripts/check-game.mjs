/**
 * Plays the game automatically and checks that the important things still work.
 *
 * Run it with:   npm run check:game
 * (Start the game first in another window with: npm run dev)
 *
 * Every time we add a feature we should add a check down at the bottom, so
 * that next Saturday we find out in 10 seconds whether we broke anything.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const URL = process.env.CHECK_URL ?? 'http://localhost:5173/';
const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];

const results = [];
const check = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? '  PASS' : '  FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const executablePath = BROWSERS.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('Could not find Edge or Chrome to test with.');
  process.exit(1);
}

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
});

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(1200);

const state = () =>
  page.evaluate(() => {
    const w = window.__game.scene.getScene('World');
    const cam = w.cameras.main;
    return {
      goose: { x: w.goose.x, y: w.goose.y, frame: Number(w.goose.frame.name), flip: w.goose.flipX },
      pumpkin: { x: w.pumpkin.x, y: w.pumpkin.y },
      zoom: cam.zoom,
      shouts: w.children.list.filter((o) => o.type === 'Text' && /HONK|BOING/.test(o.text ?? ''))
        .length,
      uiTexts: window.__game.scene
        .getScene('UI')
        .children.list.flatMap((o) => (o.type === 'Container' ? o.list : [o]))
        .filter((o) => o.type === 'Text')
        .map((o) => o.text),
    };
  });

const place = (goose, pumpkin) =>
  page.evaluate(
    (g, p) => {
      const w = window.__game.scene.getScene('World');
      w.goose.setPosition(g[0] * 16 + 8, g[1] * 16 + 8);
      w.pumpkin.setPosition(p[0] * 16 + 8, p[1] * 16 + 8);
    },
    goose,
    pumpkin,
  );

const hold = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await wait(ms);
  for (const k of keys) await page.keyboard.up(k);
  await wait(150);
};

console.log('\nChecking Goose and Pumpkin...\n');

// --- 1. The big one: can both boys move at the same time on one keyboard? ---
await place([18, 3], [20, 3]);
const before = await state();
await hold(['KeyD', 'ArrowLeft'], 700);
const after = await state();
check(
  'Goose walks right and Pumpkin walks left AT THE SAME TIME',
  after.goose.x > before.goose.x + 4 && after.pumpkin.x < before.pumpkin.x - 4,
  `goose ${before.goose.x.toFixed(0)}->${after.goose.x.toFixed(0)}, pumpkin ${before.pumpkin.x.toFixed(0)}->${after.pumpkin.x.toFixed(0)}`,
);

// --- 2. Walking into the pond should stop you ---
// Row 8 of the map has water from column 20 across. Start Goose just left of it.
await place([18, 8], [18, 12]);
await hold(['KeyD'], 1500);
const atWater = await state();
check(
  'The pond blocks Goose instead of letting him swim off',
  atWater.goose.x < 20 * 16,
  `stopped at x=${atWater.goose.x.toFixed(0)}, water starts at x=320`,
);

// --- 3. Walking into a tree should stop you ---
// Column 39 of every row is the tree border down the right-hand edge.
await place([37, 14], [18, 12]);
await hold(['KeyD'], 1500);
const atTree = await state();
check(
  'The trees around the edge block Goose',
  atTree.goose.x < 39 * 16,
  `stopped at x=${atTree.goose.x.toFixed(0)}`,
);

// --- 4. Facing the right way ---
await place([18, 12], [20, 12]);
await hold(['KeyA'], 400);
const facingLeft = await state();
check('Goose turns around when he walks left', facingLeft.goose.flip === true);

// --- 5. The camera zooms out when they run apart ---
await place([4, 4], [4, 4]);
await wait(1500);
const together = await state();
await place([4, 4], [34, 26]);
await wait(2500);
const apart = await state();
check(
  'The camera zooms out when they split up, so neither gets left behind',
  apart.zoom < together.zoom - 0.2,
  `zoom ${together.zoom.toFixed(2)} -> ${apart.zoom.toFixed(2)}`,
);

// --- 6. Honking ---
await place([18, 12], [20, 12]);
await hold(['KeyF'], 150);
await wait(200);
const honked = await state();
check('Pressing F makes Goose honk', honked.shouts > 0);

// --- 7. Reading a sign ---
await place([8, 15], [20, 12]);
await wait(300);
await hold(['KeyF'], 150);
await wait(400);
const read = await state();
check(
  'Standing by the signpost and pressing F reads the sign',
  read.uiTexts.some((t) => t.includes('MEADOW')),
  read.uiTexts.join(' | ').slice(0, 60),
);

// --- 8. Nothing exploded along the way ---
check('No errors in the browser console', errors.length === 0, errors.slice(0, 2).join(' / '));

await browser.close();

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.\n`);
process.exit(failed.length ? 1 : 0);
