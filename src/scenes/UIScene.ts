import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, NIGHT_ALPHA, NIGHT_FADE_TIME } from '../config';
import type { WorldScene } from './WorldScene';

/**
 * The layer that sits on top of the world: the controls reminder at the start,
 * the lamp shade counter, the night sheet, and the box that appears when
 * somebody reads a sign.
 *
 * This scene never moves with the camera, so anything added here stays put on
 * screen no matter where Goose and Pumpkin wander off to.
 */
export class UIScene extends Phaser.Scene {
  private messageBox?: Phaser.GameObjects.Container;
  private lampShadeCounter?: Phaser.GameObjects.Text;
  private nightSheet?: Phaser.GameObjects.Rectangle;

  constructor() {
    super('UI');
  }

  create() {
    this.showControlsHint();
    this.showNightSheet();

    // WorldScene.create() has already finished by the time we wake up, so we
    // can safely PULL the opening lamp shade numbers straight off it - then
    // LISTEN for `lamp-shades` after that, for every one picked up later.
    const world = this.scene.get('World') as WorldScene;
    this.showLampShadeCounter(world);

    world.events.on('show-message', this.showMessage, this);
    world.events.on('lamp-shades', this.updateLampShadeCounter, this);
    world.events.on('night', this.setNight, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      world.events.off('show-message', this.showMessage, this);
      world.events.off('lamp-shades', this.updateLampShadeCounter, this);
      world.events.off('night', this.setNight, this);
    });
  }

  /**
   * A dark rectangle covering the whole screen, in UIScene rather than the
   * world. This scene's camera never zooms or scrolls, so - unlike a sheet
   * living in the world - it never needs `1 / camera.zoom` compensation to
   * still cover exactly the screen. Depth -10 keeps it behind the counter
   * and message box, so those stay readable in the dark.
   */
  private showNightSheet() {
    // fillAlpha (the constructor's last argument) is the RECTANGLE's own
    // opacity and stays fixed at 1 here; it is the GameObject's `alpha` -
    // separate from fillAlpha, and what setNight() tweens below - that
    // actually fades it in and out.
    this.nightSheet = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a2a, 1)
      .setAlpha(0)
      .setScrollFactor(0)
      .setDepth(-10);
  }

  private setNight(on: boolean) {
    this.tweens.add({
      targets: this.nightSheet,
      alpha: on ? NIGHT_ALPHA : 0,
      duration: NIGHT_FADE_TIME,
      ease: 'Sine.easeInOut',
    });
  }

  private showLampShadeCounter(world: WorldScene) {
    const { found, total } = world.getLampShadeCounts();
    this.lampShadeCounter = this.add
      .text(GAME_WIDTH - 8, 8, this.lampShadeText(found, total), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#2d1b2ecc',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setDepth(90);
  }

  private updateLampShadeCounter(found: number, total: number) {
    this.lampShadeCounter?.setText(this.lampShadeText(found, total));
  }

  private lampShadeText(found: number, total: number) {
    return `Lamp shades: ${found}/${total}`;
  }

  private showControlsHint() {
    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, 'Goose: W A S D + F     Pumpkin: Arrows + /', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#2d1b2ecc',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);

    // Fade it away once they have had a chance to read it.
    this.tweens.add({
      targets: hint,
      alpha: 0,
      delay: 6000,
      duration: 1200,
      onComplete: () => hint.destroy(),
    });
  }

  private showMessage(text: string) {
    this.messageBox?.destroy();

    const label = this.add
      .text(0, 0, text, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const panel = this.add
      .rectangle(0, 0, label.width + 32, label.height + 24, 0x2d1b2e, 0.92)
      .setStrokeStyle(2, 0xffa322);

    this.messageBox = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, [panel, label])
      .setDepth(100);

    const box = this.messageBox;
    this.time.delayedCall(3200, () => {
      if (this.messageBox !== box) return;
      this.tweens.add({
        targets: box,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          box.destroy();
          if (this.messageBox === box) this.messageBox = undefined;
        },
      });
    });
  }
}
