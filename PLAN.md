# Padel Match Making App — Implementation Plan

## Goal
A fully client-side web app for padel match making. All data persists in the browser via localStorage. No backend. Vanilla JS (classic scripts, no build step — works via `file://` double-click and over any static server).

## Architecture
```
index.html            App shell; Setup / Running screens toggled via CSS
css/style.css          Mobile-first, courtside-friendly (large touch targets)
js/
  storage.js           localStorage read/write (single versioned key `padelState`)
  state.js             Central state + change handlers that regenerate rounds on roster changes
  matchmaking.js       Pure round-generation + full-schedule builder
  scoring.js           Pure leaderboard computation
  setupScreen.js       Screen 1: players, format, courts, win points, scoring priority
  runScreen.js         Screen 2: courts, leaderboard, player management, round nav, history
  app.js               Bootstrap, screen switching, event wiring
```

Plain classic scripts (not ES modules) loaded in order, sharing a global, so the app runs without a server.

## Data Model (localStorage, single versioned key `padelState`)
- `players[]`: `{id, name, gender:'M'|'F'|null, active}`
- `settings`: `{format, numCourts, winPoints, winByTwo, scoringPriority:[{key,dir}]}`
- `rounds[]`: `{roundNumber, courts:[{teams:[[id,id],[id,id]], byes:[]}], results:[{pointsA,pointsB}], played}`
- `currentIndex`: index of the first unplayed round

Leaderboard is always recomputed from played rounds (never stored).

## Tournament Formats
1. **Americano** — complete round-robin schedule of all rounds generated upfront at start.
   - Deterministic doubles round-robin builder over the full active roster → partner & opponent uniqueness exhausted.
   - Each round's players grouped into courts of 4 by capacity; overflow → byes; odd counts naturally rotate byes.
2. **Mixed Americano** — same schedule but every team forced to 1 male + 1 female; unequal genders handled gracefully (mixed pair + best available, or byes).
3. **Mexicano** — ranking-dependent; after each completed round it generates the next round from current points (top-ranked pairing), re-sorted every round.
4. **Mixed Mexicano** — same as Mexicano but every team forced to 1 male + 1 female.

## Matchmaking Algorithm (priority order)
1. **Court capacity**: players on court = largest multiple of 4 ≤ min(active players, courts×4); the rest get byes.
2. **Play count balance**: candidates sorted by fewest `matchesPlayed` first.
3. **Order / fairness**: tie-break so the people who've waited longest get on court while the most-recent players take byes.
4. **Uniqueness (americano)**: avoid repeated partners/opponents; full round-robin exhausts the combos.
5. **Mixed constraint**: never same-gender partners (1M+1F teams).

## Key Behaviors
- **Roster change** (add/remove/toggle active) → re-run the schedule from the first unplayed round onward; played rounds and their scores stay untouched. Removing a player mid-round regenerates the unplayed round without them.
- **Score entry** → mark the court played; when all courts in a round are done the round plays and the next round is generated; leaderboard recomputes live.
- **Edge cases**: fewer than 4 active players → warn and block start; unequal gender counts handled gracefully; full state restores from localStorage on reload.

## UI / UX
- **Setup (Screen 1)**: player list (name + gender; gender only required in mixed modes), format select, number of courts, "first to X" win points + win-by-2 toggle, scoring-priority editor (ordered list with add/remove/move, each direction), Start button (validates ≥4 active players).
- **Running (Screen 2) tabs**:
  - **Courts**: current round's game cards with per-court score entry, next/prev round navigation, expandable played-round history.
  - **Leaderboard**: sorted by the selected scoring priority; shows Wins, Losses, Points for, Points against, Points diff, Matches played, Streak.
  - **Players**: add, remove, and toggle active/inactive without losing match progress.
- Mobile-first responsive layout for use on phones courtside.

