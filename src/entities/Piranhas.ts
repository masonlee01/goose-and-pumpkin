import Phaser from 'phaser';
import {
  PIRANHA_DOWN_TIME,
  PIRANHA_OW_TEXT,
  PIRANHA_SAFE_TIME,
  PIRANHA_SHOVE_DISTANCE,
  PIRANHA_SHOVE_TIME,
  PIRANHA_UP_TIME,
  PIRANHA_WARN_TIME,
  TILE_SIZE,
} from '../config';
import type { Player } from './Player';
import { isDangerAt, type LoadedMap } from '../world/loadMap';

/**
 * Piranha plants, popping up out of their mud pots to snap at whoever is
 * standing on one. Like Fish and Worms, a plant has NO physics body - it
 * cannot touch the collision system Player depends on, so it can never
 * accidentally block anyone.
 *
 * Each plant runs its own two-state timer off scene.time.now: `down`
 * (hidden, completely safe) then `up` (visible - a brief "here it comes"
 * peek, then the snap). The bite is only checked on the single frame it
 * snaps from peeking to fully open, which is what makes it a snap rather
 * than a damage zone, and means one pop can only ever bonk you once.
 *
 * The shove that follows a bite can never wedge anyone, for these reasons:
 *   1. The destination is proven clear BEFORE the tween starts, by probing
 *      outward in quarter-tile steps and stopping at the first blocked step
 *      - so the whole flight path is clear, not just the far end.
 *   2. The probe uses isDangerAt, which counts water and off-map as blocked,
 *      so nobody ever gets shoved into the pond or off the edge of the world.
 *   3. Worst case, the probe finds nothing clear at all and you simply don't
 *      move - you shout OW and stay exactly where you were.
 *   4. heldStillUntil is a TIMESTAMP, so control always comes back on its
 *      own, however the shove tween turns out.
 *   5. The `!` square itself is not solid and the plant has no body, so
 *      standing on one is always fine - you can walk off it any time.
 *   6. PIRANHA_SAFE_TIME gives a moment of immunity after every bite, so two
 *      plants near each other can't volley you back and forth.
 */

type PlantState = 'down' | 'up';

type Plant = {
  sprite: Phaser.GameObjects.Sprite;
  tileX: number;
  tileY: number;
  state: PlantState;
  /** When this plant next flips from down->up or up->down. */
  changeAt: number;
  /** So the single snap frame can only ever bite once per pop-up. */
  hasBitten: boolean;
};

export class Piranhas {
  private scene: Phaser.Scene;
  private map: LoadedMap;
  private players: Player[];
  private plants: Plant[] = [];
  private lastBiteAt = new Map<Player, number>();

  constructor(scene: Phaser.Scene, map: LoadedMap, players: Player[]) {
    this.scene = scene;
    this.map = map;
    this.players = players;

    // A fresh clone that forgot to run `npm run art` should still run.
    if (!scene.textures.exists('piranha')) return;

    const spots = map.spotsOf('!');
    spots.forEach((spot, index) => {
      const x = spot.across * TILE_SIZE + TILE_SIZE / 2;
      const y = spot.down * TILE_SIZE + TILE_SIZE;
      const sprite = scene.add.sprite(x, y, 'piranha', 0).setOrigin(0.5, 1).setDepth(8).setVisible(false);
      this.plants.push({
        sprite,
        tileX: spot.across,
        tileY: spot.down,
        state: 'down',
        // Offset by position, so a row of plants ripples rather than firing
        // all at once.
        changeAt: scene.time.now + PIRANHA_DOWN_TIME + index * 350,
        hasBitten: false,
      });
    });
  }

  update() {
    const now = this.scene.time.now;
    for (const plant of this.plants) {
      if (now >= plant.changeAt) this.flip(plant, now);
      if (plant.state === 'up') this.animateUp(plant, now);
    }
  }

  private flip(plant: Plant, now: number) {
    if (plant.state === 'down') {
      plant.state = 'up';
      plant.hasBitten = false;
      plant.sprite.setVisible(true);
      plant.sprite.setFrame(0);
      plant.changeAt = now + PIRANHA_UP_TIME;
    } else {
      plant.state = 'down';
      plant.sprite.setVisible(false);
      plant.changeAt = now + PIRANHA_DOWN_TIME;
    }
  }

  private animateUp(plant: Plant, now: number) {
    const upSince = plant.changeAt - PIRANHA_UP_TIME;
    const elapsed = now - upSince;
    const remaining = plant.changeAt - now;

    if (elapsed < PIRANHA_WARN_TIME) {
      plant.sprite.setFrame(0); // peeking - your warning it's about to snap
      return;
    }

    // The single frame it snaps from peeking to fully open.
    if (!plant.hasBitten) {
      plant.hasBitten = true;
      this.bite(plant);
    }

    if (remaining < 300) {
      plant.sprite.setFrame(3); // closing back up
    } else {
      plant.sprite.setFrame(Math.floor(now / 150) % 2 === 0 ? 1 : 2); // chomping
    }
  }

  private bite(plant: Plant) {
    for (const player of this.players) {
      const tileX = Math.floor(player.x / TILE_SIZE);
      const tileY = Math.floor(player.y / TILE_SIZE);
      if (tileX !== plant.tileX || tileY !== plant.tileY) continue;

      const lastBite = this.lastBiteAt.get(player) ?? -Infinity;
      if (this.scene.time.now - lastBite < PIRANHA_SAFE_TIME) continue;

      this.lastBiteAt.set(player, this.scene.time.now);
      this.shove(player, plant);
    }
  }

  private shove(player: Player, plant: Plant) {
    const plantX = plant.tileX * TILE_SIZE + TILE_SIZE / 2;
    const plantY = plant.tileY * TILE_SIZE + TILE_SIZE / 2;

    let dx = player.x - plantX;
    let dy = player.y - plantY;
    const length = Math.hypot(dx, dy);
    if (length < 1) {
      // Dead centre of the tile - has to go somewhere, so push south.
      dx = 0;
      dy = 1;
    } else {
      dx /= length;
      dy /= length;
    }

    const destination = this.clearDestination(player, dx, dy);
    player.heldStillUntil = this.scene.time.now + PIRANHA_SHOVE_TIME;
    player.say(PIRANHA_OW_TEXT, 'ow');

    // A tween on x/y, not velocity - handleMovement() calls setVelocity
    // unconditionally every frame, so any impulse we gave it would be wiped
    // before the next physics step anyway.
    this.scene.tweens.add({
      targets: player,
      x: destination.x,
      y: destination.y,
      duration: PIRANHA_SHOVE_TIME,
      ease: 'Quad.easeOut',
    });
  }

  private clearDestination(player: Player, dx: number, dy: number) {
    const step = TILE_SIZE / 4;
    const maxSteps = Math.round(PIRANHA_SHOVE_DISTANCE / step);
    let clearX = player.x;
    let clearY = player.y;

    for (let i = 1; i <= maxSteps; i++) {
      const testX = player.x + dx * step * i;
      const testY = player.y + dy * step * i;
      // Three points across the feet, matching the player body's
      // setSize(10,7)/setOffset(3,9) - break at the first blocked step, so
      // the whole flight path is proven clear, not just the endpoint.
      const blocked = [-5, 0, 5].some((offset) => isDangerAt(this.map, testX + offset, testY + 4));
      if (blocked) break;
      clearX = testX;
      clearY = testY;
    }

    return { x: clearX, y: clearY };
  }
}
