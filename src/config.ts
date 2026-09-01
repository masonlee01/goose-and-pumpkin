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
