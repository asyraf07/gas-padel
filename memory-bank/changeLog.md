# Change Log

Chronological record of changes applied to the project. Each entry links to its full code snapshots in `changes/`.

## 008 — Faster score entry & finish-event flow

**Applied:** yes

**Summary:** (1) Quick score entry: each court side shows preset score chips (11/12/15/18/21, filtered to ≤ totalPoints); tapping a chip or typing derives the opponent side as `totalPoints − score`, so ties/over-totals are impossible and validation reduces to `0 ≤ score ≤ totalPoints`. Saving uses the existing `recordScore`/`editScore` flow — round completion is unchanged. (2) Finish event: a "Finish" button (run header) confirms via the custom modal and sets `match.finished = true`. When finished the event is locked — score entry/edit and roster changes (add/remove/toggle/rename/gender) are blocked at the state level and disabled in the UI; the header shows a "Finished" badge and court cards get a "locked" tag; the Leaderboard shows a final summary banner (event name/date/format + winner = rank 1) that Feature 011's share image will feed; the menu shows Finished from `match.finished` in addition to the all-rounds-played check. "Undo finish" reopens the event.

**Files changed:**

| File | Nature |
|------|--------|
| `js/state.js` | `finished` flag + migration; `finishEvent()`/`unfinishEvent()`/`finished()`; guards on roster + score actions |
| `js/runScreen.js` | Score chips + auto-derive; Finish/Undo button + badge; locked court/players rendering; summary banner; range validation |
| `js/menuScreen.js` | Finished status from `match.finished` |
| `css/style.css` | Chips, finish badge, locked-tag, summary banner, disabled-opacity |

**Snapshots:** `changes/008-faster-score-entry-finish-flow/before/` and `after/`.
**Details:** `changes/008-faster-score-entry-finish-flow/CHANGE.md`.

---

## 007 — Leaderboard polish: collapsible priority editor, table-first layout & overflow fix

**Applied:** yes

**Summary:** Polish of the Leaderboard tab. (1) The leaderboard table (with its "Ranked by:" line and column legend) is now the first element of the tab; the ranking-priority editor moved below it. (2) The `#prio` editor is wrapped in a `<details class="prio-panel">` ("Ranking priority") so it's collapsed by default, but editing still applies immediately and re-sorts the table (the shared `PadelApp.prio.bind` callback flow is unchanged). (3) The `↑/↓` direction toggle + "high first"/"low first" text in `prioEditor.js` is replaced by a thumb-sized segmented **High/Low** control (active direction highlighted), used on both Setup and Leaderboard. (4) Overflow fix: the `.lb` table is wrapped in a `.lb-scroll` `overflow-x:auto` container with `min-width: 560px` so the 9 columns scroll horizontally on phones instead of crushing, and `.lbname` long names truncate with ellipsis (`<span class="n">` inside the cell, `max-width` + `overflow-wrap:anywhere` fallback).

**Files changed:**

| File | Nature |
|------|--------|
| `js/runScreen.js` | `leaderboardTab()` reordered (table first); `#prio` into `<details class="prio-panel">`; `.lbname` name in `<span class="n">`; table in `.lb-scroll` |
| `js/prioEditor.js` | `.tgl` button + `.prio-dir` text → segmented High/Low control; `[data-act="dir"]` sets `dir` |
| `js/setupScreen.js` | Setup ranking-priority hint wording → "set High/Low order" |
| `css/style.css` | `.lb-scroll` + `min-width`, `.lbname` truncation, `.seg`/`.seg-btn`, `details.prio-panel`; removed `.prio-dir` |

**Snapshots:** `changes/007-leaderboard-polish-overflow/before/` and `after/`.
**Details:** `changes/007-leaderboard-polish-overflow/CHANGE.md`.

---

## 006 — Event editing, leaderboard polish & UX improvements

**Applied:** yes

