# Change 009 — Player management: removal confirm, round-page substitution & regeneration toggle

## Summary

Safer, more flexible player management (plan `# Feature 009`):

1. **Remove-player confirm.** The "Remove player" button on the Setup list and the Players tab opens the custom modal ("Remove NAME? Unplayed rounds will be regenerated without them; played rounds keep their scores.") before calling `removePlayer`. Played rounds keep showing a removed player's name as "(removed)" (existing `pName` behavior).
2. **Change player on the round page.** Each unplayed, unscored court card renders a per-slot picker (`<select class="slotpicker">`) over the active roster (with a "+ Add player…" option that prompts for a name, adds, then swaps in). Selecting one calls the new `state.swapPlayer(roundIdx, courtIdx, slotIdx, newId)` which swaps that slot's id; played rounds and their scores are untouched. With auto-regeneration ON the swap applies and the rest of the schedule rebalances via `buildUnplayed`, then the manual swap is re-applied so the current court keeps the choice; with OFF only that court is updated. Regeneration is skipped when any unplayed round holds saved scores (so partial rounds aren't wiped).
3. **Regeneration toggle.** New `settings.autoRegenerate` (default `true`), controlled by a checkbox on the Players tab. When OFF, `addPlayer`/`removePlayer`/`toggleActive`/`setGender` stop calling `buildUnplayed`, and a manual **"Regenerate rounds"** button appears on the Courts tab (`regenerateUnplayed`).
4. **Prevent duplicate names.** `addPlayer`/`renamePlayer` reject a case-insensitive duplicate name (trimmed) and return an error string; the UI surfaces it via the custom modal instead of adding.

## What changed

| File | Nature |
|------|--------|
| `js/state.js` | `settings.autoRegenerate` default; `nameTaken()`; `addPlayer`/`renamePlayer` return error strings (empty/duplicate) and guard `buildUnplayed` behind `autoRegenerate`; `removePlayer`/`toggleActive`/`setGender` guard `buildUnplayed` behind `autoRegenerate`; new `swapPlayer` (+ `hasPartialRound`, `applySlotSwap`) |
| `js/runScreen.js` | `slotSel`/`teamSlotsHtml` pickers in `courtCards` (unplayed unscored courts); `data-act="regen"` button in `courtsTab` when `autoRegenerate` off; auto-regenerate checkbox in `playersTab`; remove-player confirm modal; add/rename error handling; `change` handlers for `.slotpicker` (incl. "+ Add player…") and `[data-act="autoregen"]` |
| `js/setupScreen.js` | Remove-player confirm modal; add/rename error handling for duplicates |
| `css/style.css` | `.team.pick`, `.slotpicker`, `.regen-row`, `.chk.auto` |

## Behavior

- Removing a player requires a confirm; after removal, unplayed rounds show them as "(removed)" until regenerated.
- On the round page you can swap any player on an unplayed, unscored court; ON mode rebalances the rest of the schedule (with partial rounds protected), OFF mode only updates that court.
- With auto-regeneration OFF, roster edits leave the schedule untouched until "Regenerate rounds" is pressed.
- Duplicate names (case-insensitive) are rejected with a modal message.

## Verification

- `node --check` passed on every JS file.
- Headless checks (see `/tmp` harness):
  - `autoRegenerate` OFF keeps `rounds` byte-identical across add/remove/toggle/gender; ON triggers `buildUnplayed`;
  - duplicate add/rename rejected (case- and whitespace-insensitive); empty name rejected; self-rename allowed;
  - `swapPlayer` applies to the slot (OFF), calls `buildUnplayed` and re-applies the swap (ON, including after regeneration replaces the round), rejects played rounds / scored courts / players already on the court / inactive players, skips regeneration when partial rounds exist, and is blocked when the event is finished;
  - rendering: slot pickers appear on unplayed unscored courts (and not on played/finished ones), "+ Add player…" is present, the regen button shows when `autoRegenerate` is off, and the Players tab checkbox reflects the setting.
- Manual browser pass: remove requires confirm; changing a player on a court updates future rounds only; toggling regeneration changes whether edits re-schedule.

## Rollback

```
cp -r memory-bank/changes/009-player-mgmt-substitution-regen-toggle/before/* ./
```
