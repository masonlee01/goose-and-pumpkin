/**
 * Builds the game's picture files.
 *
 * Run it with:   npm run art
 *
 * It makes three things inside public/assets/ :
 *   tiles/tileset.png     - the ground/trees/houses, plus water that we drew ourselves
 *   sprites/goose.png     - Goose, in all his walking poses
 *   sprites/pumpkin.png   - Pumpkin, in all her rolling poses
 *
 * WANT TO CHANGE A COLOUR? Look for the COLOURS section a few lines down.
 * Change a colour, save, then run "npm run art" and everything is redrawn.
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TILE = 16; // every tile and every character is 16x16 dots big

// ---------------------------------------------------------------------------
// COLOURS  (change these! then run: npm run art)
// ---------------------------------------------------------------------------
const C = {
  outline: '#2d1b2e', // the dark line drawn around everything
  gooseBody: '#ffffff',
  gooseShade: '#d9dee8',
  gooseBeak: '#ffa322',
  gooseFeet: '#e07a1f',
  gooseEye: '#2d1b2e',
  pumpkinBody: '#f2892a',
  pumpkinShade: '#d4661a',
  pumpkinLine: '#c25715',
  pumpkinStem: '#4a9b3c',
  pumpkinEye: '#2d1b2e',
  waterDeep: '#2f7ec4',
  waterMid: '#3f93d9',
  waterLight: '#68b3e8',
  waterFoam: '#bfe3f7',
  lampShade: '#f5e6c8',
  lampShadeShade: '#e0c896',
  lampShadeRim: '#c9a45e',
};

// ---------------------------------------------------------------------------
// A tiny drawing toolkit
// ---------------------------------------------------------------------------
const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  255,
];

/** A blank picture you can draw dots on. */
class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.png = new PNG({ width: w, height: h });
    this.png.data.fill(0); // start fully see-through
  }

  set(x, y, colour) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = Array.isArray(colour) ? colour : hex(colour);
    const i = (y * this.w + x) << 2;
    this.png.data[i] = r;
    this.png.data[i + 1] = g;
    this.png.data[i + 2] = b;
    this.png.data[i + 3] = a;
  }

  get(x, y) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) << 2;
    return [this.png.data[i], this.png.data[i + 1], this.png.data[i + 2], this.png.data[i + 3]];
  }

  rect(x, y, w, h, colour) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, colour);
  }

  /** A filled circle-ish blob. cx/cy is the middle, rx/ry is how wide and tall. */
  ellipse(cx, cy, rx, ry, colour) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.05) this.set(x, y, colour);
      }
    }
  }

  /** Draws the dark line around whatever is already drawn. Kenney's art does this too. */
  addOutline(colour = C.outline) {
    const solid = new Set();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) if (this.get(x, y)[3] > 0) solid.add(y * this.w + x);

    const edge = new Set();
    for (const key of solid) {
      const x = key % this.w;
      const y = Math.floor(key / this.w);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
        if (!solid.has(ny * this.w + nx)) edge.add(ny * this.w + nx);
      }
    }
    for (const key of edge) this.set(key % this.w, Math.floor(key / this.w), colour);
  }

  /** Copy this picture onto a bigger sheet. */
  blitTo(sheet, ox, oy) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] > 0) sheet.set(ox + x, oy + y, c);
      }
  }
}

const save = (canvas, relPath) => {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, PNG.sync.write(canvas.png));
  console.log(`  wrote ${relPath}  (${canvas.w}x${canvas.h})`);
};

// ---------------------------------------------------------------------------
// GOOSE - a white goose with a long neck and an orange beak
// ---------------------------------------------------------------------------
function drawGoose(facing, step) {
  const c = new Canvas(TILE, TILE);
  const bob = step === 1 ? -1 : 0; // a little bounce while walking
  const legL = step === 1 ? 1 : 0;
  const legR = step === 1 ? 0 : 1;

  // feet first, so the body draws over the top of them
  c.rect(5, 14 + legL, 2, 1, C.gooseFeet);
  c.rect(9, 14 + legR, 2, 1, C.gooseFeet);

  // body
  c.ellipse(8, 11 + bob, 4, 3, C.gooseBody);
  c.ellipse(9, 12 + bob, 3, 2, C.gooseShade);
  c.ellipse(8, 10.5 + bob, 3.5, 2.2, C.gooseBody);

  if (facing === 'side') {
    c.rect(9, 5 + bob, 2, 5, C.gooseBody); // neck
    c.ellipse(10, 4 + bob, 2, 1.8, C.gooseBody); // head
    c.rect(12, 4 + bob, 3, 2, C.gooseBeak); // beak pointing right
    c.set(10, 3 + bob, C.gooseEye);
    c.rect(4, 10 + bob, 3, 2, C.gooseShade); // tail
  } else if (facing === 'down') {
    c.rect(7, 5 + bob, 2, 5, C.gooseBody);
    c.ellipse(8, 4 + bob, 2.2, 1.8, C.gooseBody);
    c.rect(7, 5 + bob, 2, 2, C.gooseBeak); // beak pointing at us
    c.set(6, 3 + bob, C.gooseEye);
    c.set(10, 3 + bob, C.gooseEye);
  } else {
    // 'up' - we see the back of his head, so no beak and no eyes
    c.rect(7, 5 + bob, 2, 5, C.gooseBody);
    c.ellipse(8, 4 + bob, 2.2, 1.8, C.gooseBody);
    c.ellipse(8, 4.5 + bob, 1.6, 1.2, C.gooseShade);
  }

  c.addOutline();
  return c;
}

