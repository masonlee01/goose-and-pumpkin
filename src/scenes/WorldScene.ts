import Phaser from 'phaser';
import meadowText from '../world/maps/meadow.txt?raw';
import { loadMap, type LoadedMap } from '../world/loadMap';
import { SIGNS } from '../world/signs';
import { Player } from '../entities/Player';
import { TwoPlayerCamera } from '../systems/camera';
import { WaterSystem } from '../systems/water';
import {
  BOUNCE_TEXT,
  GOOSE_SPEED,
  GOOSE_SWIM_SPEED,
  HONK_TEXT,
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

  update() {
    // Runs first, so stepping into the pond slows Goose down on this same frame.
    this.waterSystem.update();

    for (const player of [this.goose, this.pumpkin]) {
      player.handleMovement();
      if (player.justPressedInteract()) this.doAction(player);
    }
    this.followCamera.update();
  }

  /**
   * What happens when someone presses their action key. If they are standing
   * next to a signpost they read it; otherwise they just shout.
   */
  private doAction(player: Player) {
    const sign = this.nearbySign(player);
    if (sign) {
      this.events.emit('show-message', sign.says);
    } else {
      player.say();
    }
  }

  private nearbySign(player: Player) {
    return SIGNS.find((sign) => {
      const x = sign.across * TILE_SIZE + TILE_SIZE / 2;
      const y = sign.down * TILE_SIZE + TILE_SIZE / 2;
      return Phaser.Math.Distance.Between(player.x, player.y, x, y) < READING_DISTANCE;
    });
  }
}
