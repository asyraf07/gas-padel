# Active Context

Current working state of the project and the latest decisions.

## Latest change applied

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
| `js/setupScreen.js` | Per-event setup; header shows event name + back |
| `js/runScreen.js` | Per-event run; header shows event name + back |
| `js/menuScreen.js` | Main menu: list / create / open / delete events |
| `js/app.js` | Routes menu ↔ setup ↔ run; mounts a fresh `#app` node each render |

## Next steps / open items

- None tracked yet.