import Phaser from 'phaser';
import { SHOUT_TIME, SHOW_NAME_TAGS, WALK_FRAME_RATE } from '../config';
import { playSound } from '../systems/sounds';

/**
 * One walking character. We make TWO of these: Goose and Pumpkin.
 *
 * The picture file for each character is a strip of 6 poses:
 *   0 = facing us      1 = facing us, other foot
 *   2 = facing away    3 = facing away, other foot
 *   4 = sideways       5 = sideways, other foot
 * Walking left just draws the sideways pose flipped around.
 */

export type Controls = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
};

export type PlayerOptions = {
  key: string; // which picture file to use, e.g. 'goose'
  displayName: string; // the name shown floating above them
  speed: number;
  swimSpeed?: number; // how fast they move while in the pond, if different
  tagColour: string;
  shoutText: string;
  soundName: string; // which SOUNDS entry in config.ts plays when they shout
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly options: PlayerOptions;
  private controls!: Controls;
  private nameTag?: Phaser.GameObjects.Text;
  private shout?: Phaser.GameObjects.Text;

  /**
   * While something else is moving us - sinking in the pond, or (one day)
   * being shoved by a piranha plant - the keys do nothing for a fraction of
   * a second. It is a TIME, not a switch, so it always wears off by itself.
   * That is what makes it impossible to get stuck.
   */
  heldStillUntil = 0;

  /** Set every frame by src/systems/water.ts. True while standing in the pond. */
  inWater = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: PlayerOptions) {
    super(scene, x, y, options.key, 0);
    this.options = options;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // The collision box is small and down by the feet, so their heads can
    // overlap trees a little. It just looks better that way.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 7);
    body.setOffset(3, 9);
    body.setCollideWorldBounds(true);

    this.createAnimations(scene);

    if (SHOW_NAME_TAGS) {
      this.nameTag = scene.add
        .text(x, y - 12, options.displayName, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: options.tagColour,
          stroke: '#2d1b2e',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(20);
    }
  }

  private createAnimations(scene: Phaser.Scene) {
    const key = this.options.key;
    const directions: Array<[string, number, number]> = [
      ['down', 0, 1],
      ['up', 2, 3],
      ['side', 4, 5],
    ];

    for (const [name, a, b] of directions) {
      const animKey = `${key}-walk-${name}`;
      if (scene.anims.exists(animKey)) continue;
      scene.anims.create({
        key: animKey,
        frames: [{ key, frame: a }, { key, frame: b }],
        frameRate: WALK_FRAME_RATE,
        repeat: -1,
      });
    }

    // Frames 6 and 7 are whatever this character looks like in the pond -
    // Goose swimming, Pumpkin bubbling. See scripts/build-art.mjs.
    const swimKey = `${key}-swim`;
    if (!scene.anims.exists(swimKey)) {
      scene.anims.create({
        key: swimKey,
        frames: [{ key, frame: 6 }, { key, frame: 7 }],
        frameRate: WALK_FRAME_RATE,
        repeat: -1,
      });
    }
  }

  setControls(controls: Controls) {
    this.controls = controls;
  }

  /** Called every single frame by the scene. */
  handleMovement() {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const c = this.controls;

    // Something else has taken the keys away for a moment - e.g. sinking in
    // the pond. Just sit tight until the timestamp above wears off.
    if (this.scene.time.now < this.heldStillUntil) {
      body.setVelocity(0, 0);
      this.followWithNameTag();
      return;
    }

    let vx = 0;
    let vy = 0;
    if (c.left.isDown) vx -= 1;
    if (c.right.isDown) vx += 1;
    if (c.up.isDown) vy -= 1;
    if (c.down.isDown) vy += 1;

    const speed = this.inWater ? (this.options.swimSpeed ?? this.options.speed) : this.options.speed;

    // Without this, walking diagonally would be faster than walking straight.
    const length = Math.hypot(vx, vy);
    if (length > 0) {
      vx = (vx / length) * speed;
      vy = (vy / length) * speed;
    }
    body.setVelocity(vx, vy);

    const key = this.options.key;
    if (this.inWater) {
      // One look, in or out of the pond, no matter which way they are facing -
      // this is a top-down swim, not a walk.
      this.anims.play(`${key}-swim`, true);
    } else if (length === 0) {
      this.anims.stop();
      // Stand still in the pose we were last facing.
      const frame = Number(this.frame.name);
      this.setFrame(frame - (frame % 2));
    } else if (Math.abs(vx) > Math.abs(vy)) {
      this.setFlipX(vx < 0);
      this.anims.play(`${key}-walk-side`, true);
    } else {
      this.setFlipX(false);
      this.anims.play(vy < 0 ? `${key}-walk-up` : `${key}-walk-down`, true);
    }

    this.followWithNameTag();
  }

  private followWithNameTag() {
    this.nameTag?.setPosition(Math.round(this.x), Math.round(this.y) - 10);
    this.shout?.setPosition(Math.round(this.x), Math.round(this.y) - 20);
  }

  /** True on the single frame the interact key is first pressed. */
  justPressedInteract() {
    return Phaser.Input.Keyboard.JustDown(this.controls.interact);
  }

  /** Pop a word above their head for a moment, with a matching sound. */
  say(text: string = this.options.shoutText, sound: string = this.options.soundName) {
    playSound(sound);
    this.shout?.destroy();
    this.shout = this.scene.add
      .text(this.x, this.y - 20, text, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
        stroke: '#2d1b2e',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(30);

    const bubble = this.shout;
    this.scene.tweens.add({
      targets: bubble,
      y: bubble.y - 8,
      alpha: { from: 1, to: 0 },
      duration: SHOUT_TIME,
      ease: 'Quad.easeIn',
      onComplete: () => {
        bubble.destroy();
        if (this.shout === bubble) this.shout = undefined;
      },
    });
  }

  destroy(fromScene?: boolean) {
    this.nameTag?.destroy();
    this.shout?.destroy();
    super.destroy(fromScene);
  }
}
