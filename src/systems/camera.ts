import Phaser from 'phaser';
import { CAMERA_SMOOTHNESS, CAMERA_ZOOM_CLOSE, CAMERA_ZOOM_FAR } from '../config';

/**
 * The two-player camera.
 *
 * With two people sharing one keyboard, the camera is what decides whether
 * playing together is fun or a fight. So instead of following one character,
 * it sits exactly between BOTH of them, and quietly zooms out when they run
 * apart so that neither brother can ever drag the other one off the screen.
 */
export class TwoPlayerCamera {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private targets: Phaser.GameObjects.Components.Transform[];
  private zoom: number;
  private lookX: number;
  private lookY: number;

  constructor(scene: Phaser.Scene, targets: Phaser.GameObjects.Components.Transform[]) {
    this.camera = scene.cameras.main;
    this.targets = targets;
    this.zoom = CAMERA_ZOOM_CLOSE;
    this.camera.setZoom(this.zoom);

    // Start already looking at them, so the game does not open with a swoop
    // across the map every single time.
    this.lookX = targets[0].x;
    this.lookY = targets[0].y;
    this.camera.centerOn(this.lookX, this.lookY);
  }

  /** Keep the camera inside the world so we never see past the edge of the map. */
  setBounds(width: number, height: number) {
    this.camera.setBounds(0, 0, width, height);
  }

  update() {
    const xs = this.targets.map((t) => t.x);
    const ys = this.targets.map((t) => t.y);

    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;

    // How far apart are they? Add padding so nobody is right on the edge.
    const spreadX = Math.max(...xs) - Math.min(...xs) + 120;
    const spreadY = Math.max(...ys) - Math.min(...ys) + 90;

    // Work out the closest zoom that still fits both of them on screen...
    const fitZoom = Math.min(this.camera.width / spreadX, this.camera.height / spreadY);
    // ...but never closer than CLOSE, and never further out than FAR.
    const wantedZoom = Phaser.Math.Clamp(fitZoom, CAMERA_ZOOM_FAR, CAMERA_ZOOM_CLOSE);

    // Slide towards the target instead of snapping, so it feels smooth.
    this.zoom = Phaser.Math.Linear(this.zoom, wantedZoom, CAMERA_SMOOTHNESS);
    this.camera.setZoom(this.zoom);

    // Slide the point we are looking at towards the middle of the two of them,
    // then let Phaser put the camera there. (Use centerOn rather than setting
    // scrollX/scrollY by hand - Phaser's scroll values are measured before the
    // zoom is applied, which makes doing this yourself surprisingly easy to
    // get wrong.)
    this.lookX = Phaser.Math.Linear(this.lookX, midX, CAMERA_SMOOTHNESS);
    this.lookY = Phaser.Math.Linear(this.lookY, midY, CAMERA_SMOOTHNESS);
    this.camera.centerOn(this.lookX, this.lookY);
  }
}
