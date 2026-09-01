# Goose and Pumpkin — Version 2

## Context

Version 1 is a meadow you can walk around: two players on one keyboard, trees
and a pond that block you, a camera that zooms out when they split up, honking,
and one signpost. It works, it's deployed, and the boys have played it.

Version 2 is the rest of `IDEAS.md` — every idea the boys wrote down, plus the
two staples from "Next up" that make the others better: a **real honk** (there
is no audio in the project at all today) and **something to collect with a
counter** (the game currently has no goal).

Seven features, built in dependency order, **one commit each**, with
`npm run check` → `npm run build` → `npm run check:game` before every commit.
Each commit leaves the game playable and deployable, so a bad Saturday can stop
anywhere.

## Three cross-cutting decisions

These come first because more than one feature depends on each.

**1. Water stops being solid.** Making the pond passable for Goose but not
Pumpkin (a collider `processCallback`) means Pumpkin can never actually get in
— and the sinking-into-bubbles half of the idea, the half that got the laugh,
never happens. So `W`/`w` lose `solid: true` and gain `water: true` in
[legend.ts](src/world/legend.ts), and the difference between the two characters
lives in code. Recovery from the pond is a teleport to a tile centre, which
physics cannot argue with — safer than a conditional wall.

**2. One "you're not in charge right now" mechanism.** Sinking and getting
bonked both need to take the keys away for a fraction of a second. Both use a
single **timestamp** on `Player`:

```ts
/**
 * While something else is moving us - sinking in the pond, or being shoved by
 * a piranha plant - the keys do nothing for a fraction of a second. It is a
 * TIME, not a switch, so it always wears off by itself. That is what makes it
 * impossible to get stuck.
 */
heldStillUntil = 0;
```

A boolean would stay stuck forever if a tween were ever interrupted. A
timestamp cannot.

**3. Map letters, not coordinate arrays.** `signs.ts` is an array because a
sign carries *text*. Lamp shades, polar bears and piranha plants carry nothing,
so an array would just be coordinates that silently drift out of step with the
map. They get letters the boys can type into
[meadow.txt](src/world/maps/meadow.txt) instead — and the lamp shade total then
counts itself.

| Letter | Thing | Note |
|---|---|---|
| `L` | lamp shade on grass | |
| `l` | lamp shade floating in the pond | only Goose can reach it |
| `P` | polar bear | **P**olar. Not `B` — `b` is already a bush, and `b`/`B` is a 6-year-old trap |
| `!` | piranha plant | reads as "danger here" when you scan the map text |

## Shared groundwork (goes in with commit 2)

Nothing here is needed by the sounds commit, so it rides along with the first
feature that does need it — swimming. `spotsOf` is then already in place for
the lamp shades, the bear and the piranhas.


[legend.ts](src/world/legend.ts) — add `water?: boolean` to `TileKind`, update
the header comment ("Each letter says up to four things"), flip `W`/`w` from
`solid` to `water`.

[loadMap.ts](src/world/loadMap.ts) — the collision loop is **unchanged**; only
its comment needs correcting (it currently claims water is in the list). Give
the already-exported-but-unused `kindAt` a job, and add three things:

```ts
  /** Every square where a particular letter appears, e.g. every 'L'. */
  spotsOf: (letter: string) => Array<{ across: number; down: number }>;
```

plus two exported helpers that take **world dots**, so no caller ever writes
`/ 16`:

```ts
export function isWaterAt(map: LoadedMap, x: number, y: number)
/** Trees, bushes, fences, signposts - AND the pond, and anything off the edge
 *  of the map, so nobody can ever be shoved somewhere they should not be. */
export function isDangerAt(map: LoadedMap, x: number, y: number)
```

`isDangerAt` counts water as blocked on purpose: it is what the piranha shove
probes with, and water is no longer `solid`, so a plain solid check would fling
Pumpkin straight into the pond.

## Commit order

