# Change 011 — Modal score picker & setup gender editing

## Summary

`plan # Feature 011` (renumbers the former Feature 011 "Share as image & photo avatars" to **Feature 012**):

1. **Modal score picker replaces the quick-score chips.** The fixed preset chips (11/12/15/18/21) on the Courts tab are gone. Tapping either team's score on an unplayed, unlocked court now opens a custom modal with a grid of tappable options from `0` to `totalPoints` (e.g. 0–21). Picking one sets that side's score and auto-derives the opponent as `totalPoints − score`, so ties and over-totals stay impossible. The score inputs remain the single source of truth (readonly, tap-to-pick), Save keeps using the existing `recordScore`/`editScore` flow, and the picker also works when editing a played score. A new `PadelApp.modal.picker(label, options, onPick)` renders the option grid.
2. **Edit gender on the create-event (Setup) page.** Each player row in Setup now shows the same M / — / F gender select as the Players tab, wired to `state.setGender`, so a gender can be set or changed before the event starts without removing and re-adding the player. The missing-gender badge and the mixed-mode gender-parity warning update live (re-render).

## What changed

| File | Nature |
|------|--------|
| `js/modal.js` | New `picker(label, options, onPick)` — a `.pick-grid` of `.pick-btn` buttons; tapping one closes and calls `onPick(value)`; Cancel via `data-m="cancel"` |
| `js/runScreen.js` | Removed `CHIPS`/`chipsHtml` and the `.chip` + auto-derive `input` listeners; court-card score inputs are now `readonly` with `data-pick`/`data-court`; new `openScorePicker(ci, side)` (in `bind`) builds `0..totalPoints` options and sets both inputs (deriving the opponent) |
| `js/setupScreen.js` | `.gsel` gender select per Setup player row (hidden in `fixed` pairing); a `change` listener calls `state.setGender` |
| `css/style.css` | `.pick-grid`/`.pick-btn` styles; `.tscore input[readonly]` pointer cursor; removed `.chips`/`.chip` |
| `index.html` | (unchanged — no new scripts) |
| `PLAN.md` | New Feature 011; former Feature 011 → Feature 012 (sub-features 12.1/12.2, snapshot path `012-share-image-avatars`) |

## Behavior

- On the Courts tab there are no preset score chips anymore: tapping a score opens the picker modal (0 → `totalPoints`), picking a value fills the tapped side and auto-derives the opponent. Locked/finished courts show disabled inputs (no picker). Played-score editing uses the same picker.
- On the Setup screen each player row has a gender select (M / — / F); changing it updates the row badge and, in mixed mode, the equal-men/women warning live. `fixed` pairing shows no gender control.
- Normal, Mixed and Fixed matchmaking are otherwise unchanged.

## Verification

- `node --check` passed on every JS file.
- Headless checks (see `/tmp`):
  - `modal.picker` renders one button per option `0..totalPoints` (22 buttons for 21) and invokes `onPick(value)` with the tapped value (tapped 17 → 17);
  - `PadelApp.setup.layout()` shows a `.gsel` per player in mixed and normal pairing (4 rows → 4 selects, with `selected` on the current gender and the missing-gender badge intact) and none in fixed pairing;
  - `PadelApp.run.layout()` court cards render `#sc-a-N`/`#sc-b-N` as `readonly` with `data-pick`, no `chips`/`chip` markup anywhere, and disabled inputs when the event is finished.
- Manual browser pass: tap a score → picker modal opens 0..21; picking 17 sets 17 on that side and `totalPoints − 17` on the other; editing a played score opens the same picker; Setup rows show the gender select and the mixed parity warning updates as genders change.

## Rollback

```
cp -r memory-bank/changes/011-modal-score-picker/before/* ./
```