// ---------------------------------------------------------------------------
// PUMPKIN - a round orange pumpkin with a green stem and a happy face
// ---------------------------------------------------------------------------
function drawPumpkin(facing, step) {
  const c = new Canvas(TILE, TILE);
  const squash = step === 1;
  const cy = squash ? 10.5 : 10;
  const rx = squash ? 5.4 : 5;
  const ry = squash ? 4.1 : 4.5;

  c.ellipse(8, cy, rx, ry, C.pumpkinBody);
  c.ellipse(9.5, cy + 0.5, rx - 2, ry - 0.6, C.pumpkinShade); // shaded side
  c.ellipse(6.5, cy - 0.6, rx - 2.4, ry - 1, C.pumpkinBody); // bright side

  // the ribs that make a pumpkin look like a pumpkin
  for (const rib of [5, 8, 11]) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      if (c.get(rib, y)[3] > 0) c.set(rib, y, C.pumpkinLine);
    }
  }

  // stem
  c.rect(7, Math.round(cy - ry) - 1, 2, 2, C.pumpkinStem);
  c.set(9, Math.round(cy - ry) - 1, C.pumpkinStem);

  if (facing === 'down') {
    c.set(6, cy - 0.5, C.pumpkinEye);
    c.set(10, cy - 0.5, C.pumpkinEye);
    c.rect(7, Math.round(cy + 1.5), 3, 1, C.pumpkinEye); // smile
  } else if (facing === 'side') {
    c.set(10, cy - 0.5, C.pumpkinEye);
    c.rect(10, Math.round(cy + 1.5), 2, 1, C.pumpkinEye);
  }
  // facing 'up' = we only see her back, so no face at all

  c.addOutline();
  return c;
}

// ---------------------------------------------------------------------------
// Put the 8 poses of one character into a single strip.
// Frame order: 0=down 1=down-step 2=up 3=up-step 4=side 5=side-step
//              6=in the pond      7=in the pond, other step
// Frames 0-5 keep their exact meanings so createAnimations never has to
// change; the pond frames are added on the END.
// ---------------------------------------------------------------------------
function buildCharacterSheet(drawFn, drawSwimFn) {
  const sheet = new Canvas(TILE * 8, TILE);
  let i = 0;
  for (const facing of ['down', 'up', 'side']) {
    for (const step of [0, 1]) {
      drawFn(facing, step).blitTo(sheet, i * TILE, 0);
      i++;
    }
  }
  for (const step of [0, 1]) {
    drawSwimFn(step).blitTo(sheet, i * TILE, 0);
    i++;
  }
  return sheet;
}

// ---------------------------------------------------------------------------
// GOOSE, SWIMMING - just his top half poking up above a pale wake
// ---------------------------------------------------------------------------
function drawGooseSwimming(step) {
  const c = new Canvas(TILE, TILE);
  const bob = step === 1 ? -1 : 0;

  // the wake first, so the goose is drawn floating on top of it
  c.ellipse(8, 12, 6, 3, C.waterFoam);
  c.ellipse(8, 12, 4.5, 2, C.waterMid);

  c.rect(7, 6 + bob, 2, 5, C.gooseBody); // neck
  c.ellipse(8, 5 + bob, 2.2, 1.8, C.gooseBody); // head
  c.rect(7, 6 + bob, 2, 2, C.gooseBeak); // beak pointing at us
  c.set(6, 4 + bob, C.gooseEye);
  c.set(10, 4 + bob, C.gooseEye);

  // outlined last, together with the wake, so the whole watery shape reads as one thing
  c.addOutline();
  return c;
}

