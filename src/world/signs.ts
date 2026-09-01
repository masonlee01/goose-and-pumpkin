// =============================================================================
//  SIGNS
// =============================================================================
//  Whatever you write here appears when Goose or Pumpkin stands next to a
//  signpost and presses their action key.
//
//  Put an `s` somewhere in src/world/maps/meadow.txt to make a new signpost,
//  then add a line here with the same across/down position.
//
//  "across" counts from the LEFT edge of the map, starting at 0.
//  "down"   counts from the TOP edge of the map, starting at 0.
// =============================================================================

export type Sign = {
  across: number;
  down: number;
  says: string;
};

export const SIGNS: Sign[] = [
  {
    across: 8,
    down: 16,
    says: 'THE MEADOW\nPond that way ->\nWatch out for the\nsparkly bits.',
  },
];