Each is a session-sized chunk. Order is by dependency, then by risk.

### 1. Sounds — a real honk

New [src/systems/sounds.ts](src/systems/sounds.ts). **Synthesised at runtime**
with one `AudioContext`, no sound files. The reason is the edit loop: a boy
changes `from: 430` in `config.ts`, hits Ctrl+S, and the *next* honk sounds
different — the same feedback loop that makes `config.ts` worth having. A
`.wav` build script would mean re-running a command and reloading.

`SOUNDS` in `config.ts` is a plain object of
`{ from, to, time, shape, loud }`. **Deliberately not type-annotated** — a
typo like `'sqare'` must fall back to `'square'` at runtime, not fail
`npm run build` and block the deploy mid-session.

Two rules the module must never break, both worth a comment in the file:

- Never throw. No sound card, locked-down laptop, unknown browser → the game
  keeps playing, it just goes quiet.
- Never log. `check:game` fails on a single console error.

The autoplay policy is sidestepped rather than fought: the `AudioContext` is
created **lazily inside the first `playSound`**, and the first sound always
comes from a keypress, so the browser is already happy. No warning, no console
mess. `audio.resume()` always needs `.catch(() => {})` — an uncaught rejection
*is* a console error. And the fade must ramp to `0.0001`, never `0` —
`exponentialRampToValueAtTime(0, …)` throws.

`Player.say(text, sound)` gains a second parameter and calls `playSound` first.
`PlayerOptions` gains `soundName`.

For the checker, the module records what it played on
`window.__soundsPlayed` and `window.__audioState` — a headless browser has no
ears. Add `--mute-audio` to the puppeteer launch args but leave the autoplay
policy at its default, so the check genuinely exercises the blocked path.
`__audioState === 'none'` passes (no hardware); `'suspended'` fails (the
browser blocked us and every noise is going nowhere).

### 2. Goose swims, Pumpkin sinks

The riskiest one, done while the day is young. New
[src/systems/water.ts](src/systems/water.ts), mirroring the existing
[camera.ts](src/systems/camera.ts) shape — a small class the scene owns and
ticks. `Player` must not learn about tilemaps; it just gets two flags the pond
sets.

Per player, one plain string state: `land` → `swimming` | `sinking` →
`popping` → `land`. Detection is one `kindAt` lookup per frame at
`body.center` — the **feet**, not `sprite.x/y`, because the body is
deliberately offset down to the toes and that is what makes Goose reach the
shoreline before the swim animation kicks in.

**Never get stuck**, three layers deep:

1. Every frame a character is on dry land, write down the **middle** of that
   tile. Middle, not exact spot, so they never pop out half-inside a tree.
2. If the remembered bank is too far away (dropped into the middle of the
   pond), ring-search outward from where they went under for the nearest tile
   that is neither water nor solid. Bounded at 20 rings.
3. Failing both, the remembered spot anyway.

`water.update()` runs **first** in `WorldScene.update()`, so stepping in slows
Goose down on the same frame.

**Phaser trap worth adding to CLAUDE.md next to the camera one:** an Arcade
body recomputes its size from `scaleX/scaleY` every step, so tweening `scale`
on a sprite with a live body silently shrinks its collision box. Hence
`body.enable = false` during the sink tween, and `setScale(1)` *before*
re-enabling in `backToNormal`. Use `body.reset(x, y)` to land them — it moves
and stops them dead in one call.

Art: `buildCharacterSheet` grows from 6 frames to 8. **New frames go on the
END** — 0–5 keep the exact meanings `createAnimations` already relies on, and
`BootScene` needs no change because `load.spritesheet` slices however many
frames the file is wide. Frames 6/7 are `drawGooseSwimming` (only his top half
above a pale wake, drawn after `addOutline` so it stays watery) and
`drawPumpkinBubbles` (rising bubbles, outlined in `waterDeep` not black).

