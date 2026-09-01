import Phaser from 'phaser';
import { FISH_COLOURS, FISH_SCARE_DISTANCE, FISH_SPEED, TILE_SIZE, WATER_TILES_PER_FISH } from '../config';
import type { Player } from './Player';
import { isWaterAt, type LoadedMap } from '../world/loadMap';

/**
 * Fish drifting around the pond.
 *
 * A fish has NO physics body at all - it is just a picture that update()
 * nudges around by hand every frame. That is what makes "must never block
 * movement" true without any collision code to get wrong, and it is why this
 * is a plain class with a plain array in it rather than anything cleverer.
 */

type OneFish = {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
};

export class Fish {
  private scene: Phaser.Scene;
  private map: LoadedMap;
  private players: Player[];
  private fish: OneFish[] = [];

  constructor(scene: Phaser.Scene, map: LoadedMap, players: Player[]) {
    this.scene = scene;
    this.map = map;
    this.players = players;

    // A fresh clone that forgot to run `npm run art` should still work.
    if (!scene.textures.exists('fish')) return;

    const waterSpots = this.allWaterSpots();
    if (waterSpots.length === 0) return;

    // Spawn count auto-derived from how much pond there is, so redrawing the
    // pond in meadow.txt just works without touching any code.
    const count = Math.max(1, Math.round(waterSpots.length / WATER_TILES_PER_FISH));
    for (let i = 0; i < count; i++) {
      const spot = Phaser.Utils.Array.GetRandom(waterSpots);
      const x = spot.across * TILE_SIZE + TILE_SIZE / 2;
      const y = spot.down * TILE_SIZE + TILE_SIZE / 2;
      const angle = Math.random() * Math.PI * 2;
      const sprite = scene.add.sprite(x, y, 'fish').setDepth(1);
      sprite.setTint(Phaser.Utils.Array.GetRandom(FISH_COLOURS));
      this.fish.push({ sprite, vx: Math.cos(angle), vy: Math.sin(angle) });
    }
  }

  private allWaterSpots() {
    const spots: Array<{ across: number; down: number }> = [];
    for (let down = 0; down < this.map.heightInTiles; down++) {
      for (let across = 0; across < this.map.widthInTiles; across++) {
        if (this.map.kindAt(across, down)?.water) spots.push({ across, down });
      }
    }
    return spots;
  }

  update(time: number, delta: number) {
    const distance = (FISH_SPEED * delta) / 1000;

    for (const one of this.fish) {
      const nearest = this.nearestPlayer(one.sprite.x, one.sprite.y);
      if (nearest && Phaser.Math.Distance.Between(one.sprite.x, one.sprite.y, nearest.x, nearest.y) < FISH_SCARE_DISTANCE) {
        // Dart directly away from whoever is closest.
        const away = Phaser.Math.Angle.Between(nearest.x, nearest.y, one.sprite.x, one.sprite.y);
        one.vx = Math.cos(away);
        one.vy = Math.sin(away);
      } else if (Math.random() < 0.015) {
        // Otherwise, every so often, just wander off in a new direction.
        const angle = Math.random() * Math.PI * 2;
        one.vx = Math.cos(angle);
        one.vy = Math.sin(angle);
      }

      // Move each axis separately, only accepting it if the fish stays in
      // water - this is what lets a fish slide along the bank instead of
      // pinning itself in a corner, and it can never leave the pond.
      const nextX = one.sprite.x + one.vx * distance;
      const nextY = one.sprite.y + one.vy * distance;
      if (isWaterAt(this.map, nextX, one.sprite.y)) {
        one.sprite.x = nextX;
      } else {
        one.vx = -one.vx;
      }
      if (isWaterAt(this.map, one.sprite.x, nextY)) {
        one.sprite.y = nextY;
      } else {
        one.vy = -one.vy;
      }

      one.sprite.setFlipX(one.vx < 0);
      one.sprite.setFrame(Math.floor(time / 300) % 2);
    }
  }

  private nearestPlayer(x: number, y: number): Player | undefined {
    let nearest: Player | undefined;
    let nearestDistance = Infinity;
    for (const player of this.players) {
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = player;
      }
    }
    return nearest;
  }

  /** What the checker (and anyone poking at window.__game) reads. */
  positions() {
    return this.fish.map((f) => ({ x: f.sprite.x, y: f.sprite.y }));
  }
}
