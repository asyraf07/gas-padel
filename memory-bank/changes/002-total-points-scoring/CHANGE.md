# Change 002 — Total-points scoring (replaces "first to")

## Summary

Replaced the "first to N" win condition with a **total-points** rule. A court now ends when the two sides' scores add up to **exactly** the configured target (`totalPoints`, default **21**); the higher side wins and ties are not allowed. The optional "Win by 2" rule was removed.

## Why

The requirement asked for the match to end based on the combined points of both teams (e.g. a court ending at `11-10` or `9-11` for a target of `21`/`20`) rather than whichever side happens to cross a win count first. "Win by 2" is incompatible with a fixed combined total, so it was dropped.

## What changed

1. **Settings** (`js/state.js`)
   - `winPoints: 15` + `winByTwo: false` → `totalPoints: 21`.
   - `normalizeMatch()` migrates legacy persisted events: if `winPoints` exists and `totalPoints` is absent, `winPoints` is copied to `totalPoints`; then `winPoints`/`winByTwo` are deleted.

2. **Setup screen** (`js/setupScreen.js`)
   - Field relabelled "First to" → "Total points", bound to `totalPoints` (fallback 21).
   - Removed the "Win by 2" checkbox and its read path.

3. **Run screen** (`js/runScreen.js`)
   - Header label now shows `total points N`.
   - `validate(a, b)` now enforces: scores cannot be tied, and `a + b` must equal `totalPoints` exactly.

## How it works

- Valid endings for target 21: `11-10`, `10-11`, `9-12`, `0-21`, etc. — any non-tied split summing to 21.
- Rejected: tied scores (e.g. `10-10` for target 20) and any pair that does not sum to the target (e.g. `11-9` for target 21).

## Verification

- `node --check` passed on all edited `js/*.js`.
- Manual browser check (target 21): `11-10` and `9-12` save; `11-9` and `10-10` are rejected with a single clear message.

## Rollback

```
cp -r changes/002-total-points-scoring/before/js/*.js js/
```
