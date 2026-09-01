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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// --mute-audio silences the speakers but does NOT touch the browser's
// autoplay policy - so this still genuinely tests whether real sound would
// have been blocked, it just does it without making noise on your laptop.
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--mute-audio'],
});
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
      goose: {
        x: w.goose.x,
        y: w.goose.y,
        frame: Number(w.goose.frame.name),
        flip: w.goose.flipX,
        inWater: w.goose.inWater,
      },
      pumpkin: { x: w.pumpkin.x, y: w.pumpkin.y },
      zoom: cam.zoom,
      shouts: w.children.list.filter((o) => o.type === 'Text' && /HONK|BOING/.test(o.text ?? ''))
        .length,
      soundsPlayed: window.__soundsPlayed ?? [],
      audioState: window.__audioState,
      uiTexts: window.__game.scene
        .getScene('UI')
        .children.list.flatMap((o) => (o.type === 'Container' ? o.list : [o]))
        .filter((o) => o.type === 'Text')
        .map((o) => o.text),
    };
  });

/** What kind of tile (water? solid?) is at this tile position. */
const kindAt = (across, down) =>
  page.evaluate(
    (a, d) => window.__game.scene.getScene('World').map.kindAt(a, d) ?? null,
    across,
    down,
  );

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

// --- 2. Goose can swim in the pond, but still can't swim through the trees ---
// Row 8 of the map has water from column 20 to 29, then grass, then the tree
// border at column 39. Walk Goose straight along it.
await place([18, 8], [18, 12]);
await hold(['KeyD'], 2500);
const swimming = await state();
check(
  'Goose swims into the pond instead of being blocked by it',
  swimming.goose.x > 20 * 16 && swimming.goose.inWater === true,
  `x=${swimming.goose.x.toFixed(0)}, inWater=${swimming.goose.inWater}`,
);
await hold(['KeyD'], 6000);
const stillBlocked = await state();
check(
  'But the tree border on the far side still blocks him',
  stillBlocked.goose.x < 39 * 16,
  `stopped at x=${stillBlocked.goose.x.toFixed(0)}`,
);

// --- 2b. Pumpkin sinks when she steps in the pond, and always gets rescued ---
const waitUntilDry = async (maxTries) => {
  for (let i = 0; i < maxTries; i++) {
    await wait(200);
    const s = await state();
    const kind = await kindAt(Math.floor(s.pumpkin.x / 16), Math.floor(s.pumpkin.y / 16));
    if (!kind?.water) return { state: s, kind };
  }
  return undefined;
};

// Dropped dead centre of the pond BEFORE she has ever stood near a bank, so
// there is no nearby remembered dry tile to fall back on - this is what
// forces the ring-search in water.ts to actually run, not just the fast path.
await place([18, 12], [25, 8]);
const rescuedFromCentre = await waitUntilDry(25);
check(
  'Pumpkin is rescued even when placed dead centre of the pond',
  !!rescuedFromCentre && !rescuedFromCentre.kind?.water && !rescuedFromCentre.kind?.solid,
  rescuedFromCentre ? rescuedFromCentre.kind?.name : 'never rescued',
);

// Now the ordinary case: one tile from the bank, walking in under her own steam.
await place([37, 14], [19, 8]);
await hold(['ArrowRight'], 400);
const rescued = await waitUntilDry(20);
check('Pumpkin never stays wet - she comes back out of the pond', !!rescued);
check(
  'She lands on a tile that is neither water nor solid',
  !!rescued && !rescued.kind?.water && !rescued.kind?.solid,
  rescued ? rescued.kind?.name : 'never landed',
);

if (rescued) {
  const beforeWalk = rescued.state.pumpkin;
  await hold(['ArrowDown'], 400);
  const afterWalk = await state();
  check(
    'Pumpkin can walk again straight after popping back up',
    Math.abs(afterWalk.pumpkin.y - beforeWalk.y) > 2,
    `y ${beforeWalk.y.toFixed(0)} -> ${afterWalk.pumpkin.y.toFixed(0)}`,
  );
}

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

// --- 6b. A real sound plays, not just text ---
check('Pressing F actually plays a honk sound', honked.soundsPlayed.includes('honk'));
check(
  "The browser's autoplay block did not silence it",
  honked.audioState !== 'suspended',
  `audioState=${honked.audioState}`,
);

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

// --- 9. Lamp shades: something to find, and a counter that counts itself ---
const lampShadeLetterCount = (() => {
  const mapPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/world/maps/meadow.txt');
  const rows = fs
    .readFileSync(mapPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('#') && line.trim().length > 0);
  return rows.join('').split('').filter((ch) => ch === 'L' || ch === 'l').length;
})();

const lampState = () =>
  page.evaluate(() => {
    const w = window.__game.scene.getScene('World');
    return { found: w.lampShadesFound ?? 0, total: w.lampShadesTotal ?? 0 };
  });

const beforeLamp = await lampState();
check(
  'The lamp shade total matches the letters in meadow.txt',
  beforeLamp.total === lampShadeLetterCount,
  `game total=${beforeLamp.total}, file total=${lampShadeLetterCount}`,
);

// The only lamp shade in the starting map floats in the middle of the pond -
// only Goose can reach it. Start him right next to it, in the water already.
await place([23, 6], [18, 12]);
await hold(['KeyD'], 900);
await wait(400);
const afterLamp = await lampState();
const lampUi = await state();
check(
  'Walking onto a lamp shade increments the counter and plays a sound',
  afterLamp.found === beforeLamp.found + 1 && lampUi.soundsPlayed.includes('pickup'),
  `found ${beforeLamp.found} -> ${afterLamp.found}`,
);
check(
  'The lamp shade counter is shown on screen',
  lampUi.uiTexts.some((t) => /Lamp shades:/.test(t)),
  lampUi.uiTexts.join(' | ').slice(0, 60),
);
if (afterLamp.total > 0 && afterLamp.found === afterLamp.total) {
  check(
    'Collecting every lamp shade shows the well-done message',
    lampUi.uiTexts.some((t) => /WELL DONE/i.test(t)),
    lampUi.uiTexts.join(' | ').slice(0, 80),
  );
}

// --- 10. Nothing exploded along the way ---
check('No errors in the browser console', errors.length === 0, errors.slice(0, 2).join(' / '));

await browser.close();

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.\n`);
process.exit(failed.length ? 1 : 0);
