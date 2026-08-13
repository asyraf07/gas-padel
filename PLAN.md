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

---

# Feature 007 — Leaderboard polish: collapsible priority editor, table-first layout & overflow fix

## Goal
Polish the Leaderboard tab: make the ranking-priority editor less prominent, put the leaderboard table first, restyle the direction toggle, and fix the cramped/overflowing table on narrow screens.

## Sub-feature 7.1 — Leaderboard layout & priority editor

1. **Table on top.** `leaderboardTab()` currently renders the priority card before the table; reorder so the table (with its "Ranked by:" line) is the first element on the tab.
2. **Collapsible priority editor.** Wrap the `#prio` editor in a `<details>` ("Ranking priority") instead of a full card so it's hidden by default and the table stays in focus. Editing still applies immediately and re-sorts the table (keeps the shared `PadelApp.prio` binding).
3. **Direction-toggle restyle.** Replace the `↑/↓` button + "high first"/"low first" text in `prioEditor.js` with a clearer segmented control (e.g. a two-state High/Low switch) that is thumb-sized.

## Sub-feature 7.2 — Leaderboard overflow fix

1. **Horizontal scroll.** Wrap the `.lb` table in an `overflow-x:auto` container with a `min-width` so the 9 columns don't get crushed on phones.
2. **Name truncation.** Give `.lbname` a `max-width` + `text-overflow: ellipsis` (with `overflow-wrap` fallback) so long names don't break the row.

## Files
| File | Change |
|------|--------|
| `js/runScreen.js` | Reorder `leaderboardTab()`; collapse priority editor behind `<details>` |
| `js/prioEditor.js` | Segmented High/Low direction toggle |
| `css/style.css` | `.lb` scroll container + `min-width`, `.lbname` truncation, toggle styles |
| `PLAN.md` | This plan |

## Verification
- `node --check` on edited JS.
- Manual: on a narrow phone the table scrolls horizontally instead of crushing; the priority editor is collapsed by default and edits still re-sort; the direction toggle is obvious to tap.

> Implementation follows the memory-bank convention: create `memory-bank/changes/007-.../` with `CHANGE.md` + before/after snapshots, and update `changeLog.md`, `activeContext.md`, `project.md`, and the README table.

---

# Feature 008 — Faster score entry & finish-event flow

## Goal
Speed up score entry with quick-select chips and auto-derived opponent scores, and add an explicit "Finish event" action that locks the event and shows a final summary.

## Sub-feature 8.1 — Quick score entry

1. **Quick-select chips.** Each court side shows preset score chips (e.g. 11 / 12 / 15 / 18 / 21). Tapping one sets that side's score.
2. **Manual input with auto-derive.** The numeric input stays for exact values. For both chips and manual entry, the opponent side auto-derives as `totalPoints − score`, so ties and over-totals are impossible; validation reduces to `0 ≤ score ≤ totalPoints`.
3. Both entry styles save via the existing `recordScore`/`editScore` flow (no change to round-completion behavior).

## Sub-feature 8.2 — Finish event

1. **Finish button.** A "Finish event" button (Courts tab / header) asks for confirmation via the custom modal, then sets `match.finished = true`.
2. **Lock.** When finished, score entry, score edit, roster changes (add/remove/toggle/rename) and round-slot edits are blocked; the header shows a "Finished" state.
3. **Summary.** The Leaderboard tab shows a final summary banner (event name/date/format, winner = rank 1) that feeds the share image (Feature 012).
4. **Menu status.** `menuScreen` shows the existing "Finished" badge for finished events.
5. Optionally an "Undo finish" keeps the event editable again.

## Files
| File | Change |
|------|--------|
| `js/state.js` | `finished` in match state + migration; `finishEvent()`/`unfinishEvent()`; guard `recordScore`/`editScore`/player actions when finished |
| `js/runScreen.js` | Score chips + auto-derive in `courtCards`; finish button, locked rendering, summary banner |
| `js/menuScreen.js` | Finished status from `match.finished` (in addition to all-rounds-played) |
| `css/style.css` | Chips, finish button, summary banner, locked-state styles |
| `PLAN.md` | This plan |

## Verification
- `node --check`.
- Headless: auto-derive math (`total − n`); finish blocks score/roster mutations.
- Manual: chip tap + manual entry save instantly and never allow ties/over-total; finish event → summary shown and edits locked; menu badge updates.

