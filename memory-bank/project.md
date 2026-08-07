# Project — Padel Match Maker

A fully client-side web app for organising padel match making. All data persists in the browser via `localStorage`; no backend. Vanilla HTML / CSS / JS (classic scripts, no build step — works via `file://` and any static server).

## Stack

- `index.html` — app shell; loads classic scripts in order.
- `css/style.css` — mobile-first, courtside-friendly styling.
- `js/` — plain classic scripts sharing one global namespace `window.PadelApp`.

## Architecture

```
index.html            App shell; Menu / Setup / Run screens toggled via JS render
css/style.css         Mobile-first courtside styling
js/
  storage.js          localStorage read/write (app-wide versioned key `padelApp_v1`)
  state.js            Events + per-event match state and all actions
  matchmaking.js      Pure round generation + full-schedule builder
  scoring.js          Pure leaderboard computation (recomputed from played rounds)
  setupScreen.js      Screen: players, format, courts, scoring (per event)
  runScreen.js        Screen: courts, leaderboard, players, round nav, history
  menuScreen.js       Main menu: event list, create/open/delete events
  app.js              Bootstrap + screen switching
```

## Screens / routing

`app.js` picks the screen on every state change:

1. **Menu** — shown when no event is open (`currentEvent() === null`).
2. **Setup** — when the current event exists but `match.started === false`.
3. **Run** — when the current event's `match.started === true`.

## Data model (localStorage, single versioned key `padelApp_v1`)

```
{
  version: 1,
  events: [
    {
      id: number,
      name: string,
      date: string,            // datetime-local value, may be empty
      match: {                 // exactly the old single-event state shape
        players: [ {id, name, gender: 'M'|'F'|null, active} ],
        settings: { format, numCourts, totalPoints, compensation: bool,
                    scoringPriority: [{key, dir}] },
        rounds: [ {roundNumber, courts:[{teamA, teamB, score|null}],
                   byes:[], played} ],
        currentIndex, nextId, started
      }
    }
  ],
  currentEventId: number|null, // the event being viewed/edited
  nextEventId: number
}
```

- Leaderboard is always recomputed from played rounds, never stored.
- `currentEventId` selects which event the `state` API operates on.

## Key behaviors

- **Concurrent events**: multiple events exist independently; each keeps its own players, format, rounds and scores. Switching between them never touches another event's data.
- **Roster change** (add/remove/toggle active) re-runs the schedule from the first unplayed round onward; played rounds and scores stay untouched.
- **Total-points scoring**: a court ends when the two sides' scores add up to **exactly** `settings.totalPoints` (default 21); higher side wins; ties are rejected. The old "first to / win by 2" rules were removed (legacy `winPoints` auto-migrates).
- **Minimum players**: an event needs `numCourts × 4` active players (e.g. 2 courts → 8). The setup screen enforces this in its hint, live warning, and Start validation; the Courts select persists on change.
- **Setup field persistence**: setup controls never reset on re-render. `#s-wins` (Total points) persists on `input` via `updateSettingsSilent` (no re-render, so typing/focus is uninterrupted); Format, Courts, and Compensation persist on `change`, and priority edits call `updateSettings(currentFormPatch())` which mirrors the live DOM values of all setup fields into settings before re-rendering. `renderAll()` preserves scroll position on same-screen re-renders (re-focusing the equivalent element in the new DOM and re-applying the scroll restore on the next tick to defeat the browser's async focus-scroll jump) and resets to top on screen switches.
- **Compensation points** (`settings.compensation`, off by default): players who play fewer matches than the most-played player get `(maxMatches − matches) × floor(totalPoints/2)` extra points. The leaderboard shows it as `pf (+N)` and the `Points` ranking key uses `pf + comp` (affects ranking).
- **Score entry** marks the court played; when all courts in a round are done the round plays and (for Mexicano) the next round regenerates.
- **Edge cases**: fewer than `numCourts × 4` active players → warn and block start; unequal gender counts handled gracefully; full state restores from localStorage on reload.

## Rendering / listener hygiene

`app.js` `renderAll()` mounts a **fresh `#app` div** on every state change and `replaceChild`s it into the container. Screens delegate clicks/input via `root.addEventListener`; because the node is replaced each render, old listeners are discarded and none accumulate.

## Conventions

- Classic scripts (IIFE), one namespace `var PadelApp = window.PadelApp || {}`.
- No build step, no external dependencies, no framework.
- Escape user-provided strings before injecting into HTML (`esc()` helpers exist in the screen modules).