**Summary:** (1) The ranking-priority editor is extracted into a shared `js/prioEditor.js` used by both the Setup screen and the Leaderboard tab (edits apply immediately and re-sort the table), and the Leaderboard shows a column legend. (2) Rename/edit for players, events, dates and saved scores: pencil buttons rename players, an Edit button on each menu event card and on the Setup/Run header edits the event name + `datetime-local` date, the event date shows in both event-page headers, and a played court's score gets an Edit button that re-opens pre-filled inputs — `editScore` re-validates (no ties, totals exactly `totalPoints`) and regenerates future rounds. (3) UX: a custom modal system (`js/modal.js`) replaces every `window.alert`/`confirm`; court cards stack each team's names above its own score input; and `aggregates()`/streak now count any court with a saved score, so the leaderboard updates the moment a score is saved (not only when a round completes). Also fixed two bugs from the in-progress implementation: `modal.prompt`/`form` callbacks read a nulled `current` (crash), and `editScore` wiped partially-played rounds — it now regenerates only when the edited round is fully played.

**Files changed:**

| File | Nature |
|------|--------|
| `js/modal.js` (new) | Custom modal: `PadelApp.modal.alert/confirm/prompt/form`, overlay on `document.body` |
| `js/prioEditor.js` (new) | Shared priority editor (`PadelApp.prio.html/bind`) used by Setup & Leaderboard |
| `index.html` | Loads `js/modal.js`, `js/prioEditor.js` |
| `js/state.js` | `renamePlayer`, `renameEvent`, `setEventDate`, `editScore` (regenerates only when round played) |
| `js/scoring.js` | `aggregates()` + streak count scored courts regardless of `round.played` |
| `js/runScreen.js` | Header date + edit button; priority card + legend; paired score layout; score Edit; rename pencil; modal |
| `js/setupScreen.js` | Shared priority editor; rename pencil; header date + edit button; modal start warnings |
| `js/menuScreen.js` | Event Edit button (name + date); modal delete/validation |
| `css/style.css` | Modal overlay, legend, paired score layout, header date, edit buttons |

**Snapshots:** `changes/006-event-editing-leaderboard-ux/before/` and `after/`.
**Details:** `changes/006-event-editing-leaderboard-ux/CHANGE.md`.

---

## 005 — Setup field persistence & scroll preservation

**Applied:** yes

**Summary:** Fixed setup-screen bugs where user input was lost on re-render. The compensation checkbox (and Format / Total points) never persisted, and priority/courts re-renders rebuilt from stale settings (total points reverting to 21, compensation unchecked). `#s-wins` now persists on `input` via a new `updateSettingsSilent` (no re-render), and every setup-field change / priority edit persists the full live form via `currentFormPatch()` before re-rendering, so nothing can revert. Also fixed the jump-to-top: `renderAll()` preserves the scroll position on same-screen re-renders, re-focuses the equivalent element in the new DOM, and re-applies the scroll restore on the next tick to defeat the browser's async focus-scroll; it resets to the top on screen switches.

**Files changed:**

| File | Nature |
|------|--------|
| `js/setupScreen.js` | `#s-wins` `input` → `updateSettingsSilent`; `currentFormPatch()`; `#s-format`/`#s-courts`/`#s-comp` `change` + priority handlers persist the full live form |
| `js/state.js` | New `updateSettingsSilent(patch)` (save + setScore, no notify) |
| `js/app.js` | `renderAll()` tracks current screen; preserves scroll on same-screen re-renders |

**Snapshots:** `changes/005-setup-field-persist-scroll/before/` and `after/`.
**Details:** `changes/005-setup-field-persist-scroll/CHANGE.md`.

---

## 004 — Setup improvements, compensation points & leaderboard priority

**Applied:** yes

**Summary:** (1) Minimum players now scales with courts — `numCourts × 4` instead of a hard-coded 4, applied to the hint, live warning, and Start validation; the Courts select persists on change so the warning updates live. (2) The player-name input keeps focus after adding a player. (3) New **compensation points** toggle (`settings.compensation`): players below the most-played player get `(maxMatches − matches) × floor(totalPoints/2)` extra points, shown as `pf (+N)` in the leaderboard Pts column and included in the `Points` ranking key. (4) The Leaderboard tab shows a read-only "Ranked by:" priority line (appends "compensation points" when on).