> Implementation follows the memory-bank convention: create `memory-bank/changes/008-.../` with `CHANGE.md` + before/after snapshots, and update `changeLog.md`, `activeContext.md`, `project.md`, and the README table.

---

# Feature 009 — Player management: removal confirm, round-page substitution & regeneration toggle

## Goal
Make player management safer and more flexible: confirm removals, allow substituting players on an unplayed round's court, add a toggle that controls whether unplayed rounds auto-regenerate on roster changes, and prevent duplicate player names.

## Sub-feature 9.1 — Remove-player confirm & handling

1. **Confirm before removal.** A "Remove player" button (Setup list and Players tab) opens the custom modal: "Remove NAME? Unplayed rounds will be regenerated without them; played rounds keep their scores." Confirming calls `removePlayer` (existing behavior).
2. Played rounds keep showing the removed player's name as "(removed)".

## Sub-feature 9.2 — Change player on the round page

1. Each **unplayed** court card gains a "change player" action per slot: a picker over the current roster (plus an option to add a new player). Selecting one swaps that slot's id for upcoming rounds; played rounds and their scores are untouched.
2. When auto-regeneration is ON the swap applies and the rest of the schedule rebalances via `buildUnplayed`; when OFF only that court is updated.

## Sub-feature 9.3 — Regeneration toggle

1. New `settings.autoRegenerate` (default `true`). A checkbox on the Players tab: "Auto-regenerate unplayed rounds when players change".
2. When OFF, `addPlayer`/`removePlayer`/`toggleActive`/`setGender` stop calling `buildUnplayed`; a manual **"Regenerate rounds"** button appears on the Courts tab to rebuild on demand.

## Sub-feature 9.4 — Prevent duplicate names

1. `addPlayer`/`renamePlayer` reject a case-insensitive duplicate name (trimmed); the UI surfaces the message via the custom modal instead of adding.

## Files
| File | Change |
|------|--------|
| `js/state.js` | `settings.autoRegenerate`; guard `buildUnplayed` calls behind it + `regenerateUnplayed()`; duplicate-name check; slot-swap action for unplayed courts |
| `js/runScreen.js` | Remove confirm modal; court-card player edit + picker; regenerate button; autoRegenerate checkbox |
| `js/setupScreen.js` | Remove confirm modal; duplicate-name validation |
| `css/style.css` | Player-edit affordances, checkbox, regenerate button |
| `PLAN.md` | This plan |

## Verification
- `node --check`.
- Headless: autoRegenerate OFF keeps rounds unchanged on roster edits; duplicates blocked; slot swap updates the round.
- Manual: remove requires confirm; changing a player on a court updates future rounds only; toggling regeneration changes whether edits re-schedule.

> Implementation follows the memory-bank convention: create `memory-bank/changes/009-.../` with `CHANGE.md` + before/after snapshots, and update `changeLog.md`, `activeContext.md`, `project.md`, and the README table.

---

# Feature 010 — Format & pairing redesign (match type × pairing, fixed teams, mixed gender)

## Goal
Split the single `format` setting into two independent axes — **match type** (Americano/Mexicano) and **pairing** (Normal/Mixed/Fixed) — add a fixed-pairing mode where the roster is made of team names, require genders in mixed mode, and fix the matchmaking edge cases in Americano/mixed.

## Sub-feature 10.1 — Split match type × pairing

1. **Model.** `settings.format` → `settings.matchType: 'americano'|'mexicano'` + `settings.pairing: 'normal'|'mixed'|'fixed'`.
2. **Migration.** `normalizeMatch` maps legacy `format` values (`americano` → normal, `mixed_americano` → mixed, …).
3. **Matchmaking.** `isAmericano`/`isMexican` derive from `matchType`; `isMixed` from `pairing === 'mixed'`.
4. **Setup UI.** Two selects — **Match type on top**, then **Pairing**, then Courts.
5. **Run header.** Label becomes e.g. "Americano · Mixed · 2 courts".

## Sub-feature 10.2 — Fixed-pairing mode (team names)

1. When `pairing:'fixed'` the roster entries are **team names** — the add-player field becomes "Team name" and one entry represents a fixed pair; no gender is asked.
2. Matchmaking treats each entry as a full team: Americano round-robins the teams (minimizing opponent repeats); Mexicano ranks teams by points (top vs bottom). Reuses `pairIntoCourts` with single-id teams.
3. `fixed` is mutually exclusive with `mixed`.

## Sub-feature 10.3 — Mixed requires gender

