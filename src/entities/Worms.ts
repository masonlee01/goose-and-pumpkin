import Phaser from 'phaser';
import {
  MAX_MUD_PATCHES,
  MUD_SPLAT_FADE_TIME,
  MUD_SPLAT_LIFETIME,
  MUD_SPLAT_MAX_INTERVAL,
  MUD_SPLAT_MIN_INTERVAL,
  TILE_SIZE,
  WORM_COUNT,
  WORM_MAX_TURN_TIME,
  WORM_MIN_TURN_TIME,
  WORM_SPEED,
} from '../config';
import { type LoadedMap } from '../world/loadMap';

/**
 * Worms that wander the grass and leave a trail of fading mud splats.
 *
 * Like Fish, a worm has NO physics body - update() just nudges its picture
 * around by hand, so it can never block anyone's movement.
 */

type OneWorm = {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  nextTurnAt: number;
  nextSplatAt: number;
};

export class Worms {
  private scene: Phaser.Scene;
  private map: LoadedMap;
  private worms: OneWorm[] = [];
  private mudPatches: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, map: LoadedMap) {
    this.scene = scene;
    this.map = map;

    if (!scene.textures.exists('worm')) return;

    // A bounded search, not a while loop - a boy who fills meadow.txt with W
    // should end up with zero worms, not a locked-up laptop.
    for (let tries = 0; tries < 50 && this.worms.length < WORM_COUNT; tries++) {
      const across = Phaser.Math.Between(0, map.widthInTiles - 1);
      const down = Phaser.Math.Between(0, map.heightInTiles - 1);
      if (!this.isOpenGround(across * TILE_SIZE + TILE_SIZE / 2, down * TILE_SIZE + TILE_SIZE / 2)) continue;

      const x = across * TILE_SIZE + TILE_SIZE / 2;
      const y = down * TILE_SIZE + TILE_SIZE / 2;
      const sprite = scene.add.sprite(x, y, 'worm').setDepth(6);
      this.worms.push({
        sprite,
        vx: 0,
        vy: 0,
        nextTurnAt: 0,
        nextSplatAt: scene.time.now + Phaser.Math.Between(MUD_SPLAT_MIN_INTERVAL, MUD_SPLAT_MAX_INTERVAL),
      });
    }
  }

  private isOpenGround(x: number, y: number): boolean {
    const kind = this.map.kindAt(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
    return !!kind && !kind.solid && !kind.water;
  }

  update(time: number, delta: number) {
    const distance = (WORM_SPEED * delta) / 1000;

    for (const worm of this.worms) {
      if (time >= worm.nextTurnAt) {
        const angle = Math.random() * Math.PI * 2;
        worm.vx = Math.cos(angle);
        worm.vy = Math.sin(angle);
        worm.nextTurnAt = time + Phaser.Math.Between(WORM_MIN_TURN_TIME, WORM_MAX_TURN_TIME);
      }

      const nextX = worm.sprite.x + worm.vx * distance;
      const nextY = worm.sprite.y + worm.vy * distance;
      if (this.isOpenGround(nextX, worm.sprite.y)) {
        worm.sprite.x = nextX;
      } else {
        worm.vx = -worm.vx;
      }
      if (this.isOpenGround(worm.sprite.x, nextY)) {
        worm.sprite.y = nextY;
      } else {
        worm.vy = -worm.vy;
      }

      worm.sprite.setFlipX(worm.vx < 0);
      worm.sprite.setFrame(Math.floor(time / 250) % 2);

      if (time >= worm.nextSplatAt) {
        this.dropMud(worm.sprite.x, worm.sprite.y);
        worm.nextSplatAt = time + Phaser.Math.Between(MUD_SPLAT_MIN_INTERVAL, MUD_SPLAT_MAX_INTERVAL);
      }
    }
  }

  private dropMud(x: number, y: number) {
    if (this.mudPatches.length >= MAX_MUD_PATCHES) return;

    const variant = Phaser.Math.Between(0, 2); // three variants, so a trail is not a row of identical stamps
    const mud = this.scene.add.sprite(x, y, 'mud', variant).setDepth(1);
    this.mudPatches.push(mud);

    this.scene.tweens.add({
      targets: mud,
      alpha: 0,
      delay: MUD_SPLAT_LIFETIME,
      duration: MUD_SPLAT_FADE_TIME,
      onComplete: () => {
        mud.destroy();
        // Splice it out here, not just destroy it - otherwise this array
        // grows all afternoon even though the sprites are long gone.
        const index = this.mudPatches.indexOf(mud);
        if (index !== -1) this.mudPatches.splice(index, 1);
      },
    });
  }

  /** What the checker reads. */
  positions() {
    return this.worms.map((w) => ({ x: w.sprite.x, y: w.sprite.y }));
  }

  mudPatchCount() {
    return this.mudPatches.length;
  }
}
