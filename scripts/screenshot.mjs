/**
 * Takes a picture of the running game, so we can check it still looks right
 * without anyone having to sit and watch it.
 *
 * Run it with:   npm run shot
 * (Start the game first in another window with: npm run dev)
 *
 * It saves screenshot.png in the project folder, and prints any errors the
 * game complained about in the browser console.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const URL = process.env.SHOT_URL ?? 'http://localhost:5173/';
const OUT = process.env.SHOT_OUT ?? 'screenshot.png';
const HOLD_KEYS = (process.env.SHOT_KEYS ?? '').split(',').filter(Boolean);
const WAIT_MS = Number(process.env.SHOT_WAIT ?? 2500);

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const executablePath = EDGE_PATHS.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('Could not find Edge or Chrome to take the picture with.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--window-size=1280,720'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => problems.push(`[failed] ${r.url()} - ${r.failure()?.errorText}`));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

// Hold down some keys so we can photograph the characters mid-walk.
for (const key of HOLD_KEYS) await page.keyboard.down(key);
await new Promise((r) => setTimeout(r, WAIT_MS));

await page.screenshot({ path: OUT });
for (const key of HOLD_KEYS) await page.keyboard.up(key);
await browser.close();

console.log(`Saved ${OUT}`);
if (problems.length) {
  console.log('\nThe browser complained about these things:');
  for (const p of [...new Set(problems)]) console.log('  ' + p);
} else {
  console.log('No errors or warnings from the browser.');
}
