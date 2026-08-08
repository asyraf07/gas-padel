# Active Context

Current working state of the project and the latest decisions.

## Latest change applied

**007 — Leaderboard polish: collapsible priority editor, table-first layout & overflow fix** (see `changes/007-leaderboard-polish-overflow/CHANGE.md`).

- The Leaderboard tab now shows the table first (with "Ranked by:" + column legend); the ranking-priority editor is collapsed behind a `<details class="prio-panel">` ("Ranking priority") yet still applies edits immediately.
- The direction toggle is a thumb-sized segmented **High/Low** control (`.seg`/`.seg-btn`) in `prioEditor.js`, shared by Setup and Leaderboard.
- Overflow fix: the `.lb` table sits in an `.lb-scroll` `overflow-x:auto` container (`min-width: 560px`) so it scrolls horizontally on phones; long names truncate via ellipsis (`<span class="n">` + `.lbname` `max-width`).
- Setup screen is unchanged except for the priority hint wording.

**Previous change:**

**006 — Event editing, leaderboard polish & UX improvements** (see `changes/006-event-editing-leaderboard-ux/CHANGE.md`).

- The ranking-priority editor is a shared module (`js/prioEditor.js`, `PadelApp.prio.html/bind`) used by both Setup and the Leaderboard tab; Leaderboard edits re-sort instantly and a column legend explains every header.
- Rename/edit: pencil buttons rename players (Players tab + Setup list); Edit buttons on menu event cards and both event-page headers rename the event / change its date via a custom modal; the event date displays in the Setup and Run headers.
- A played court's score has an Edit button → `editScore` re-validates and regenerates future rounds from the updated standings.
- Custom modals (`js/modal.js`) replace every `window.alert`/`confirm`; court cards stack names above each team's score input; `aggregates()`/streak count any scored court so the leaderboard updates live as soon as a score is saved.
- Two implementation bugs fixed: `modal.prompt`/`form` callbacks no longer read a nulled `current` (they capture the overlay), and `editScore` regenerates only when the edited round is fully played (partial rounds aren't wiped).

**Previous change:**

**005 — Setup field persistence & scroll preservation** (see `changes/005-setup-field-persist-scroll/CHANGE.md`).

- Setup fields never reset on re-render: `#s-wins` persists on `input` via new `updateSettingsSilent` (no re-render, keeps focus), and every setup-field change / priority edit persists the full live form (`currentFormPatch()`) before re-rendering — so changing courts or the ranking priority no longer reverts total points to 21 or unchecks compensation.
- `renderAll()` preserves scroll position on same-screen re-renders (re-focuses the equivalent element in the new DOM and re-applies the scroll restore on the next tick to beat the browser's async focus-scroll jump) and resets to top on screen switches — fixing the jump-to-top on interaction.

**Previous change:**

**004 — Setup improvements, compensation points & leaderboard priority** (see `changes/004-setup-compensation-leaderboard/CHANGE.md`).

- Minimum players is now `numCourts × 4` (was hard-coded 4) across the empty-roster hint, live warning, and Start validation; the Courts select persists on change.
- Player-name input keeps focus after adding a player.
- New `settings.compensation` toggle: per missed match players get `floor(totalPoints/2)` points; leaderboard shows `pf (+N)` and the `Points` ranking key uses `pf + comp`.
- Leaderboard tab shows a read-only "Ranked by:" priority line.

**Previous change:**

**003 — Event-listener accumulation & priority-editor fixes** (see `changes/003-event-listener-fixes/CHANGE.md`).

- **Root cause:** every screen bound click handlers via `root.addEventListener` on the same persistent `#app` element, and `renderAll()` only replaced `innerHTML` — so listeners stacked on every render and one click fired N times.
- **Fix:** `renderAll()` now mounts a **fresh `#app` node** each render (`replaceChild`), discarding old listeners. Also fixed the priority direction-toggle selector (`.t` → `.tgl`) and leaderboard ranking for `opp`/`losses` keys.

**Previous change:**

**002 — Total-points scoring** (see `changes/002-total-points-scoring/CHANGE.md`).

- A court ends when the two scores sum to **exactly** `totalPoints` (default 21); higher side wins, no ties; "Win by 2" removed; legacy `winPoints` settings auto-migrate.

## Current file layout (after change 003)

| File | Purpose |
|------|---------|
| `index.html` | Shell; loads `menuScreen.js` too |
| `css/style.css` | Styling incl. event cards, status badges, header row |
| `js/storage.js` | App-wide key `padelApp_v1` + legacy migration |
| `js/state.js` | Events + per-event match state and actions |
| `js/matchmaking.js` | Round generation (unchanged by 001) |
| `js/scoring.js` | Leaderboard (unchanged by 001) |
| `js/modal.js` | Custom modal popups (`alert`/`confirm`/`prompt`/`form`), added by 006 |
| `js/prioEditor.js` | Shared ranking-priority editor, added by 006 |
| `js/setupScreen.js` | Per-event setup; header shows event name + date + back |
| `js/runScreen.js` | Per-event run; header shows event name + date + back |
| `js/menuScreen.js` | Main menu: list / create / open / edit / delete events |
| `js/app.js` | Routes menu ↔ setup ↔ run; mounts a fresh `#app` node each render |

## Next steps / open items

- None tracked yet.