# Change 010 — Format & pairing redesign (match type × pairing, fixed teams, mixed gender)

## Summary

Splits the single `format` setting into two independent axes and adds a fixed-pairing mode plus mixed-gender requirements (`plan # Feature 010`):

1. **Match type × pairing.** `settings.format` → `settings.matchType: 'americano'|'mexicano'` + `settings.pairing: 'normal'|'mixed'|'fixed'`. `normalizeMatch` migrates any legacy `format` value (`americano`→normal, `mexicano`→normal, `mixed_americano`→mixed, `mixed_mexicano`→mixed) and removes the old key. Matchmaking derives `isAmericano`/`isMexican` from `matchType` and `isMixed` from `pairing === 'mixed'`; a new `isFixed` covers `pairing === 'fixed'`. The setup screen shows a **Match type** select on top, then **Pairing**, then **Courts**; the run header label is e.g. "Americano · Mixed · 2 courts".
2. **Fixed pairing (team names).** When `pairing:'fixed'` each roster entry is a fixed team — the add field becomes "Team name", no gender is asked, and `minPlayers()` becomes `numCourts × 2`. Americano round-robins the teams with **no opponent repeats**: every team enters the pairing pool (most-needy first) and only `numCourts` matches are kept per round, reusing `pairIntoCourts` on single-id teams. Mexicano ranks the on-court teams by points and pairs **top vs bottom** via the new `rankFixedCourts`. `fixed` is mutually exclusive with `mixed`.
3. **Mixed requires gender.** In `pairing:'mixed'` the gender field is required when adding a player (setup + Players tab + the "+ Add player…" slot-picker modal), Start is blocked until every **active** player has a gender, and rows missing one get a "missing gender" badge.
4. **Matchmaking bug fixes (10.4).**
   - *Americano new player:* a player added mid-event integrates fairly — the regenerated schedule balances play counts and spreads partners/opponents via the shared tracker.
   - *Mixed total round:* after strict mixed pairing, leftover same-gender players are paired among themselves ("mixed pair + best available") before any bye is forced, keeping courts full.
   - *Mixed odd players:* `pickOnCourt` keeps genders balanced on court (swapping over-represented players with off-court opposite-gender ones) so byes rotate fairly by games/rounds-since-last.
   - *Mixed + gender edit:* `setGender` regenerates unplayed rounds cleanly; played rounds and their scores stay byte-identical.

## What changed

| File | Nature |
|------|--------|
| `js/state.js` | `defaultSettings` → `matchType:'americano'`, `pairing:'normal'`; `normalizeMatch` legacy `format` → `matchType`/`pairing` migration |
| `js/matchmaking.js` | Derived flags from new fields (+ legacy fallback); `pickOnCourt(players, stats, capacity, perCourt, mixed)` with mixed gender-balancing; fixed-americano pool round-robin (keeps `numCourts` matches, no repeats); new `rankFixedCourts`; mixed pass-2 fill in `buildAmericanoTeams`/`rankTeams`; `buildRound` fixed branches; exports `isFixed` |
| `js/setupScreen.js` | `MATCHTYPES`/`PAIRINGS` selects (Match type → Pairing → Courts); team-name mode (no gender select, "Team name" placeholder); `minPlayers(s)` fixed-aware; required gender in mixed; missing-gender badge in rows; combined `warnHtml`; Start validation (active count + mixed gender on active players) |
| `js/runScreen.js` | `label(s)` → "Americano · Mixed · 2 courts" header + summary; `teamSlotsHtml` loops `team.length` (single-id fixed teams render one picker per side); `historyHtml` via `teamNames` join; pairing-aware Players-tab add form (`Add team`, hidden gender, required in mixed); guarded `#run-gender` reads; "+ Add player…" modal collects gender in mixed |
| `css/style.css` | `.badge` (missing-gender chip) |
| `index.html` | (unchanged — no new scripts) |

## Behavior

- Existing saved events migrate on load: `mixed_americano` becomes `matchType:americano, pairing:mixed`, etc.
- A fixed event treats each entry as a team: Americano produces a round-robin where no two teams face each other twice; Mexicano always pairs the current top-ranked teams against the bottom-ranked.
- In mixed events every active player must have a gender or Start is blocked (badge shows who's missing); unbalanced gender mixes still fill all courts.
- A gender change mid-event re-schedules only the unplayed rounds; played rounds keep their scores.

## Verification

- `node --check` passed on every JS file.
- Headless checks (see `/tmp` harness):
  - legacy `format` migration for all four values; fresh events use `matchType`/`pairing` with no `format`;
  - fixed americano: 4 teams/1 court → 3 rounds of single-id teams with 3 distinct opponent pairs and 2 byes; 8 teams/2 courts → 7 rounds, **no opponent pair ever repeats**, play counts balanced;
  - fixed mexicano: single-id courts; round 1 pairs top-half vs bottom-half; after distinct scores the next round re-ranks and still pairs top vs bottom;
  - mixed full courts: 6M+2F and 5M+3F over 2 courts fill all 8 slots (2 mixed + same-gender fill teams, zero forced byes);
  - mixed odd players: 5 players/1 court → byes rotate across ≥3 different players, nobody sits out more than twice;
  - americano new player: mid-event add produces balanced play counts and partners all 3 others;
  - mixed gender edit: regenerates cleanly, played round + score byte-identical;
  - rendering: setup shows Match type/Pairing selects and "Team name"/hidden-gender in fixed; mixed marks the gender select required + shows badges/warnings; run header labels "Mexicano · Mixed", "Americano · Fixed", and "Americano · N court(s)" for normal; fixed courts show exactly 2 slot pickers, normal courts 4; Players tab shows "Add team" with no gender control in fixed.
- Manual browser pass: set up a fixed event with team names (no genders); mixed mode blocks Start until every active player has a gender; header reads e.g. "Americano · Mixed · 2 courts".

## Rollback

```
cp -r memory-bank/changes/010-format-pairing-redesign/before/* ./
```
