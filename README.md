# Goose and Pumpkin's Adventure

A two-player top-down adventure game. Goose and Pumpkin wander a meadow together.
Built by Mason and his two sons, one Saturday feature at a time.

**Play it here: https://masonlee01.github.io/goose-and-pumpkin/**

---

## Playing

| | Goose | Pumpkin |
|---|---|---|
| Walk | `W` `A` `S` `D` | Arrow keys |
| Do the thing | `F` | `/` |

Both players play at the same time on the same keyboard. The camera sits between
the two of them and zooms out when they run apart, so nobody can drag the other
one off the screen.

## Starting the game

Double-click **`start-game.bat`**. That is the whole thing. A black window opens
(leave it alone) and the game appears in your browser.

To stop it, close the black window.

Prefer a terminal? `npm run dev`.

## The two files worth messing with

**`src/config.ts`** — every number that changes how the game feels: walking
speed, how close the camera sits, what Goose shouts. Change a number, press
Ctrl+S, and the game updates instantly. You do not need to restart anything.

**`src/world/maps/meadow.txt`** — the world itself, drawn with letters. Every
letter is one square of ground. Change the letters, save, and the world changes.

```
g = grass          . = path           W = water (blocks you)
f = flowers        , = path           T = tree  (blocks you)
m = mushrooms      o = gravel         b = bush  (blocks you)
s = signpost       F = fence
```

The full list lives in `src/world/legend.ts`, and what the signs say lives in
`src/world/signs.ts`.

## All the commands

| Command | What it does |
|---|---|
| `npm run dev` | Play the game while building it. Updates as you save. |
| `npm run art` | Redraw Goose, Pumpkin and the water after changing colours. |
| `npm run check:game` | The computer plays the game itself and checks nothing broke. |
| `npm run shot` | Take a picture of the running game (saves `screenshot.png`). |
| `npm run build` | Package the game up for the website. |

`check:game` and `shot` need the game already running in another window.

## Where things live

```
src/config.ts            all the fun numbers
src/main.ts              starts the game up
src/scenes/              Boot (loading), World (the game), UI (text on top)
src/entities/Player.ts   one walking character; we make two of them
src/systems/camera.ts    the camera that follows both players at once
src/world/               the map, the legend, and what the signs say
scripts/build-art.mjs    draws Goose, Pumpkin and the water from scratch
public/assets/           the finished pictures the game loads
art-source/              the original Kenney art pack we build on top of
```

## Where the art comes from

The ground, trees, houses and fences are Kenney's **Tiny Town** pack, which is
CC0 — public domain, free to use for anything, no credit required (though
Kenney deserves it: [kenney.nl](https://kenney.nl)).

Goose, Pumpkin and the water are ours. They are not drawn by hand in an image
editor — they are *generated* by `scripts/build-art.mjs`. Change a colour at the
top of that file, run `npm run art`, and every pose gets redrawn to match.

Drawings the boys make go in `public/assets/kid-art/`.