**Existing check #2 in [check-game.mjs](scripts/check-game.mjs) asserts "the
pond blocks Goose".** That becomes wrong on purpose and must be swapped in this
same commit, or the checks go red and the session stalls.

Also: a boy holding Right into the pond gets sink → PHEW → walk in → sink
again. That is a running joke, not a jam — he is in control throughout. Do not
"fix" it.

### 3. Lamp shades and the counter

`L` and `l` in the map become **sprites**, not tiles — they have to bob, pulse,
pop and vanish, and tilemap tiles cannot tween. Plain grass (or water) painted
underneath; `WorldScene` stands a sprite on top from `spotsOf`.

`overlap`, not `collider` — walk straight over it. The callback fires **every
frame** you stand on it, so `if (!shade.active) return;` then
`disableBody(true, false)` is what stops one lamp shade counting eleven times.
Keep it visible for the pop tween, destroy it in `onComplete`.

Pickup: `player.say(LAMP_SHADE_FOUND_TEXT, 'pickup')`, a ring of ~7 tweened 2px
rectangles for sparkle (no particle system needed), and
`this.events.emit('lamp-shades', found, total)`.

The **World → UI contract**, written down once in a comment:

| Event on `world.events` | Args | When |
|---|---|---|
| `show-message` | `text` | sign, bear, or the last lamp shade *(exists)* |
| `lamp-shades` | `found, total` | a lamp shade is picked up |
| `night` | `on: boolean` | the bear flips the sun |

**`WorldScene.create()` finishes before `UIScene.create()` runs**, so anything
emitted during world creation is shouted into an empty room. UIScene therefore
**pulls** the opening numbers off the world when it wakes, and **listens** for
changes after. Two mechanisms, but each is obvious; delaying the emit into a
`delayedCall` is the kind of thing that breaks a year later for no visible
reason. All three listeners need matching `off()` in the existing `SHUTDOWN`
handler.

Put one `l` at roughly (25, 6) — the middle of the pond, three squares from
every bank. That is the payoff for Goose being able to swim, and the counter is
a shared total so Pumpkin never looks like she is failing at something.

Then hand `meadow.txt` to the boys and let them type `L` wherever they like.
The denominator follows automatically — that is the whole reason for choosing a
letter.

### 4. The polar bear and night

A `P` stands a bear sprite (16×24, so he is visibly bigger than Goose) with
`setOrigin(0.5, 1)` at the bottom of his tile. **No physics body** — the `P`
tile itself is `solid: true`, which gives him a perfect one-tile hitbox using
machinery that already exists.

Honk near him and the sun goes to bed; honk again and it comes back. Both
characters can do it — "only your brother's key does the good thing" would ruin
a Saturday.

The night effect is a `640×360` rectangle **in `UIScene`**, not the world.
`setScrollFactor(0)` pins an object against camera *scroll* but the camera
*zoom* still scales it, so a world-space sheet needs `1 / camera.zoom`
compensation every frame and looks right at zoom 1.0 while testing and wrong
the moment the boys split up. `UIScene`'s camera never zooms or scrolls. Depth
`-10` puts it behind the counter and message box so those stay readable in the
dark.

The lamp-shade tie-in costs nothing and needs no glow system: under a 60% dark
sheet the pale cream shades are the brightest things left, and they are already
pulsing. Night becomes a torch-hunt for the ones you missed.

`doAction()` becomes a flat ladder of `if`s with early returns — sign, then
bear, then plain shout — with a comment telling the next person to keep it
that way. Three branches is a list, not a dispatch problem.

### 5–7. Fish, worms, piranha plants

**The single decision these three rest on: none of them gets a physics body.**
All are plain sprites moved by hand in `update()`. No colliders, no overlaps.
That makes "must never block movement" true *by construction*, and means the
creatures cannot touch the collision system `Player` depends on.

