import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../config';

/**
 * The very first scene. It loads all the pictures, shows a loading bar while
 * it works, then hands over to the world.
 *
 * ADDING A NEW PICTURE? Load it in `preload` below, then you can use its
 * nickname (the first argument) anywhere else in the game.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.showLoadingBar();

    // The ground, trees, houses and water.
    this.load.image('tiles', 'assets/tiles/tileset.png');

    // Our two heroes. Each picture file is a strip of poses, 16x16 each.
    this.load.spritesheet('goose', 'assets/sprites/goose.png', {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
    this.load.spritesheet('pumpkin', 'assets/sprites/pumpkin.png', {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });

    // A lamp shade to find - just one picture, it doesn't walk anywhere.
    this.load.image('lampshade', 'assets/sprites/lampshade.png');

    // The polar bear - also just one picture. He stands still and watches.
    this.load.image('bear', 'assets/sprites/bear.png');
  }

  create() {
    this.scene.start('World');
  }

  private showLoadingBar() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .text(cx, cy - 30, "Goose and Pumpkin's Adventure", {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const box = this.add.graphics();
    box.fillStyle(0x2d1b2e, 0.8).fillRect(cx - 100, cy, 200, 16);

    const bar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      bar.clear().fillStyle(0xffa322, 1).fillRect(cx - 96, cy + 4, 192 * value, 8);
    });
  }
}