## Verification (no committed test suite)
- Smoke-test the pure modules (`matchmaking.js`, `scoring.js`) headlessly with `node` during development to sanity-check balance/fairness invariants.
- Manual browser pass for the full flow: setup → play rounds → mid-game roster changes → reload restores state.
```

---

# Feature 004 — Setup improvements, compensation points & leaderboard priority

## Goal
Four UX/scoring enhancements for the setup and leaderboard screens.

## Sub-features

1. **Minimum players depends on court count**
   - `minPlayers = numCourts × 4` (was a hard-coded 4).
   - Applied to the setup screen's empty-roster hint, the active-player warning, and the Start validation.
   - Changing the Courts select now persists via `updateSettings` so the warning updates live.

2. **Keep focus in the player-name input after adding a player**
   - After `addPlayer()`, re-focus the fresh `#p-name` node via `document.getElementById` (the render replaces the `#app` node, so the old `root` reference is detached).

3. **Compensation points toggle** (`settings.compensation`, default off)
   - Checkbox on the setup screen; "players who play fewer matches get extra points to make up the difference".
   - Per missed match: `floor(totalPoints / 2)` (e.g. 21 → 10 per match).
   - `comp = (maxMatchesAcrossPlayers − player.matches) × floor(totalPoints / 2)`.
   - Leaderboard: Pts column shows `pf (+N)`; the `Points` ranking key uses `pf + comp` (affects ranking).

4. **Leaderboard ranking priority display**
   - The Leaderboard tab now shows a read-only "Ranked by: …" line built from `settings.scoringPriority`; appends "compensation points" when enabled.

## Files
| File | Change |
|------|--------|
| `js/state.js` | `defaultSettings()` gains `compensation: false` |
| `js/setupScreen.js` | `minPlayers()` helper; courts `change` handler; focus retention; `#s-comp` checkbox in `readSettings()` |
| `js/scoring.js` | `row.comp` in `aggregates()`; `valueForKey('points')` → `pf + comp` |
| `js/runScreen.js` | `rankByHtml()` priority line; `(+N)` in Pts column |
| `css/style.css` | `.comp` + `.rankby` styles |

## Verification
- `node --check` on all edited JS files.
- Headless `node` check on `scoring.js`: compensation math (gap × floor(totalPoints/2)), ranking uses `pf + comp`, toggle-off restores raw `pf` ranking.
- Manual browser pass: 2 courts → warning requires 8; add player keeps focus; toggle compensation → `(+N)` shows and ranking shifts; leaderboard shows priority line.
```

---

# Bugfix 005 — Setup field persistence & scroll preservation

Fix for setup-screen bugs found after 004:

- **Setup fields reset on re-render** — the compensation checkbox had no `change` handler, and priority/courts re-renders rebuilt from stale settings (total points → 21, compensation → unchecked). Now `#s-wins` persists on `input` via a new `updateSettingsSilent` (saves without re-rendering, so typing/focus is never interrupted), and every setup-field change / priority edit persists the full live form through `currentFormPatch()` before re-rendering.
- **Page jumped to the top on interaction** — removing the focused element on re-render moves focus to `<body>`, and the browser applies that focus-scroll asynchronously, overriding a synchronous restore. `renderAll()` now preserves `window.pageYOffset` on same-screen re-renders, re-focuses the equivalent element in the new DOM (`preventScroll` when supported), and re-applies the scroll restore on the next tick only if the page drifted above the captured position; it resets to top on screen switches. The add-player focus retention still scrolls to the name input (top) by design.

Files: `js/setupScreen.js` (silent input persistence + full-form sync), `js/state.js` (`updateSettingsSilent`), `js/app.js` (scroll preservation). See `memory-bank/changes/005-setup-field-persist-scroll/`.

---

# Feature 006 — Event editing, leaderboard polish & UX improvements

## Goal
Three enhancements: (1) an editable ranking-priority card and column legend on the Leaderboard tab; (2) rename/edit actions for players, events, dates and saved scores, plus showing the event date on the event page; (3) UX improvements — custom modal popups, a clearer court-score layout, and a leaderboard that updates the moment a score is saved.

## Sub-feature 6.1 — Leaderboard: editable ranking priority card + column legend