**No shared base class and no update registry** — three self-contained files,
[Fish.ts](src/entities/Fish.ts), [Worms.ts](src/entities/Worms.ts),
[Piranhas.ts](src/entities/Piranhas.ts), and three literal lines in
`WorldScene.update()`. When a boy says "make the fish faster", the file name
should be the answer. `Player` is not extractable anyway — `handleMovement()`
reads `this.controls` unconditionally, and it is the one class that must never
break. If a fourth and fifth creature arrive and all look identical, extract
*then*.

`WorldScene.update()` gains `(time, delta)` and creatures move by
`speed * delta / 1000`, or the worms crawl at double speed on a 120 Hz screen.

**Fish** (5) — spawn count auto-derived from the water tiles, so if the boys
redraw the pond the fish move with it. Move X and Y **separately**, accepting
each axis only if `isWaterAt` — separate axes means a fish slides along the
bank instead of pinning in a corner, and it can never leave the pond. Dart away
from the nearer player inside `FISH_SCARE_DISTANCE`. Colour variety via
`setTint` from a `FISH_COLOURS` array, not more frames — a far better knob than
re-running `npm run art`.

**Worms** (6) — wander on grass, drop a fading mud splat every so often. Three
splat variants so a trail is not a row of identical stamps, and no outline —
mud is a stain, not a thing. `MAX_MUD_PATCHES` caps it, **and each patch must
be spliced out of the array in the tween's `onComplete`** — otherwise the array
grows all afternoon even though the sprites are gone, and `state()` in the
checker gets slower every second.

**Piranhas** (7) — a two-state timer off `scene.time.now`, with a brief
"here it comes" pose before the snap so being bonked is always your own fault.
The mud pot (tile 134) stays visible even when the plant is hidden. First
`changeAt` offset by position so a row of plants ripples rather than firing in
unison. Bite is detected **only on the single frame the plant snaps up** — that
is what makes it a snap rather than a damage zone, and it means one pop can
bonk you at most once.

The shove is a **tween on `x`/`y`**, not velocity: `handleMovement()` calls
`setVelocity` unconditionally every frame, so any impulse is wiped before the
next physics step. `heldStillUntil` stops the shove fighting whichever key is
held.

Can never wedge you, and the reasons belong in the file as a comment:

