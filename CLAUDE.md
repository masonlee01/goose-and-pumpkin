# Notes for Claude

## What this project is

A 2D top-down adventure game that Mason builds **with his 6- and 8-year-old
sons** on weekends. The boys invent features; Mason has limited coding
experience and is not a game developer.

This context drives most of the decisions below. The measure of a good change
here is not how clean the architecture is — it is whether a child sees their
idea on screen in the same sitting.

## Rules that matter

**Never break the play session.** A type error, a lint complaint, or an unused
variable must never stop the game from running. `noUnusedLocals`,
`noUnusedParameters` and `erasableSyntaxOnly` are switched off in
`tsconfig.json` on purpose — do not switch them back on.

**Put the fun numbers in `src/config.ts`.** Any value a child might want to
change — speed, zoom, what a character shouts, colours — belongs there with a
plain-English comment, not buried in a class. This file is the main way the boys
interact with the code.

**Comments are for a beginner, not for a colleague.** Write comments that
explain *why* in ordinary words. Assume the reader has never seen a game engine.

**Prefer plain data over cleverness.** The world is a text file of letters
(`src/world/maps/*.txt`). Signs are a plain array (`src/world/signs.ts`). When
adding a feature, ask whether it can be expressed as a list of simple things a
child could edit, before reaching for a system.

**British/plain spelling for user-facing words is not enforced** — but keep
names concrete. `HONK_TEXT`, not `PLAYER_ONE_INTERACTION_STRING`.

## How to check your work

The game must be running (`npm run dev`) for the last two:

```
npm run check       # TypeScript
npm run build       # full production build
npm run check:game  # drives a real browser and plays the game
npm run shot        # screenshot to look at (saves screenshot.png)
```

`scripts/check-game.mjs` is the important one. **Add a check to it whenever you
add a feature.** It caught a real camera bug during the initial build.
`window.__game` is deliberately exposed in `src/main.ts` for it.

## Things that are easy to get wrong

- **Phaser's `camera.scrollX` is measured before zoom is applied.** Centring the
  camera by hand is a trap — use `camera.centerOn()`. This already bit us once.
- **`public/assets/` vs Vite's output.** Vite's own bundle goes to `dist/bundle`
  (set in `vite.config.ts`) specifically so it does not collide with the
  artwork in `dist/assets`. Do not change `build.assetsDir` back to the default.
- **`base: './'` in `vite.config.ts`** is what makes the game work both locally
  and on GitHub Pages under a subpath. Keep paths relative.
- **Tile numbers** index into `public/assets/tiles/tileset.png`, 12 tiles per
  row. Kenney's tiles are 0–131; ours start at 132. Give any new tile a named
  constant in `src/world/legend.ts` rather than writing a bare number.
- Art is **generated**, not hand-drawn: edit `scripts/build-art.mjs` and run
  `npm run art`. Do not hand-edit the PNGs in `public/assets/` — they get
  overwritten.

## Session shape

Look at `IDEAS.md`. Pick one idea, build it, run the checks, commit, push. The
push deploys to GitHub Pages automatically, so the boys can play the new version
straight away and send the link to people.
