import Phaser from 'phaser';
import { PHEW_TEXT, POP_TIME, SINK_TIME, TILE_SIZE } from '../config';
import type { Player } from '../entities/Player';
import { isWaterAt, type LoadedMap } from '../world/loadMap';

/**
 * The pond. Mirrors camera.ts - a small class WorldScene owns and calls
 * `update()` on, every frame, BEFORE anything else moves. That ordering is
 * what makes stepping into the water slow Goose down on the very same frame
 * he does it.
 *
 * Goose can swim in the pond. Pumpkin cannot, so instead she plays out a
 * cycle: land -> sinking -> popping -> land. She disappears under the water
 * for a moment, then gets put back on the nearest dry ground. Both effects
 * work by setting two things on Player - `inWater` and `heldStillUntil` -
 * Player itself never learns what a tilemap is.
 */

// How many tiles away the last dry tile they stood on is allowed to be
// before we stop trusting it and go looking for somewhere else instead. If a
// player ever gets placed in the middle of the pond, their last known bank
// could be all the way on the other side of it.
const BANK_TOO_FAR_TILES = 5;

// How far outward the search for dry land is allowed to look before giving
// up. A boy who paints the whole map with W should get Pumpkin dropped
// somewhere, not a locked-up laptop.
const MAX_SEARCH_RINGS = 20;

type SwimState = 'land' | 'swimming' | 'sinking' | 'popping';

type Tracked = {
  player: Player;
  state: SwimState;
  /** The middle of the last dry tile this player stood on, in world dots. */
  bank: { x: number; y: number };
};

export class WaterSystem {
  private scene: Phaser.Scene;
  private map: LoadedMap;
  private swimmer: Tracked;
  private sinker: Tracked;

  constructor(scene: Phaser.Scene, map: LoadedMap, swimmer: Player, sinker: Player) {
    this.scene = scene;
    this.map = map;
    this.swimmer = { player: swimmer, state: 'land', bank: { x: swimmer.x, y: swimmer.y } };
    this.sinker = { player: sinker, state: 'land', bank: { x: sinker.x, y: sinker.y } };
  }

  update() {
    this.updateSwimmer(this.swimmer);
    this.updateSinker(this.sinker);
  }

  /** The swimmer just needs `inWater` kept up to date - Player does the rest. */
  private updateSwimmer(t: Tracked) {
    const { player } = t;
    const body = player.body as Phaser.Physics.Arcade.Body;
    const inWater = isWaterAt(this.map, body.center.x, body.center.y);

    player.inWater = inWater;
    if (inWater) {
      t.state = 'swimming';
    } else {
      t.state = 'land';
      t.bank = this.tileMiddle(player.x, player.y);
    }
  }

  private updateSinker(t: Tracked) {
    // 'sinking' and 'popping' are entirely driven by the tween and the timer
    // started in startSinking() - leave them alone until that finishes.
    if (t.state !== 'land') return;

    const { player } = t;
    const body = player.body as Phaser.Physics.Arcade.Body;
    const inWater = isWaterAt(this.map, body.center.x, body.center.y);

    if (inWater) {
      this.startSinking(t);
    } else {
      t.bank = this.tileMiddle(player.x, player.y);
    }
  }

  private startSinking(t: Tracked) {
    const { player, bank } = t;
    const scene = this.scene;
    const body = player.body as Phaser.Physics.Arcade.Body;
    const destination = this.recoverySpot(bank, player.x, player.y);

    t.state = 'sinking';
    // Sinking and popping both count as "keys do nothing", for the whole trip.
    player.heldStillUntil = scene.time.now + SINK_TIME + POP_TIME;
    player.anims.play(`${player.options.key}-swim`, true); // the bubbles, for her

    scene.tweens.add({
      targets: player,
      scale: 0,
      duration: SINK_TIME,
      ease: 'Quad.easeIn',
      onStart: () => {
        body.enable = false;
      },
      onComplete: () => {
        t.state = 'popping';
        scene.time.delayedCall(POP_TIME, () => this.backToNormal(t, destination));
      },
    });
  }

  private backToNormal(t: Tracked, destination: { x: number; y: number }) {
    const { player } = t;
    const body = player.body as Phaser.Physics.Arcade.Body;

    // The Phaser trap: an Arcade body recomputes its size from scaleX/scaleY
    // every step, so tweening `scale` on a sprite with a live body silently
    // shrinks its collision box. Put the scale back BEFORE turning the body
    // on again, and use body.reset to move and stop them dead in one call.
    player.setScale(1);
    body.enable = true;
    body.reset(destination.x, destination.y);

    player.anims.stop();
    player.setFrame(0);
    t.state = 'land';
    t.bank = destination;
    player.say(PHEW_TEXT, 'phew');
  }

  /** The middle of the tile under this world position, in world dots. */
  private tileMiddle(x: number, y: number): { x: number; y: number } {
    const across = Math.floor(x / TILE_SIZE);
    const down = Math.floor(y / TILE_SIZE);
    return { x: across * TILE_SIZE + TILE_SIZE / 2, y: down * TILE_SIZE + TILE_SIZE / 2 };
  }

  /**
   * Where to put someone back on dry land. Three layers, so it is never
   * possible to get stuck:
   *   1. The last dry tile they stood on, if that is not absurdly far away.
   *   2. Otherwise, ring-search outward from where they went under, for the
   *      nearest tile that is neither water nor solid.
   *   3. Failing both of those, the remembered spot anyway - not perfect, but
   *      better than leaving them in the pond forever.
   */
  private recoverySpot(bank: { x: number; y: number }, sinkX: number, sinkY: number) {
    const bankTile = { x: Math.floor(bank.x / TILE_SIZE), y: Math.floor(bank.y / TILE_SIZE) };
    const sinkTile = { x: Math.floor(sinkX / TILE_SIZE), y: Math.floor(sinkY / TILE_SIZE) };
    const tilesAway = Math.hypot(bankTile.x - sinkTile.x, bankTile.y - sinkTile.y);

    if (tilesAway <= BANK_TOO_FAR_TILES) return bank;

    const found = this.nearestDryTile(sinkTile);
    if (found) {
      return { x: found.x * TILE_SIZE + TILE_SIZE / 2, y: found.y * TILE_SIZE + TILE_SIZE / 2 };
    }

    return bank;
  }

  private nearestDryTile(center: { x: number; y: number }) {
    for (let ring = 1; ring <= MAX_SEARCH_RINGS; ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue; // just the edge of this ring
          const x = center.x + dx;
          const y = center.y + dy;
          const kind = this.map.kindAt(x, y);
          if (kind && !kind.solid && !kind.water) return { x, y };
        }
      }
    }
    return undefined;
  }
}
