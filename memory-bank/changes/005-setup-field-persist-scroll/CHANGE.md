# Change 005 — Setup field persistence & scroll preservation

## Summary

Fixed setup (create-event) screen bugs where user input was lost on re-render:

1. **Compensation checkbox (and Format / Total points) did not persist.** The `#s-comp` checkbox had no `change` handler, unlike `#s-courts`, so toggling it never saved to state. Because `renderAll()` rebuilds the whole `#app` subtree on every state change, any interaction (add/remove player, change courts, edit priority, …) recreated the checkbox from `settings.compensation` (still `false`) — resetting it. The same pre-existing reset bug applied to the Format select and the Total-points input.
2. **Total points / compensation reset when changing courts or the ranking priority.** A number input only commits on `change` (blur/Enter), and the priority handlers called `updateSettings({})`, which re-renders without syncing the other fields' current DOM values — so the rebuild read stale `settings` (total points `21`, compensation `false`).
3. **Page jumped to the top on interaction.** Every re-render `replaceChild`s the `#app` node, removing the currently focused element (e.g. the checkbox or button just clicked); focus falls to `<body>`, which sits at the top of the page, so the window scrolled to the top. (Adding a player also scrolls to the top by design, because the feature-004 focus-retention focuses `#p-name`, the top-most input.) The browser performs this focus-scroll **asynchronously**, so it can override a synchronous scroll restore — the page jumps to top whenever the screen is scrollable (i.e. once players exist) and the user then clicks the compensation checkbox / a form field.

## What changed

| File | Nature |
|------|--------|
| `js/setupScreen.js` | `#s-wins` persists on **`input`** via `updateSettingsSilent` (no re-render, so typing/focus is never interrupted); `currentFormPatch()` reads the live DOM values of every setup field; `#s-format`, `#s-courts`, `#s-comp` `change` and all priority handlers (`addprio`, `mv`, `del`, `tgl`) persist the full live form via `updateSettings(currentFormPatch())` so no re-render can revert a field |
| `js/state.js` | Added `updateSettingsSilent(patch)` — merges into settings + saves + refreshes the scoring state ref **without notifying** (no re-render), used for typing-persistent fields |
| `js/app.js` | `renderAll()` now tracks the current screen (menu/setup/run); on a **same-screen** re-render it captures `window.pageYOffset` before `replaceChild` and restores it with `window.scrollTo(0, y)` after; on a **screen switch** it resets to the top. To defeat the browser's async focus-scroll (removing a focused element moves focus to `<body>` and scrolls to the top), it re-focuses the equivalent element in the new DOM (`#prevId`, with `preventScroll` when supported) and re-applies the scroll restore on the next tick only if the page has drifted above the captured position |

## Behavior

- Toggling **Compensation points** now saves immediately and stays checked across every subsequent interaction.
- Changing **Format**, **Courts**, or **Total points** no longer resets when a player is added, courts change, or the ranking priority is edited.
- Because every re-render first persists the current DOM values of all setup fields, values are never lost to the re-render cycle.
- Re-renders on the same screen keep the scroll position (including vs. the browser's async focus-scroll jump); navigating between menu/setup/run starts at the top.
- The feature-004 focus retention still works: `addPlayer()` calls `.focus()` on the fresh `#p-name` after `renderAll` returns, which scrolls the input (top of the page) into view.

## Verification

- `node --check` passed on `setupScreen.js`, `state.js`, and `app.js`.
- Headless `node` check on `state.js`: `updateSettingsSilent` persists without notifying; `updateSettings(fullPatch)` and `updateSettings({})` preserve `totalPoints`/`compensation`.
- Manual browser pass:
  - Toggle compensation, then add players / change courts / edit priority → checkbox stays checked.
  - Change total points, format, and courts, then add a player / edit priority → all fields persist.
  - Add at least one player, scroll down, click the compensation checkbox or a form field → the page does **not** jump to the top.
  - No scroll jump on courts/compensation/priority edits; adding a player still focuses the name input at the top.

## Rollback

```
cp -r memory-bank/changes/005-setup-field-persist-scroll/before/js/*.js js/
```
