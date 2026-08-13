# Active Context

Current working state of the project and the latest decisions.

## Latest change applied

**011b — Score modal cancel fix & live score counter** (see `changes/011b-score-modal-cancel-live-counter/CHANGE.md`).

- The score-picker modal's **Cancel button now works** — `picker()` previously only listened for `.pick-btn` taps, so `data-m="cancel"` was never handled.
- The quick-input picker gets a corner icon (`±`) that switches the modal into a **live score counter** showing both teams with a `−`/`+` tally per side; tapping updates the court-card inputs live, capped so the total never exceeds `totalPoints`.
- The counter's single action button reads **Close** while the match is in progress (closes the modal but keeps the tally on the event page) and relabels to **Finish** at `scoreA + scoreB === totalPoints`, saving via `recordScore`/`editScore` (shared `saveCourtScore`).
- Live mode is sticky per court (`view.liveMode[round:court]`): re-tapping a score opens the live counter with the current score; a `← pick` corner switches back to quick input.

**Previous change:**

**011 — Modal score picker & setup gender editing** (see `changes/011-modal-score-picker/CHANGE.md`).

- The fixed quick-score chips on the Courts tab are replaced by a **score picker modal**: tapping either team's score opens a grid of `0..totalPoints` options (`PadelApp.modal.picker`); picking one sets that side and auto-derives the opponent (`totalPoints − score`). Court-card score inputs are readonly tap-to-pick; Save still uses `recordScore`/`editScore`, and editing a played score opens the same picker.
- The **Setup (create-event) page** now has an M / — / F gender select per player row (via `state.setGender`), so genders can be set/changed before starting; badges and the mixed gender-parity warning update live.
- The planned "Share as image & photo avatars" feature was renumbered from 011 to **012**.

**Previous change:**

**010b — Mixed Americano round balancing & gender-even verification** (see `changes/010b-mixed-americano-round-balance/CHANGE.md`).

- Bugfix for feature 010's mixed Americano: with 4 players (2M/2F) the schedule built 3 rounds although only 2 man–woman pairings exist per gender — round 3 replayed round 1's pairing. Partner pairs must never repeat in Americano.
- **Gender-even gate:** mixed mode blocks Start unless active men = active women (modal + live setup warning; the pairing hint explains it). Start-time only — mid-event roster changes still regenerate gracefully.
- **Round-count cap:** mixed Americano now schedules `min(players.length − 1, men, women)` rounds (2M/2F → 2, 3M/3F → 3, 4M/4F → 4).
- **Partner-repeat-free pairing:** `buildAmericanoTeams` (mixed) uses a maximum bipartite matching preferring never-used partner edges (Kuhn augmenting path over `partCount ≤ t`) instead of the sequential greedy; on-court gender balance is preserved and the same-gender "best available" fill still runs for leftover players.
- Normal Americano and both Mexicano modes are unchanged.

**Previous change:**

**010 — Format & pairing redesign (match type × pairing, fixed teams, mixed gender)** (see `changes/010-format-pairing-redesign/CHANGE.md`).

- `settings.format` split into `settings.matchType: 'americano'|'mexicano'` + `settings.pairing: 'normal'|'mixed'|'fixed'`; `normalizeMatch` migrates legacy `format` values (`americano`→normal, `mexicano`→normal, `mixed_americano`→mixed, `mixed_mexicano`→mixed). `isAmericano`/`isMexican` derive from `matchType`, `isMixed` from `pairing`, new `isFixed`.
- Setup screen shows **Match type** on top, then **Pairing**, then **Courts**; the run header label is e.g. "Americano · Mixed · 2 courts".
- **Fixed pairing:** each roster entry is a team name (no gender), `minPlayers()` = `numCourts × 2`; Americano round-robins ALL teams keeping only `numCourts` matches per round so opponents never repeat; Mexicano pairs top vs bottom via new `rankFixedCourts`.
- **Mixed requires gender:** required on add (setup + Players tab + slot-picker modal), Start blocked until every active player has a gender, missing-gender badge on rows.
- **10.4 fixes:** americano new-player fairness; mixed courts fill with "mixed pair + best available" before forced byes; gender-balanced on-court pick (`pickOnCourt` mixed) keeps byes fair; gender edit regenerates cleanly with played rounds/scores intact.

**Previous change:**

**009 — Player management: removal confirm, round-page substitution & regeneration toggle** (see `changes/009-player-mgmt-substitution-regen-toggle/CHANGE.md`).

- Removing a player now requires a confirm modal (Setup list + Players tab); played rounds keep showing removed players as "(removed)".
- Unplayed, unscored court cards get a per-slot picker over the active roster (plus "+ Add player…") that swaps that slot via new `state.swapPlayer`. With `autoRegenerate` ON the rest of the schedule rebalances via `buildUnplayed` (regeneration is skipped while any unplayed round holds saved scores, so partial rounds aren't wiped) and the manual swap is re-applied; with OFF only that court is updated.
- New `settings.autoRegenerate` (default true) checkbox on the Players tab — when OFF, roster edits stop regenerating and a manual "Regenerate rounds" button appears on the Courts tab.
- `addPlayer`/`renamePlayer` reject case-insensitive duplicates (trimmed) and return error strings surfaced via the custom modal.

**Previous change:**

**008 — Faster score entry & finish-event flow** (see `changes/008-faster-score-entry-finish-flow/CHANGE.md`).

- Quick score entry: preset score chips (11/12/15/18/21) per court side; tapping a chip or typing a side derives the opponent as `totalPoints − score`, so ties/over-totals are impossible; validation reduces to `0 ≤ score ≤ totalPoints`. Saving uses the existing `recordScore`/`editScore` flow.
- Finish event: "Finish" button (run header) → custom-modal confirm → `match.finished = true`. When finished, score entry/edit and roster changes are blocked at the state level and disabled in the UI, the header shows a "Finished" badge, court cards show a "locked" tag, the Leaderboard shows a final summary banner (event name/date/format + winner = rank 1, feeding Feature 012), and the menu shows Finished from `match.finished`. "Undo finish" reopens the event.

**Previous change:**

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