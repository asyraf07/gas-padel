# Change 003 — Event-listener accumulation & priority-editor fixes

## Summary

Fixed a class of bugs all caused by **event listeners accumulating on the persistent `#app` root element**, plus two smaller logic bugs in the setup screen's ranking-priority editor and the leaderboard's ranking keys.

## Root cause

`app.js` `renderAll()` used the same `#app` element every render:

```js
var root = document.getElementById('app');
root.innerHTML = html;      // replaces children only
PadelApp.menu/setup/run.bind(root);   // root.addEventListener(...) again
```

Every screen delegates clicks through `root.addEventListener`, so each render stacked another handler on the same element. After N renders, one click fired N handler bodies. This produced:

- Adding a ranking key on the setup screen added **all** remaining keys (each queued handler read the freshly re-rendered select and added the next available key).
- Move-up/down on the priority editor "sometimes" did nothing — with an even number of stacked handlers the swap ran twice (net zero).
- Round navigation jumped forward/back by multiple steps and could go negative.
- An invalid score Save alert "couldn't be closed" — dismissing it revealed the next stacked handler's alert.
- General slowdown as listener count grew unboundedly.

## What changed

1. **`js/app.js` — fresh root node each render**
   - `renderAll()` now creates a brand-new `#app` div per render and `replaceChild`s it into the container, so the previous node (and its accumulated listeners) is discarded. A click fires exactly once.
   - Confirmed via headless lifecycle simulation: old pattern → 5 listeners after 5 renders; new pattern → always 1.

2. **`js/setupScreen.js` — direction-toggle selector bug**
   - The direction button renders with class `tgl`, but its handler looked up `closest('.t')` (never matched), so tapping ↑/↓ to flip a key's sort direction did nothing. Selector fixed to `.tgl`.

3. **`js/scoring.js` — leaderboard ranking keys**
   - `valueForKey()` fell back to `wins` for unknown keys, so the always-offered ranking options **"Points against"** (`opp`) and **"Losses"** sorted incorrectly. Now mapped to `row.pa` and `row.losses`.

## Verification

- `node --check` passed on all edited `js/*.js`.
- Headless simulation confirmed listener count stays constant with the new render pattern.
- Manual browser checks: one priority key added per click; ↑/↓ direction flips once per tap; move up/down moves one step; round Next/Prev changes by exactly one and never goes negative; wrong-total Save shows a single closable alert; `getEventListeners(document.getElementById('app'))` stays constant across interactions.

## Rollback

```
cp -r changes/003-event-listener-fixes/before/js/*.js js/
```