1. **Editable priority card on the Leaderboard tab.** Reuse the same editor as Setup (move up/down, toggle direction, add/remove keys). Changes apply immediately and re-sort the table. Extract the editor into a shared `js/prioEditor.js` used by both Setup and the Leaderboard (Setup keeps its `currentFormPatch()` persistence; the shared editor takes an `onChange` callback so nothing from 005 regresses).
2. **Column legend.** A compact helper under/above the table explaining every header: `#` rank, `W` wins, `L` losses, `Pts` points scored (includes compensation `(+N)`), `Agst` points against, `Diff` points difference, `Played` matches played, `Streak` current win/loss streak. Keep the existing "Ranked by:" line.

## Sub-feature 6.2 — Rename & edit: players, events, dates, saved scores

1. **Rename a player.** A pencil button on each player row (Players tab and Setup list) opens the custom modal with the current name pre-filled → `renamePlayer(id, name)`. The leaderboard picks up the new name automatically (it reads from `players`).
2. **Rename an event / change its date.** An Edit button on each menu event card **and** on the event page header opens a custom modal with the name field and a `datetime-local` date field → update the event's meta.
3. **Show the event date on the event page.** Display it in the header of both Setup and Run screens, formatted the same way as the menu card (`fmtDate`).
4. **Change a saved score.** On the Courts tab, a played court's final score gets an Edit button that returns it to the score inputs (pre-filled) with Save. Save calls a new `editScore(roundIdx, courtIdx, a, b)` with the same validation as entry (scores total exactly `totalPoints`, no ties). After editing, the leaderboard and streak recompute and **future rounds regenerate** from the updated standings via `buildUnplayed`.

## Sub-feature 6.3 — UX: custom modals, court score layout, live leaderboard

1. **Custom modal system** replacing every `window.alert` / `window.confirm` (menu delete, name validation, score validation, "Round complete!", Setup start warnings). A single fixed overlay appended to `document.body` (outside `#app`) so it survives re-renders; dismiss via backdrop click or Escape. API: `PadelApp.modal.alert / confirm / prompt`.
2. **Court card score layout.** Put each team's player names directly above that team's score input (vertical pairing) instead of one horizontal `[A] : [B]` row, so it's obvious which score belongs to which team. Keep the Save button.
3. **Live leaderboard.** `aggregates()` and the streak pass now count every court with a saved `score` even in rounds not fully played, so the leaderboard reflects a score as soon as Save is pressed — not only when the whole round completes. (`totalPointsFor` stays played-rounds-only for Mexicano seeding, unchanged.)

## Files
| File | Change |
|------|--------|
| `js/modal.js` (new) | Custom modal: `PadelApp.modal.alert/confirm/prompt` |
| `js/prioEditor.js` (new) | Shared priority-editor markup + binding, used by Setup & Leaderboard |
| `js/state.js` | `renamePlayer`, `renameEvent`, `setEventDate`, `editScore` (regenerates future rounds) |
| `js/scoring.js` | `aggregates()` + streak count scored courts regardless of `round.played` |
| `js/runScreen.js` | Header date + edit button; leaderboard priority card + legend; court score layout; score Edit; player rename pencil; use modal |
| `js/setupScreen.js` | Use shared priority editor + modal; player rename pencil |
| `js/menuScreen.js` | Event Edit button (name + date); use modal for delete/validation |
| `css/style.css` | Modal overlay, priority card, legend, court score pairing, header date, edit buttons |
| `index.html` | Load `js/modal.js`, `js/prioEditor.js` |
| `PLAN.md` | This plan |

## Verification
- `node --check` on all edited/new JS.
- Headless checks: `editScore` validation + future-round regeneration; live `aggregates` includes partial rounds; rename updates leaderboard names.
- Manual: save one court's score mid-round → leaderboard reflects it immediately; edit a played score → table and future rounds update; rename player/event/date via custom modals; delete-event confirm is the custom modal; court card shows names above each score input.

> Implementation of this plan follows the memory-bank convention: create `memory-bank/changes/006-.../` with `CHANGE.md` + before/after snapshots, and update `changeLog.md`, `activeContext.md`, `project.md`, and the README table.