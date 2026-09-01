// =============================================================================
//  THE LEGEND
// =============================================================================
//  This is the key that turns the letters in a map file into actual pictures.
//
//  Each letter says up to four things:
//    ground - the picture painted on the floor (grass, dirt, water...)
//    object - an optional thing standing on top of the floor (a tree, a sign...)
//    solid  - true if Goose and Pumpkin should BUMP into it instead of walking through
//    water  - true if it is a pond square: Goose can swim in it, Pumpkin sinks
//
//  The numbers are positions in public/assets/tiles/tileset.png, counting from
//  the top-left corner, going left-to-right then down. The sheet is 12 across,
//  so number 0 is the top-left tile, number 12 is the start of the second row.
//
//  TO ADD A NEW KIND OF SQUARE: add a line here, then use that letter in a map.
// =============================================================================

export type TileKind = {
  ground: number;
  object?: number;
  solid?: boolean;
  water?: boolean;
  name: string;
};

// Handy names for the tiles we use, so the table below reads nicely.
const GRASS = 0;
const GRASS_TUFTY = 1;
const GRASS_FLOWERS = 2;
const DIRT = 40;
const DIRT_SPECKLED = 39;
const GRAVEL = 43;
const WATER = 132; // we drew these two ourselves - see scripts/build-art.mjs
const WATER_SPARKLY = 133;
const TREE_GREEN = 28;
const TREE_ORANGE = 27;
const BUSH = 5;
const MUSHROOMS = 29;
const SIGNPOST = 83;
const FENCE = 82;

export const LEGEND: Record<string, TileKind> = {
  // --- floors you can walk on ---
  ' ': { ground: GRASS, name: 'grass' },
  g: { ground: GRASS_TUFTY, name: 'grass' },
  G: { ground: GRASS, name: 'plain grass' },
  f: { ground: GRASS_FLOWERS, name: 'flowers' },
  '.': { ground: DIRT, name: 'path' },
  ',': { ground: DIRT_SPECKLED, name: 'path' },
  o: { ground: GRAVEL, name: 'gravel' },

  // --- the pond: not solid any more, Goose swims in it and Pumpkin sinks ---
  W: { ground: WATER, water: true, name: 'water' },
  w: { ground: WATER_SPARKLY, water: true, name: 'sparkly water' },

  // --- things standing on the grass ---
  T: { ground: GRASS_TUFTY, object: TREE_GREEN, solid: true, name: 'tree' },
  t: { ground: GRASS_TUFTY, object: TREE_ORANGE, solid: true, name: 'orange tree' },
  b: { ground: GRASS_TUFTY, object: BUSH, solid: true, name: 'bush' },
  F: { ground: GRASS_TUFTY, object: FENCE, solid: true, name: 'fence' },
  s: { ground: GRASS_TUFTY, object: SIGNPOST, solid: true, name: 'sign' },

  // --- decoration you can walk straight over ---
  m: { ground: GRASS_TUFTY, object: MUSHROOMS, name: 'mushrooms' },

  // --- lamp shades: WorldScene stands a real sprite on top of these, because
  //     a sprite can bob and pop and a tilemap tile cannot. These letters just
  //     say what plain ground goes underneath it. ---
  L: { ground: GRASS_TUFTY, name: 'grass with a lamp shade' },
  l: { ground: WATER_SPARKLY, water: true, name: 'floating lamp shade' },
};

/** The letter we fall back to if a map uses a letter that is not in the legend. */
export const UNKNOWN_LETTER: TileKind = { ground: GRASS, name: 'grass' };