1. The destination is proven clear *before* the tween starts — probe outward in
   quarter-tile steps at three points across the feet (`x-5`, `x`, `x+5` at
   `y+4`, taken straight from the body's `setSize(10,7)`/`setOffset(3,9)`), and
   **break at the first blocked step**, so the whole flight path is clear, not
   just the endpoint.
2. Probe with `isDangerAt`, which counts water and off-map as blocked.
3. Worst case you don't move at all — you shout OW and stay put.
4. `heldStillUntil` is a timestamp; control returns on its own.
5. The `!` square is not solid and the plant has no body, so standing on one is
   always fine — you can walk off it.
6. `PIRANHA_SAFE_TIME` stops two plants volleying you back and forth.

Keep plants at least two squares from the pond in this version. Bonk-into-water
is *handled*, but bonk → sink → PHEW → bonk is a rhythm nobody asked for.

**Both spawners must use a bounded `for (let tries = 0; tries < 50; tries++)`,
never a `while`.** A boy who fills `meadow.txt` with `W` should get zero worms,
not a locked-up laptop. Every constructor guards with
`if (!scene.textures.exists('fish')) return;` so a fresh clone that forgot
`npm run art` still runs.

## Depth ladder

Getting this wrong is the most likely visual bug, so it goes in a comment.

| Depth | What | Scene |
|---|---|---|
| 0 | ground tiles | World |
| 1 | mud patches, fish | World |
| 5 | trees, bushes, signs, piranha pots | World |
| 6 | worms, lamp shades | World |
| 8 | piranha plants (*under* players, so a plant never covers your face) | World |
| 9 | polar bears | World |
| 10 | Goose and Pumpkin | World |
| 20 / 30 / 31 | name tags / shouts / sparkles | World |
| −10 | the night sheet | UI |
| 90 / 100 | lamp shade counter / message box | UI |

Everything in `UIScene` renders above everything in `WorldScene` regardless of
number, which is why `-10` still covers the world.

## Files

**New:** `src/systems/sounds.ts`, `src/systems/water.ts`,
`src/entities/Fish.ts`, `src/entities/Worms.ts`, `src/entities/Piranhas.ts`.

**Edited every commit:** [config.ts](src/config.ts) (the knobs — every number
with a plain-English comment, matching the existing style),
[WorldScene.ts](src/scenes/WorldScene.ts),
[build-art.mjs](scripts/build-art.mjs), [check-game.mjs](scripts/check-game.mjs),
[IDEAS.md](IDEAS.md) (cross the line off before committing).

**Edited some commits:** [Player.ts](src/entities/Player.ts),
[UIScene.ts](src/scenes/UIScene.ts), [BootScene.ts](src/scenes/BootScene.ts),
[legend.ts](src/world/legend.ts), [loadMap.ts](src/world/loadMap.ts),
[meadow.txt](src/world/maps/meadow.txt), [README.md](README.md) (letter table).

**Art:** new sprite sheets for fish (8×8, 2f), worm (16×16, 2f), mud (8×8, 3f),
piranha (16×16, 4f), lampshade (16×16, single), bear (16×24, 6f); goose and
pumpkin grow to 8 frames; piranha pot into free tile slot **134** (135–143 stay
free). All via `scripts/build-art.mjs` + `npm run art` — never hand-edit the
PNGs.

**Map:** always *swap* a `g` for a new letter, never insert — `parseMapText`
pads short rows so nothing crashes, but everything on a shortened row shifts
left.

## Verification

After **every** commit, with `npm run dev` running in another window:

```
npm run check       # TypeScript
npm run build       # full production build
npm run check:game  # drives a real browser and plays the game
npm run shot        # eyeball screenshot.png
```

New checks in `check-game.mjs`, added per feature, with the existing
"no errors in the browser console" check kept **last**:

- **Sounds** — `__soundsPlayed` contains `honk` after F, and `__audioState` is
  not `'suspended'`.
- **Swimming** — replace check #2: Goose reaches water and `inWater` is true.
  Then: Pumpkin never *stays* wet; she lands on a tile that is neither water
  nor solid; she is rescued even when placed dead centre of the pond; **she can
  walk again afterwards** (the one that really matters); and swimming does not
  let Goose through the tree border.
- **Lamp shades** — count the `L`s in `meadow.txt` with `fs` and assert the
  total matches; walking onto one increments the counter and plays `pickup`;
  the counter text is on screen; collecting all of them fires the well-done
  message.
- **Bear/night** — honk near `bearSpots[0]` → `isNight` true, night sheet alpha
  > 0.2, `growl` played; honk again → back to day, alpha < 0.05.
- **Fish** — every fish is inside a water tile at spawn *and* after moving, at
  least one has moved, and the nearest one retreats when Goose stands on the
  bank.
- **Worms** — worms are never on a solid tile, at least one has moved, mud
  patch count is `> 0` **and `<= MAX_MUD_PATCHES`** (the upper bound is the
  half that catches the leak).
- **Piranha** — poll for ~8s (the cycle is `DOWN + UP` ms plus a per-plant
  offset, and the OW text only lives `SHOUT_TIME`); assert Goose was pushed,
  shouted OW, did **not** land on water or solid, and **can walk immediately
  afterwards**.

The checker reads `private` fields off `window.__game` — `private` is
compile-time only, exactly as it already does for `w.goose`. Guard new
collections with `?? []` so a failed constructor gives a clear FAIL instead of
throwing.

Push after each commit; GitHub Pages deploys automatically, so the boys can
play each feature as it lands.
