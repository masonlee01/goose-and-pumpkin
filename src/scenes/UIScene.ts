import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

/**
 * The layer that sits on top of the world: the controls reminder at the start,
 * and the box that appears when somebody reads a sign.
 *
 * This scene never moves with the camera, so anything added here stays put on
 * screen no matter where Goose and Pumpkin wander off to.
 */
export class UIScene extends Phaser.Scene {
  private messageBox?: Phaser.GameObjects.Container;

  constructor() {
    super('UI');
  }

  create() {
    this.showControlsHint();

    // Listen for the world telling us somebody read a sign.
    const world = this.scene.get('World');
    world.events.on('show-message', this.showMessage, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      world.events.off('show-message', this.showMessage, this);
    });
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
