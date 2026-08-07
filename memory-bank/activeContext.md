# Active Context

Current working state of the project and the latest decisions.

## Latest change applied

**001 — Multi-event main menu** (see `changes/001-multi-event-main-menu/CHANGE.md`).

- Added a main menu (`js/menuScreen.js`) that lists all events.
- Each event holds a **name**, a **time/date**, and its **match** (players, format, rounds, scores).
- Multiple events can **run at the same time** — all persist independently and the user switches between them via the menu or the `← Events` back button on the Setup/Run screens.
- Replaced the destructive "End event" reset with a non-destructive back-to-menu action; event deletion lives in the menu (with confirm).

## Current file layout (after change 001)

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
| `js/app.js` | Routes menu ↔ setup ↔ run |

## Next steps / open items

- None tracked yet.