// ---------------------------------------------------------------------------
// PUMPKIN, SINKING - she is gone; just her bubbles rising to the surface
// ---------------------------------------------------------------------------
function drawPumpkinBubbles(step) {
  const c = new Canvas(TILE, TILE);
  const rise = step === 1 ? -1 : 0;

  c.ellipse(6, 11 + rise, 1.3, 1.3, C.waterFoam);
  c.ellipse(10, 8 + rise, 1, 1, C.waterFoam);
  c.ellipse(8, 5 + rise, 1.6, 1.6, C.waterFoam);

  // outlined in watery blue, not black - these are bubbles, not a character
  c.addOutline(C.waterDeep);
  return c;
}

// ---------------------------------------------------------------------------
// LAMP SHADE - a little cream cone shape, something to spot and collect
// ---------------------------------------------------------------------------
function drawLampshade() {
  const c = new Canvas(TILE, TILE);
  const top = 4;
  const bottom = 13;
  const cx = 8;

  // the cone, one row at a time, narrow at the top and wide at the bottom
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / (bottom - top);
    const halfWidth = 3 + t * 3;
    c.rect(Math.round(cx - halfWidth), y, Math.round(halfWidth * 2), 1, C.lampShade);
  }

  c.rect(6, 6, 2, 5, C.lampShadeShade); // a shaded stripe down one side
  c.ellipse(cx, bottom, 6, 1.2, C.lampShadeRim); // the darker rim at the bottom

  c.addOutline();
  return c;
}

// ---------------------------------------------------------------------------
// WATER - Kenney's Tiny Town pack has no water, so we draw our own
// ---------------------------------------------------------------------------
function drawWater(variant) {
  const c = new Canvas(TILE, TILE);
  c.rect(0, 0, TILE, TILE, C.waterMid);

  // gentle bands so the water does not look flat
  for (let y = 0; y < TILE; y++) {
    if (Math.sin((y / TILE) * Math.PI * 2 + variant) > 0.3) c.rect(0, y, TILE, 1, C.waterDeep);
  }

  // a few sparkles, in a fixed pattern so they never flicker randomly
  const sparkles =
    variant === 0
      ? [[3, 4], [4, 4], [10, 9], [11, 9], [7, 12]]
      : [[9, 3], [10, 3], [4, 10], [5, 10], [12, 6]];
  for (const [x, y] of sparkles) c.set(x, y, C.waterLight);
  c.set(sparkles[0][0], sparkles[0][1] + 1, C.waterFoam);

  return c;
}

// ---------------------------------------------------------------------------
// Build the tileset: Kenney's tiles on top, our own tiles added underneath
// ---------------------------------------------------------------------------
function buildTileset() {
  const srcPath = path.join(ROOT, 'art-source/kenney_tiny-town/tilemap_packed.png');
  const src = PNG.sync.read(fs.readFileSync(srcPath));
  const cols = src.width / TILE; // 12
  const baseRows = src.height / TILE; // 11  -> Kenney's tiles are numbers 0..131
  const sheet = new Canvas(src.width, src.height + TILE); // one extra row for our own

  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) << 2;
      if (src.data[i + 3] > 0) {
        sheet.set(x, y, [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]]);
      }
    }

  const firstCustom = baseRows * cols; // 132
  drawWater(0).blitTo(sheet, 0 * TILE, baseRows * TILE); // tile 132
  drawWater(1).blitTo(sheet, 1 * TILE, baseRows * TILE); // tile 133

  return { sheet, cols, firstCustom };
}

// ---------------------------------------------------------------------------
// The little icon that shows up on the browser tab: Goose, blown up 4x.
// ---------------------------------------------------------------------------
function buildFavicon() {
  const source = drawGoose('down', 0);
  const scale = 4;
  const icon = new Canvas(TILE * scale, TILE * scale);
  for (let y = 0; y < icon.h; y++)
    for (let x = 0; x < icon.w; x++) {
      const c = source.get(Math.floor(x / scale), Math.floor(y / scale));
      if (c[3] > 0) icon.set(x, y, c);
    }
  return icon;
}

// ---------------------------------------------------------------------------
console.log('Drawing the pictures for Goose and Pumpkin...');
save(buildFavicon(), 'public/favicon.png');
save(buildCharacterSheet(drawGoose, drawGooseSwimming), 'public/assets/sprites/goose.png');
save(buildCharacterSheet(drawPumpkin, drawPumpkinBubbles), 'public/assets/sprites/pumpkin.png');
save(drawLampshade(), 'public/assets/sprites/lampshade.png');
const built = buildTileset();
save(built.sheet, 'public/assets/tiles/tileset.png');
console.log(
  `Done. The tileset is ${built.cols} tiles wide, and our own tiles start at number ${built.firstCustom}.`,
);
