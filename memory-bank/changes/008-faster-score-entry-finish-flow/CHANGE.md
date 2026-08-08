# Change 008 — Faster score entry & finish-event flow

## Summary

Two enhancements (plan `# Feature 008`):

1. **Quick score entry.** Each court side shows preset score chips (11 / 12 / 15 / 18 / 21, filtered to `≤ totalPoints`). Tapping a chip sets that side's score and the numeric input stays for exact values. Both chips and manual typing auto-derive the opponent side as `totalPoints − score`, so ties and over-totals are impossible by construction; entry validation reduces to `0 ≤ score ≤ totalPoints` (the exact-sum check is kept as a safety net). Saving still goes through the existing `recordScore`/`editScore` flow — round-completion behavior is unchanged.
2. **Finish event.** A "Finish" button (run-screen header) confirms via the custom modal and sets `match.finished = true`. When finished the event is locked: score entry, score editing, and roster changes (add/remove/toggle/rename/gender) are blocked at the state level and their controls are disabled in the UI; the header shows a "Finished" badge and court titles get a "locked" tag. The Leaderboard tab shows a final summary banner (event name/date/format + winner = rank 1) that Feature 011's share image will consume, and the main menu shows the "Finished" badge from `match.finished` (in addition to the all-rounds-played heuristic). "Undo finish" reopens the event.

## What changed

| File | Nature |
|------|--------|
| `js/state.js` | `finished` in match state + migration (`normalizeMatch`), `finishEvent()`/`unfinishEvent()`, `finished()` accessor; guards return early in `addPlayer`/`removePlayer`/`renamePlayer`/`toggleActive`/`setGender`/`recordScore`/`editScore`/`regenerateUnplayed` when finished |
| `js/runScreen.js` | Score chips (`CHIPS` + `chipsHtml`) + auto-derive `input` listener + chip click handler; Finish/Undo button + Finished badge in header; locked rendering of court cards (disabled inputs, no chips/Save, no Edit, "locked" tag); `playersTab()` disables roster controls when finished; `summaryHtml()` banner in `leaderboardTab()`; `validate()` gains the `0…totalPoints` range check |
| `js/menuScreen.js` | `statusOf()` returns "Finished" when `ev.match.finished` (before the all-rounds-played check) |
| `css/style.css` | `.chips`/`.chip` quick-select styles, `.finished-badge`, `.locked-tag`, `.summary` banner, generic `input/select/button:disabled` opacity |

## Behavior

- Tapping chip 12 on side A sets A=12 and B=`totalPoints−12`; typing a side's score derives the other; out-of-range input is ignored (doesn't stomp the other side).
- Save validates range + exact sum + no ties; `editScore` re-validates the same.
- Finishing locks everything; the leaderboard shows the final summary with the winner (rank 1); Undo reopens.
- Menu cards show Finished for finished events even if rounds remain unplayed.

## Verification

- `node --check` passed on every JS file.
- Headless checks (see `/tmp` harness):
  - finish guards: player mutations, `recordScore` and `editScore` are no-ops while finished and work again after `unfinishEvent`; `editScore` still rejects ties;
  - auto-derive math: chip tap sets the side and derives `total − n`; typing derives the other side; out-of-range values are ignored;
  - rendering: when not finished the courts tab shows chips + Finish button; when finished it shows disabled inputs, no chips/Save, a "locked" tag, Undo button and header badge; the leaderboard shows the summary banner (winner + name/format/date); the players tab disables all roster controls.
- Manual browser pass: chip tap + manual entry save instantly and never allow ties/over-total; Finish event → summary shown and edits locked; menu badge updates.

## Rollback

```
cp -r memory-bank/changes/008-faster-score-entry-finish-flow/before/* ./
```