1. When `pairing:'mixed'` the gender field is **required** when adding a player.
2. Start is blocked until every active player has a gender (upgrade from the current soft warning), with a "missing gender" badge on affected rows.

## Sub-feature 10.4 — Matchmaking bug fixes

1. **Americano new player.** A player added mid-event integrates fairly — play-count balance and no partner/opponent repeats against the regenerated schedule.
2. **Mixed total round.** Fill a court with "mixed pair + best available" before forcing byes.
3. **Mixed odd players.** Fair bye rotation so the same player isn't always sitting out.
4. **Mixed + gender edit.** Editing a gender mid-event regenerates cleanly; played rounds and their scores stay intact.

## Files
| File | Change |
|------|--------|
| `js/state.js` | `defaultSettings`/`normalizeMatch` migration; `settings.matchType`/`pairing` |
| `js/matchmaking.js` | Derived flags from new fields; fixed-pairing team rotation; mixed fill/bye/gender-edit fixes |
| `js/setupScreen.js` | Match type + pairing selects; team-name mode; required gender in mixed |
| `js/runScreen.js` | Header label from `matchType`/`pairing`; team rendering |
| `css/style.css` | Setup layout tweaks |
| `PLAN.md` | This plan |

## Verification
- `node --check`.
- Headless: legacy-format migration; fixed-pairing round-robin (teams never re-pair); mixed edge cases (odd counts, unbalanced genders, gender edit); americano new-player fairness.
- Manual: set up a fixed event with team names; mixed mode requires a gender per player and blocks start otherwise.

> Implementation follows the memory-bank convention: create `memory-bank/changes/010-.../` with `CHANGE.md` + before/after snapshots, and update `changeLog.md`, `activeContext.md`, `project.md`, and the README table.

---

# Bugfix 010b — Mixed Americano round balancing & gender-even verification

## Goal
Fix the unbalanced mixed Americano schedule and make mixed round generation solvable by requiring evenly distributed genders.

## Issue
- **Duplicate rounds.** With 4 players (2 men / 2 women) a mixed Americano built `players.length − 1` = 3 rounds, but with only 2 men there are exactly 2 man–woman partner pairs per gender, so round 3 replayed round 1's pairing (`[M1/F1 vs M2/F2]` twice). In Americano a partner pair must never repeat.

## Sub-fixes

1. **Gender-even verification (mixed mode).**
   - Setup: Start is blocked in mixed mode unless the number of **active men equals the number of active women** ("Mixed mode needs an equal number of men and women (currently X men / Y women)."). A matching live warning shows in the setup warnings area, and the pairing hint notes that mixed needs equal men and women.
   - Start-time gate only; mid-event roster changes still regenerate gracefully with the existing "best available" same-gender fill.

2. **Mixed Americano round count.**
   - `buildUnplayed` caps the Americano target to `min(players.length − 1, men, women)` so the schedule never asks for more unique man–woman pairings than exist: 2M/2F → 2 rounds, 4M/4F → 4 rounds (each male partners each female exactly once).

