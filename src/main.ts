import Phaser from 'phaser';
import { BACKGROUND_COLOUR, GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';

/**
 * This file starts the game up. You will rarely need to change it.
 *
 * The numbers it uses come from src/config.ts - that is the fun file to poke at.
 */
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOUR,

  // Keeps the chunky pixel art crisp instead of blurring it when it stretches.
  pixelArt: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: {
      // This is a top-down game, so nothing falls downwards. Set y to 800 if
      // you ever want to see what happens when gravity turns on. (It is silly.)
      gravity: { x: 0, y: 0 },
      debug: false, // set to true to see the invisible collision boxes
    },
  },

  scene: [BootScene, WorldScene, UIScene],
});

// Hand the game to the browser window under the name __game. Two things use it:
//   * `npm run check:game`, which plays the game by itself and checks it works
//   * you, if you open the browser console (F12) and want to poke at things,
//     e.g.  __game.scene.getScene('World').goose.x = 100
(window as unknown as { __game: Phaser.Game }).__game = game;
