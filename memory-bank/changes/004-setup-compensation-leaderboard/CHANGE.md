# Change 004 — Setup improvements, compensation points & leaderboard priority

## Summary

Four enhancements to the setup and leaderboard screens:

1. **Minimum players depends on court count** — the required minimum is now `numCourts × 4` (was a hard-coded 4), so a 2-court event needs 8 active players. The empty-roster hint, the live warning, and the Start validation all use the dynamic minimum, and the Courts select now persists on change so the warning updates immediately.
2. **Focus retention in the player-name input** — after adding a player (button or Enter), focus returns to the name input for rapid consecutive entry. Because every render replaces the `#app` node, the handler re-queries the new input via `document.getElementById('p-name')`.
3. **Compensation points toggle** — a checkbox on the setup screen (`settings.compensation`, default `false`). "Players who play fewer matches get extra points to make up the difference." Each missed match awards `floor(totalPoints / 2)` points; a player's compensation is `(maxMatchesPlayed − player.matches) × floor(totalPoints / 2)`. The leaderboard shows it as `pf (+N)` in the Pts column, and the `Points` ranking key uses the compensated total (`pf + comp`), so it affects ranking.
4. **Leaderboard ranking priority** — the Leaderboard tab now shows a read-only "Ranked by: …" line built from `settings.scoringPriority`, appending "compensation points" when enabled.

## What changed

| File | Nature |
|------|--------|
| `js/state.js` | `defaultSettings()` adds `compensation: false` (existing events inherit it via `normalizeMatch`) |
| `js/setupScreen.js` | `minPlayers()` helper (`numCourts × 4`); used in `playerRows()` hint, `warnHtml()`, and Start validation; `#s-courts` `change` → `updateSettings({numCourts})`; `addPlayer()` refocuses `#p-name`; `#s-comp` compensation checkbox added to `readSettings()` and the Format & Courts card |
| `js/scoring.js` | `aggregates()` computes `row.comp` (gap × `floor(totalPoints/2)` when compensation on, else 0); `valueForKey('points')` returns `pf + comp` |
| `js/runScreen.js` | `rankByHtml()` renders the priority list; Pts cell shows `(+N)` when `comp > 0` |
| `css/style.css` | `.comp` (accent, smaller) and `.rankby` (spacing under the priority line) |

## Calculation

- `perMatch = Math.floor(totalPoints / 2)` — e.g. `totalPoints: 21` → 10 points per missed match.
- `maxMatches` = most matches played by any player in the event.
- `comp = (maxMatches − player.matches) × perMatch` when `settings.compensation` is on, else 0.
- Ranking: `valueForKey('points') = pf + comp`, so the `Points` sort key uses the compensated total; `pf` itself (raw) is unchanged and still displayed.

## Verification

- `node --check` passed on `state.js`, `setupScreen.js`, `scoring.js`, `runScreen.js`.
- Headless `node` sanity check of `scoring.js`:
  - 5 players, 3 played rounds with A in only 1 → comps `20,0,0,0,10` (A gap 2 × 10, E gap 1 × 10).
  - With priority `wins desc, points desc`, A (effective 31) ranks above E (effective 30) and D (effective 10) inside the `wins = 1` tier.
  - Toggling `compensation` off zeroes all comps and restores raw-`pf` ordering.
- Manual browser pass: 2 courts → warning requires 8 players; adding a player keeps focus in the name box; compensation checkbox shows `(+N)` and shifts ranking; Leaderboard tab shows the "Ranked by:" line.

## Rollback

```
cp -r memory-bank/changes/004-setup-compensation-leaderboard/before/js/*.js js/
cp memory-bank/changes/004-setup-compensation-leaderboard/before/css/style.css css/
```
