# Change 011c — Reshuffle upcoming rounds & opponents

## Summary

`plan # Feature 011c`:

A **Reshuffle** button on the event page (Courts tab) that shuffles the order of the unplayed rounds and which pairs face each other, while keeping every pair (team) together. Tapping it opens a custom confirm modal warning that the order and opponents will be shuffled at random, that pairs stay together, and that played rounds / saved scores are untouched.

- `PadelApp.match.reshuffleUnplayed(state)` (pure, Fisher-Yates) collects the free rounds (unplayed AND fully unscored), shuffles their order among themselves, and for each one collects its pairs, shuffles them, and re-pairs them into courts — so the opponents change but each team's two players stay together. Played rounds, partially-scored rounds and all saved scores are untouched; round numbers are re-sequenced. Returns the number of rounds reshuffled (0 when there is nothing to do).
- `PadelApp.state.reshuffleUnplayed()` wraps it: no-op when the event is finished or no free rounds exist, otherwise calls `changed()`.
- `js/runScreen.js` renders the button (hidden when finished or when no free rounds) and wires a confirm modal (`Reshuffle`) whose OK triggers the action.

## What changed

| File | Nature |
|------|--------|
| `js/matchmaking.js` | New `shuffle()` (Fisher-Yates) and `reshuffleUnplayed(state)`; both exported |
| `js/state.js` | New `reshuffleUnplayed()` action (finished/no-free → 0, else `changed()`); exported |
| `js/runScreen.js` | Courts tab `data-act="reshuffle"` button (`.regen-row`, ghost) + confirm-modal wiring |
| `PLAN.md` | Feature 011c section |

## Behavior

- Courts tab shows **"Reshuffle upcoming rounds & opponents"** whenever the event isn't finished and at least one unplayed round has no saved scores; it's hidden once finished or when every round is played/scored.
- The confirm warns: round order and opponent pairings are shuffled at random; pairs stay together; played rounds and saved scores are not touched. OK reshuffles, Cancel closes.
- Pairs (each `teamA`/`teamB` pair) are preserved exactly as a set; no player appears twice within a reshuffled round; each free round keeps its court count and stays unscored; round numbers stay sequential; the player slot-pickers and score flow work unchanged on the reshuffled courts.
- Partially-scored unplayed rounds are left alone (not re-paired, not moved).

## Verification

- `node --check` passed on every JS file.
- Headless (`/tmp/opencode/reshuffle_test.js`, 10 checks): 7-round schedule built; reshuffle returns 6; the partial round 0 is untouched; free rounds stay unscored with sequential `roundNumber`s; the pair multiset is identical before/after; no duplicate player within a reshuffled round; schedule content actually changed; court count per round preserved; finished events and no-free-rounds return 0 with rounds unchanged.
- Headless UI (`/tmp/opencode/ui_reshuffle_test.js`, 6 checks): the button renders with free rounds, is hidden when finished, is hidden when no free rounds, the confirm contains the warning text, and confirming invokes the reshuffle action.
- Regression: the live score counter / picker-cancel / corner-switch flow still passes (`/tmp/opencode/live_counter_test.js`).

## Rollback

```
cp -r memory-bank/changes/011c-reshuffle-upcoming-rounds/before/* ./
```