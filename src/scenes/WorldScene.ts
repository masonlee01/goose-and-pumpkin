import Phaser from 'phaser';
import meadowText from '../world/maps/meadow.txt?raw';
import { loadMap, type LoadedMap } from '../world/loadMap';
import { SIGNS } from '../world/signs';
import { Player } from '../entities/Player';
import { Fish } from '../entities/Fish';
import { Worms } from '../entities/Worms';
import { Piranhas } from '../entities/Piranhas';
import { TwoPlayerCamera } from '../systems/camera';
import { WaterSystem } from '../systems/water';
import { playSound } from '../systems/sounds';
import {
  BEAR_HONK_DISTANCE,
  BOUNCE_TEXT,
  GOOSE_SPEED,
  GOOSE_SWIM_SPEED,
  HONK_TEXT,
  LAMP_SHADE_BOB_HEIGHT,
  LAMP_SHADE_BOB_TIME,
  LAMP_SHADE_FOUND_TEXT,
  LAMP_SHADE_POP_TIME,
  LAMP_SHADE_SPARKLE_COUNT,
  LAMP_SHADES_ALL_FOUND_TEXT,
  PUMPKIN_SPEED,
  TILE_SIZE,
} from '../config';

/** How close you have to stand to a signpost before you can read it. */
const READING_DISTANCE = 24;

export class WorldScene extends Phaser.Scene {
  private map!: LoadedMap;
  private goose!: Player;
  private pumpkin!: Player;
  private followCamera!: TwoPlayerCamera;
  private waterSystem!: WaterSystem;
  private fish!: Fish;
  private worms!: Worms;
  private piranhas!: Piranhas;
  private lampShades: Phaser.Physics.Arcade.Sprite[] = [];
  private lampShadesFound = 0;
  private lampShadesTotal = 0;
  private bearSpots: Array<{ across: number; down: number }> = [];
  private piranhaSpots: Array<{ across: number; down: number }> = [];
  private isNight = false;

  constructor() {
    super('World');
  }

  create() {
    this.map = loadMap(this, meadowText);
    this.map.ground.setDepth(0);
    this.map.objects.setDepth(5);

    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    this.goose = new Player(this, ...this.startPosition(18, 3), {
      key: 'goose',
      displayName: 'Goose',
      speed: GOOSE_SPEED,
      swimSpeed: GOOSE_SWIM_SPEED,
      tagColour: '#ffffff',
      shoutText: HONK_TEXT,
      soundName: 'honk',
    });

    this.pumpkin = new Player(this, ...this.startPosition(20, 3), {
      key: 'pumpkin',
      displayName: 'Pumpkin',
      speed: PUMPKIN_SPEED,
      tagColour: '#ffc46b',
      shoutText: BOUNCE_TEXT,
      soundName: 'boing',
    });

    for (const player of [this.goose, this.pumpkin]) {
      player.setDepth(10);
      this.physics.add.collider(player, this.map.ground);
    }
    // They bump into each other too - which is, obviously, the funniest part.
    this.physics.add.collider(this.goose, this.pumpkin);

    this.setUpControls();

    this.waterSystem = new WaterSystem(this, this.map, this.goose, this.pumpkin);
    this.spawnLampShades();
    this.spawnBears();
    this.fish = new Fish(this, this.map, [this.goose, this.pumpkin]);
    this.worms = new Worms(this, this.map);
    this.piranhas = new Piranhas(this, this.map, [this.goose, this.pumpkin]);
    this.piranhaSpots = this.map.spotsOf('!');

    this.followCamera = new TwoPlayerCamera(this, [this.goose, this.pumpkin]);
    this.followCamera.setBounds(this.map.widthInPixels, this.map.heightInPixels);

    this.scene.launch('UI');
  }

  /** Middle of the tile at this across/down position, in world dots. */
  private startPosition(across: number, down: number): [number, number] {
    return [across * TILE_SIZE + TILE_SIZE / 2, down * TILE_SIZE + TILE_SIZE / 2];
  }

  private setUpControls() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    // Stop the arrow keys from scrolling the web page underneath the game.
    keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE,W,A,S,D,F,FORWARD_SLASH');

    const K = Phaser.Input.Keyboard.KeyCodes;

    this.goose.setControls({
      up: keyboard.addKey(K.W),
      down: keyboard.addKey(K.S),
      left: keyboard.addKey(K.A),
      right: keyboard.addKey(K.D),
      interact: keyboard.addKey(K.F),
    });