**Files changed:**

| File | Nature |
|------|--------|
| `js/state.js` | `settings.compensation: false` default |
| `js/setupScreen.js` | `minPlayers()` = courts×4; live `#s-courts` change; focus retention; `#s-comp` checkbox |
| `js/scoring.js` | `row.comp` in `aggregates()`; `valueForKey('points')` → `pf + comp` |
| `js/runScreen.js` | `rankByHtml()` priority line; `(+N)` in Pts column |
| `css/style.css` | `.comp`, `.rankby` styles |

**Snapshots:** `changes/004-setup-compensation-leaderboard/before/` and `after/`.
**Details:** `changes/004-setup-compensation-leaderboard/CHANGE.md`.

---

## 003 — Event-listener accumulation & priority-editor fixes

**Applied:** yes

**Summary:** Fixed bugs caused by event listeners stacking on the persistent `#app` root across re-renders (priority editor adding all keys / move no-ops, round-nav jumps into negative numbers, unclosable Save alert, progressive slowdown). `renderAll()` now mounts a fresh `#app` node each render. Also fixed the priority direction-toggle selector (`.t` → `.tgl`) and leaderboard ranking for `opp`/`losses` keys.

**Files changed:**

| File | Nature |
|------|--------|
| `js/app.js` | `renderAll()` mounts a fresh `#app` node per render (discards old listeners) |
| `js/setupScreen.js` | Direction-toggle handler selector `.t` → `.tgl` |
| `js/scoring.js` | `valueForKey()` maps `opp` → points against, `losses` → losses |

**Snapshots:** `changes/003-event-listener-fixes/before/` and `after/`.
**Details:** `changes/003-event-listener-fixes/CHANGE.md`.

---

## 002 — Total-points scoring

**Applied:** yes

**Summary:** Replaced "first to N" with a **total-points** rule — a court ends when the two scores sum to exactly `totalPoints` (default 21), higher side wins, no ties. Removed the "Win by 2" option and migrated legacy `winPoints` settings.

**Files changed:**

| File | Nature |
|------|--------|
| `js/state.js` | `totalPoints: 21` default; legacy `winPoints`/`winByTwo` migration |
| `js/setupScreen.js` | "Total points" field; removed "Win by 2" checkbox |
| `js/runScreen.js` | Header label + `validate()` enforces `a + b === totalPoints`, no ties |

**Snapshots:** `changes/002-total-points-scoring/before/` and `after/`.
**Details:** `changes/002-total-points-scoring/CHANGE.md`.

---

## 001 — Multi-event main menu

**Applied:** yes

**Summary:** Wrapped the single-event app in an events layer. A new main menu lists all events; each event holds a name, a time/date, and its independent match state; multiple events can run at the same time and be switched between freely.

**Files changed:**

| File | Nature |
|------|--------|
| `js/menuScreen.js` | **New** — main menu (event list + create/open/delete) |
| `js/storage.js` | Rewrite — app-wide `padelApp_v1` key + legacy `padelState_v1` migration |
| `js/state.js` | Rewrite — events container + per-event match state |
| `js/app.js` | Routing (menu / setup / run) |
| `js/setupScreen.js` | Header: event name + back-to-menu |
| `js/runScreen.js` | Header: event name + back-to-menu; removed destructive "End event" reset |
| `css/style.css` | Event cards, status badges, header row, datetime input |
| `index.html` | Loads `menuScreen.js` |

**Snapshots:** `changes/001-multi-event-main-menu/before/` and `after/`.
**Details:** `changes/001-multi-event-main-menu/CHANGE.md`.

---

_Historical imports (before memory bank started):_

- `33df245` Add padel match making app prompt
- `9a1df82` Build padel match making app
- `05a536d` Add README

The pre-001 application state (single-event) is exactly what sits in `changes/001-multi-event-main-menu/before/`.