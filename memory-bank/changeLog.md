# Change Log

Chronological record of changes applied to the project. Each entry links to its full code snapshots in `changes/`.

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