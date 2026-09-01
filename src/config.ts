// =============================================================================
//  THE KNOBS
// =============================================================================
//  Every number that changes how the game FEELS lives in this one file.
//  Change a number, press Ctrl+S to save, and the game updates straight away.
//  Nothing in here can break the game - the worst that happens is something
//  silly, and silly is the whole point.
// =============================================================================

// --- How fast do they move? -------------------------------------------------
export const GOOSE_SPEED = 90; // Goose's walking speed. Try 300 for a very fast goose.
export const PUMPKIN_SPEED = 90; // Pumpkin's rolling speed.

// --- How close is the camera? -----------------------------------------------
export const CAMERA_ZOOM_CLOSE = 3.0; // when Goose and Pumpkin are together (bigger = closer)
export const CAMERA_ZOOM_FAR = 1.6; // how far it will zoom out when they run apart
export const CAMERA_SMOOTHNESS = 0.08; // 0.01 = floaty and slow, 1 = snappy and instant

// --- Names floating above their heads ---------------------------------------
export const SHOW_NAME_TAGS = true; // set to false to hide the names

// --- Honking ----------------------------------------------------------------
export const HONK_TEXT = 'HONK!'; // what Goose shouts when you press F
export const BOUNCE_TEXT = 'BOING!'; // what Pumpkin shouts when you press /
export const SHOUT_TIME = 900; // how many milliseconds the shout stays on screen

// --- The pond: Goose swims, Pumpkin sinks ------------------------------------
export const GOOSE_SWIM_SPEED = 50; // Goose is slower in the water than on land
export const SINK_TIME = 500; // milliseconds it takes Pumpkin to sink out of sight
export const POP_TIME = 600; // milliseconds she stays out of sight before popping back up
export const PHEW_TEXT = 'PHEW!'; // what Pumpkin shouts when she pops back up on the bank

// --- Lamp shades: something to find, and a counter for how many you've got --
export const LAMP_SHADE_FOUND_TEXT = 'GOT ONE!'; // shouted when you walk onto a lamp shade
export const LAMP_SHADES_ALL_FOUND_TEXT = 'FOUND ALL THE\nLAMP SHADES!\nWELL DONE!'; // shown when the very last one is found
export const LAMP_SHADE_BOB_HEIGHT = 3; // how many pixels a lamp shade bobs up and down
export const LAMP_SHADE_BOB_TIME = 900; // milliseconds for one up-and-down bob
export const LAMP_SHADE_POP_TIME = 300; // milliseconds the pop-and-vanish animation takes when you grab one
export const LAMP_SHADE_SPARKLE_COUNT = 7; // how many little sparkles ring a lamp shade when you grab it

// --- The polar bear: honk near him to flip day and night ---------------------
export const BEAR_HONK_DISTANCE = 28; // how close you need to stand to honk at the bear
export const NIGHT_ALPHA = 0.6; // how dark it gets at night (0 = no change, 1 = pitch black)
export const NIGHT_FADE_TIME = 800; // milliseconds the day/night transition takes

// --- Sound effects ------------------------------------------------------------
// Every sound is invented on the spot by the computer - there are no sound
// files anywhere in this project. Each one is a note that slides from pitch
// `from` to pitch `to` (in Hertz - bigger number = higher note) over `time`
// milliseconds, using a wave `shape` (try 'sine', 'square', 'sawtooth' or
// 'triangle') at volume `loud` (0 = silent, 1 = full volume). Change a number,
// press Ctrl+S, and the very next honk sounds different.
//
// This is deliberately NOT given a proper TypeScript type. That means a typo
// here, like 'sqare' instead of 'square', can never stop the game from
// building - it just quietly plays a normal square wave instead.
export const SOUNDS = {
  honk: { from: 220, to: 140, time: 220, shape: 'sawtooth', loud: 0.25 },
  boing: { from: 300, to: 550, time: 180, shape: 'square', loud: 0.2 },
  phew: { from: 500, to: 750, time: 150, shape: 'sine', loud: 0.2 },
  pickup: { from: 500, to: 900, time: 200, shape: 'triangle', loud: 0.22 },
  growl: { from: 150, to: 90, time: 260, shape: 'sawtooth', loud: 0.25 },
};

// --- The screen -------------------------------------------------------------
export const GAME_WIDTH = 640; // the game is drawn this big, then stretched to fit
export const GAME_HEIGHT = 360;
export const BACKGROUND_COLOUR = '#5aa63e'; // the colour behind everything (grassy green)

// =============================================================================
//  Things below here are more about HOW the game is built than how it feels.
//  You can still change them, but they are less fun to fiddle with.
// =============================================================================

export const TILE_SIZE = 16; // every tile in the world is 16 dots across
export const WALK_FRAME_RATE = 6; // how quickly the walking animation flips between poses
