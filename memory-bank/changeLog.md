# Change Log

Chronological record of changes applied to the project. Each entry links to its full code snapshots in `changes/`.

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