    this.pumpkin.setControls({
      up: keyboard.addKey(K.UP),
      down: keyboard.addKey(K.DOWN),
      left: keyboard.addKey(K.LEFT),
      right: keyboard.addKey(K.RIGHT),
      interact: keyboard.addKey(K.FORWARD_SLASH),
    });
  }

  update(time: number, delta: number) {
    // Runs first, so stepping into the pond slows Goose down on this same frame.
    this.waterSystem.update();

    for (const player of [this.goose, this.pumpkin]) {
      player.handleMovement();
      if (player.justPressedInteract()) this.doAction(player);
    }

    this.fish.update(time, delta);
    this.worms.update(time, delta);
    this.piranhas.update();

    this.followCamera.update();
  }

  /**
   * What happens when someone presses their action key: sign, then bear,
   * then just a shout. Keep this a flat ladder of ifs with early returns -
   * three branches is a list, not a dispatch problem, so resist turning it
   * into anything cleverer as more things get added here.
   */
  private doAction(player: Player) {
    const sign = this.nearbySign(player);
    if (sign) {
      this.events.emit('show-message', sign.says);
      return;
    }

    const bear = this.nearbyBear(player);
    if (bear) {
      this.toggleNight(player);
      return;
    }

    player.say();
  }

  private nearbySign(player: Player) {
    return SIGNS.find((sign) => {
      const x = sign.across * TILE_SIZE + TILE_SIZE / 2;
      const y = sign.down * TILE_SIZE + TILE_SIZE / 2;
      return Phaser.Math.Distance.Between(player.x, player.y, x, y) < READING_DISTANCE;
    });
  }

  private nearbyBear(player: Player) {
    return this.bearSpots.find((spot) => {
      const x = spot.across * TILE_SIZE + TILE_SIZE / 2;
      const y = spot.down * TILE_SIZE + TILE_SIZE / 2;
      return Phaser.Math.Distance.Between(player.x, player.y, x, y) < BEAR_HONK_DISTANCE;
    });
  }

  /** A `P` stands a bear sprite at the bottom of his tile; the tile itself is `solid`. */
  private spawnBears() {
    this.bearSpots = this.map.spotsOf('P');

    for (const spot of this.bearSpots) {
      const x = spot.across * TILE_SIZE + TILE_SIZE / 2;
      const y = spot.down * TILE_SIZE + TILE_SIZE;
      this.add.image(x, y, 'bear').setOrigin(0.5, 1).setDepth(9);
    }
  }

  /** Honk near a bear and the sun goes to bed; honk again and it comes back. */
  private toggleNight(player: Player) {
    player.say(); // their own honk or boing, same as always
    playSound('growl'); // the bear, growling back
    this.isNight = !this.isNight;
    this.events.emit('night', this.isNight);
  }

  // ---------------------------------------------------------------------
  // Lamp shades: something to find, with a shared counter.
  //
  // The World -> UI contract, in one place so it never drifts out of date:
  //
  //   Event on `world.events` | Args           | When
  //   ------------------------|----------------|----------------------------
  //   show-message            | text           | reading a sign, or finding
  //                           |                | the very last lamp shade
  //   lamp-shades              | found, total   | a lamp shade is picked up
  //   night                    | on: boolean    | the bear flips the sun
  //
  // WorldScene.create() finishes before UIScene.create() runs, so anything
  // emitted while the world is being built is shouted into an empty room.
  // UIScene therefore PULLS the opening numbers via getLampShadeCounts() when
  // it wakes, and LISTENS for `lamp-shades` and `night` after that for
  // updates. Night needs no pull - it always starts as day.
  // ---------------------------------------------------------------------

  /** L and l in the map become sprites, not tiles, because only a sprite can bob and pop. */
  private spawnLampShades() {
    const spots = [...this.map.spotsOf('L'), ...this.map.spotsOf('l')];
    this.lampShadesTotal = spots.length;

    for (const spot of spots) {
      const x = spot.across * TILE_SIZE + TILE_SIZE / 2;
      const y = spot.down * TILE_SIZE + TILE_SIZE / 2;
      const shade = this.physics.add.sprite(x, y, 'lampshade').setDepth(6);

      // Bob up and down, and pulse a little bigger and smaller, forever.
      this.tweens.add({
        targets: shade,
        y: y - LAMP_SHADE_BOB_HEIGHT,
        scale: 1.15,
        duration: LAMP_SHADE_BOB_TIME,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.lampShades.push(shade);
    }

    // overlap, not collider - you walk straight over a lamp shade to grab it.
    this.physics.add.overlap(
      [this.goose, this.pumpkin],
      this.lampShades,
      (playerObj, shadeObj) => {
        this.collectLampShade(playerObj as Player, shadeObj as Phaser.Physics.Arcade.Sprite);
      },
      undefined,
      this,
    );
  }

  /** Called whenever the game notices someone standing on a lamp shade. */
  private collectLampShade(player: Player, shade: Phaser.Physics.Arcade.Sprite) {
    // The overlap callback fires every single frame you stand on it - this is
    // what stops one lamp shade being counted over and over.
    if (!shade.active) return;
    shade.disableBody(true, false); // stop it overlapping again, but keep it visible for the pop tween

    this.lampShadesFound++;
    player.say(LAMP_SHADE_FOUND_TEXT, 'pickup');
    this.sparkle(shade.x, shade.y);

    this.tweens.add({
      targets: shade,
      scale: 0,
      alpha: 0,
      duration: LAMP_SHADE_POP_TIME,
      ease: 'Back.easeIn',
      onComplete: () => {
        shade.destroy();
        const index = this.lampShades.indexOf(shade);
        if (index !== -1) this.lampShades.splice(index, 1);
      },
    });

    this.events.emit('lamp-shades', this.lampShadesFound, this.lampShadesTotal);
    if (this.lampShadesFound === this.lampShadesTotal) {
      this.events.emit('show-message', LAMP_SHADES_ALL_FOUND_TEXT);
    }
  }

  /** A little ring of sparkles where a lamp shade was just found - no particle system needed. */
  private sparkle(x: number, y: number) {
    for (let i = 0; i < LAMP_SHADE_SPARKLE_COUNT; i++) {
      const angle = (i / LAMP_SHADE_SPARKLE_COUNT) * Math.PI * 2;
      const dot = this.add.rectangle(x, y, 2, 2, 0xfff6d8).setDepth(31);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * 14,
        y: y + Math.sin(angle) * 14,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  /** What UIScene reads when it wakes up, to draw the counter's opening numbers. */
  getLampShadeCounts() {
    return { found: this.lampShadesFound, total: this.lampShadesTotal };
  }
}
