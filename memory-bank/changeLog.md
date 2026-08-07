# Change Log

Chronological record of changes applied to the project. Each entry links to its full code snapshots in `changes/`.

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