import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { LEGEND, UNKNOWN_LETTER, type TileKind } from './legend';

/**
 * Turns a map written as letters in a .txt file into a real world you can
 * walk around in.
 *
 * Lines starting with # are notes for humans and are ignored.
 * Every other line is one row of the world.
 */

export type LoadedMap = {
  ground: Phaser.Tilemaps.TilemapLayer;
  objects: Phaser.Tilemaps.TilemapLayer;
  widthInTiles: number;
  heightInTiles: number;
  widthInPixels: number;
  heightInPixels: number;
  /** Look up what is at a tile position, e.g. to read a sign. */
  kindAt: (tileX: number, tileY: number) => TileKind | undefined;
  /** Every square where a particular letter appears, e.g. every 'L'. */
  spotsOf: (letter: string) => Array<{ across: number; down: number }>;
};

/** Strip the human notes and blank lines, leaving just the picture. */
export function parseMapText(text: string): string[] {
  const rows = text
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => !line.trimStart().startsWith('#') && line.trim().length > 0);

  if (rows.length === 0) {
    throw new Error('That map file is empty - it needs at least one row of letters.');
  }

  // Rows are allowed to be ragged; we pad the short ones with grass so a
  // stray missing character never crashes the game mid-play-session.
  const width = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(width, 'g'));
}

export function loadMap(scene: Phaser.Scene, mapText: string): LoadedMap {
  const rows = parseMapText(mapText);
  const heightInTiles = rows.length;
  const widthInTiles = rows[0].length;

  const kinds: TileKind[][] = rows.map((row) =>
    [...row].map((letter) => LEGEND[letter] ?? UNKNOWN_LETTER),
  );

  const groundData = kinds.map((row) => row.map((k) => k.ground));
  const objectData = kinds.map((row) => row.map((k) => (k.object === undefined ? -1 : k.object)));

  const map = scene.make.tilemap({
    data: groundData,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
  });

  // `0, 0` at the end means the tileset image has no margin and no spacing
  // between tiles, which is how our tileset.png is packed.
  const tileset = map.addTilesetImage('tiles', 'tiles', TILE_SIZE, TILE_SIZE, 0, 0);
  if (!tileset) throw new Error('Could not find the tileset image called "tiles".');

  const ground = map.createLayer(0, tileset, 0, 0);
  if (!ground) throw new Error('Could not build the ground layer.');

  // The objects (trees, bushes, signs) live on a second layer sitting on top
  // of the ground, so a tree can stand on grass without covering it up.
  const objectMap = scene.make.tilemap({
    data: objectData,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
  });
  const objectTileset = objectMap.addTilesetImage('tiles', 'tiles', TILE_SIZE, TILE_SIZE, 0, 0);
  if (!objectTileset) throw new Error('Could not find the tileset image called "tiles".');
  const objects = objectMap.createLayer(0, objectTileset, 0, 0);
  if (!objects) throw new Error('Could not build the objects layer.');

  // Mark the squares that Goose and Pumpkin should bump into. We put the
  // collision on the GROUND layer for every solid letter - that is trees,
  // bushes, fences and signposts, the solid thing always being an object
  // standing on the floor. Water is NOT in this list: it is not `solid`, it
  // is `water`, and src/systems/water.ts is what does something special with
  // it instead of just bumping into it.
  for (let y = 0; y < heightInTiles; y++) {
    for (let x = 0; x < widthInTiles; x++) {
      if (kinds[y][x].solid) {
        ground.getTileAt(x, y)?.setCollision(true);
      }
    }
  }

  return {
    ground,
    objects,
    widthInTiles,
    heightInTiles,
    widthInPixels: widthInTiles * TILE_SIZE,
    heightInPixels: heightInTiles * TILE_SIZE,
    kindAt: (tileX, tileY) => kinds[tileY]?.[tileX],
    spotsOf: (letter) => {
      const spots: Array<{ across: number; down: number }> = [];
      for (let down = 0; down < heightInTiles; down++) {
        for (let across = 0; across < widthInTiles; across++) {
          if (rows[down][across] === letter) spots.push({ across, down });
        }
      }
      return spots;
    },
  };
}

/** Turn a spot in world dots into the tile kind underneath it. */
function tileKindAt(map: LoadedMap, x: number, y: number): TileKind | undefined {
  return map.kindAt(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
}

/** Is this spot (in world dots) part of the pond? */
export function isWaterAt(map: LoadedMap, x: number, y: number): boolean {
  return tileKindAt(map, x, y)?.water === true;
}

/**
 * Is this spot somewhere nobody should ever end up? Trees, bushes, fences and
 * signposts - AND the pond, since water is no longer `solid` and a plain
 * solid check would happily fling Pumpkin straight into it - and anywhere off
 * the edge of the map, where kindAt has nothing to tell us at all.
 */
export function isDangerAt(map: LoadedMap, x: number, y: number): boolean {
  const kind = tileKindAt(map, x, y);
  if (!kind) return true;
  return kind.solid === true || kind.water === true;
}