3. **Partner-repeat-free mixed pairing.**
   - `buildAmericanoTeams` in mixed mode pairs on-court men to women via a maximum bipartite matching that prefers partner edges never used before (Kuhn's augmenting-path search over edges with `partCount ≤ t`, raising `t` only until a perfect matching exists). The same-gender "best available" fill still runs afterwards for leftover (typically unbalanced mid-event) players.

## Files
| File | Change |
|------|--------|
| `js/matchmaking.js` | Mixed Americano round-target cap in `buildUnplayed`; `mixedMatch` bipartite matching (prefers unused partner edges) used by `buildAmericanoTeams` |
| `js/setupScreen.js` | Start gates mixed events on equal active men/women; live gender-count warning; pairing-hint wording |
| `PLAN.md` | This plan |

## Verification
- `node --check`.
- Headless: mixed 2M/2F → exactly 2 rounds with **zero partner-pair repeats**; 3M/3F and 4M/4F likewise (round count = `min(M,F)`, no partner repeat); normal Americano unchanged (n−1 rounds).
- Manual: mixed setup with unequal genders blocks Start with a clear modal + live warning; a balanced setup builds a partner-repeat-free schedule.

> Implementation follows the memory-bank convention: create `memory-bank/changes/010b-mixed-americano-round-balance/` with `CHANGE.md` + before/after snapshots, and update `changeLog.md`, `activeContext.md`, `project.md`, and the README table.

---

# Feature 011 — Modal score picker & setup gender editing

## Goal
Replace the fixed quick-score chips on the Courts tab with a full score-picker modal (`0..totalPoints`), and let a player's gender be set/changed directly on the create-event (Setup) page.

## Sub-feature 11.1 — Modal score picker (replaces chips)

1. **No more preset chips.** The fixed quick-select chips (11/12/15/18/21) are removed from court cards; a score is entered by opening a picker.
2. **Score picker modal.** Tapping either team's score on an unplayed, unlocked court opens a custom modal with a grid of tappable options from `0` to `totalPoints` (e.g. 0–21). Selecting one sets that side's score and auto-derives the opponent as `totalPoints − score`, so ties/over-totals remain impossible.
3. **Same save flow.** The score inputs stay the single source of truth; Save uses the existing `recordScore`/`editScore` flow (round completion unchanged), and the picker also works in the edit-score flow.
4. New `PadelApp.modal.picker(label, options, onPick)` renders the option grid.

## Sub-feature 11.2 — Edit gender on the create-event page

1. Each player row on the Setup screen gains a gender select (M / — / F), mirroring the Players tab — so a gender can be set or changed before the event starts without removing and re-adding the player.
2. Changing it calls the existing `setGender` and re-renders, updating the missing-gender badge and the mixed-mode gender-parity warning live.

## Files
| File | Change |
|------|--------|
| `js/modal.js` | New `picker()` (tappable option grid) |
| `js/runScreen.js` | Remove chips; court-card score inputs become readonly tap-to-pick triggers that open the picker; auto-derive opponent on pick |
| `js/setupScreen.js` | Gender select on each Setup player row (uses `setGender`) |
| `css/style.css` | `.pick-grid`/`.pick-btn` modal grid; readonly `.tscore` cursor; remove `.chips`/`.chip` |
| `PLAN.md` | This plan (renumbers the former Feature 011 → 012) |

## Verification
- `node --check`.
- Headless: `picker()` renders options `0..totalPoints` and returns the tapped value; auto-derive math unchanged (`total − n`).
- Manual: tapping a score opens the modal; picking a value fills both sides (opponent auto-derived); no chips remain; editing a played score uses the same picker; Setup rows show a gender select that updates the badge/parity warning live.

> Implementation follows the memory-bank convention: create `memory-bank/changes/011-modal-score-picker/` with `CHANGE.md` + before/after snapshots, and update `changeLog.md`, `activeContext.md`, `project.md`, and the README table.

---

# Feature 012 — Share as image & photo avatars

## Goal
Let users share the final leaderboard as a generated image, and give players optional photo avatars (cached in localStorage) that appear in the share template and player rows.

## Sub-feature 12.1 — Share as image

1. **Canvas render.** A `shareImage` module draws the event header (name/date/format) + the current/final leaderboard onto a canvas.
2. **Output.** Download as PNG and, where supported, `navigator.share`.
3. **Entry points.** A "Share" button on the Leaderboard tab and on the finish-event summary (Feature 008).

## Sub-feature 12.2 — Photo avatars

1. **Upload.** A photo button on each player row (Setup + Players tab) reads a file, downscales to ~96px and encodes as a JPEG data URL.
2. **Cache.** Avatars are stored under a dedicated `localStorage` key (e.g. `padelAvatars`) keyed by player id (compressed to respect the ~5 MB quota).
3. **Usage.** Avatars render in the share-image template and on player rows / leaderboard names.
4. **Clear.** A "Remove all stored avatars" button (Players tab) wipes the key.

## Files
| File | Change |
|------|--------|
| `js/shareImage.js` (new) | Canvas rendering + PNG download / `navigator.share` |
| `js/avatar.js` (new) | Avatar store (compressed data URLs) + clear-all |
| `js/runScreen.js` | Share button; avatar display + upload UI; clear-all |
| `js/setupScreen.js` | Avatar upload/display on player rows |
| `index.html` | Load `js/avatar.js`, `js/shareImage.js` |
| `css/style.css` | Avatar + share styles |
| `PLAN.md` | This plan |

## Verification
- `node --check`.
- Headless: avatar store compresses and round-trips; clear-all empties.
- Manual: upload an avatar → shows in rows and in the generated image; Share downloads/shares a PNG; Remove-all clears the cache.

> Implementation follows the memory-bank convention: create `memory-bank/changes/012-share-image-avatars/` with `CHANGE.md` + before/after snapshots, and update `changeLog.md`, `activeContext.md`, `project.md`, and the README table.