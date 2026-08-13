# Change 011b — Score modal cancel fix & live score counter

## Summary

`plan # Bugfix 011b`:

1. **Cancel button fix.** The score-picker modal rendered a Cancel button (`data-m="cancel"`) but its click handler only listened for `.pick-btn` taps, so Cancel did nothing. `picker()` now also handles `[data-m="cancel"]` (closes the modal without picking a value).
2. **Live score counter mode.** The quick-input picker gets a corner icon (`±`, `opts.corner`) that switches the modal into a live score counter. The counter shows both teams' names with a `−`/`+` tally per side; tapping updates that side's score on the event page immediately, capped so the total never exceeds `totalPoints`. A single action button reads **Close** while the match is in progress — tapping it closes the modal but leaves the current tally on the court-card inputs. When the two scores sum to `totalPoints` the same button relabels to **Finish** and saves via the existing `recordScore`/`editScore` flow (same validation as the Save button). Live mode is sticky per court (`view.liveMode[round + ':' + court]`): tapping either score afterwards reopens the live counter with the current score, and a corner icon (`← pick`) on the counter switches back to quick input.

## What changed

| File | Nature |
|------|--------|
| `js/modal.js` | `picker()` now handles `[data-m="cancel"]` and accepts an optional corner button (`opts.corner` html + `opts.onCorner()` callback, `title` tooltip); new `custom(html)` opens an arbitrary-content modal and returns its overlay; `custom` exported |
| `js/runScreen.js` | `openScorePicker` passes the `±` corner that flips `view.liveMode[round:court]` and opens `openLiveCounter(ci, side)`; new `openLiveCounter` (team names, `−`/`+` bumps capped at `totalPoints`, live updates of `#sc-a-N`/`#sc-b-N`, Close/Finish button via `[data-live-action]`, corner back to quick input); score-input tap handler honors `view.liveMode`; Save handler and Finish both use extracted `saveCourtScore(ci)`; `liveMode` cleared on leaving the event |
| `css/style.css` | `.modal-title` becomes a flex row with `.modal-corner` button support; `.live-counter`/`.live-team`/`.live-name`/`.live-row`/`.live-score`/`.live-minus`/`.live-plus`/`.live-vs`/`.live-finish` styles |

## Behavior

- Tapping a score on an unplayed, unlocked court opens the quick picker (0..`totalPoints`); its Cancel button now actually closes the modal.
- The `±` corner on the picker switches to the live counter; from then on tapping either score on that court opens the live counter directly, showing the current tally.
- `+`/`−` tally both sides live; the total can never exceed `totalPoints`.
- While `scoreA + scoreB < totalPoints` the action button reads **Close** — closing keeps the tally visible on the court card (nothing saved).
- At `scoreA + scoreB === totalPoints` the button reads **Finish** and saves (records or edits the score, round-complete alert preserved).
- The live counter's `← pick` corner returns to quick input for that court.

## Verification

- `node --check` passed on every JS file.
- Headless (see `/tmp/opencode/live_counter_test.js`, 16 checks):
  - picker opens with the `±` corner icon; Cancel closes without picking;
  - corner switches picker → live counter (both teams at 0-0, button = Close);
  - `+`/`−` update the court-card inputs live; bumps cap at `totalPoints` (19-2 for total 21);
  - button relabels to Finish at target; Finish calls `recordScore(0, 0, 19, 2)` and closes;
  - re-tapping the score reopens the live counter with the current score; Close keeps 19-5 on the page without saving;
  - live counter corner switches back to quick input, and re-tapping then opens quick input again;
  - picking 17 in the grid still sets 17-4.
  - Prior tests still pass: `picker_test.js` (tapped value returned), `setup_gsel_test.js`.
- Manual: tap score → picker; Cancel closes it; `±` → live counter; tally to target; button becomes Finish and saves; close mid-tally and reopen → counter resumes with the same score.

## Rollback

```
cp -r memory-bank/changes/011b-score-modal-cancel-live-counter/before/* ./
```
