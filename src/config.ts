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
