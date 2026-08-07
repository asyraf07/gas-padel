# Padel Match Making App — Build Prompt

Build a fully client-side web application for padel match making, with all data persisted in the browser (localStorage). No backend required.

## Game Formats

Support 4 tournament formats, selectable at setup:

- **Americano**: every player rotates through partners and opponents so that everyone plays with/against everyone roughly equally. Pairs are formed so each player plays with a new partner and against a new opponent each round.
- **Mexicano**: players are ranked by accumulated points; pairings are made so the top-ranked players play together/against each other, and ranking is re-sorted after every round.
- **Mixed Americano**: same as americano but each team must be one male + one female.
- **Mixed Mexicano**: same as mexicano but each team must be one male + one female.

## Setup Screen

- Input player list with name + gender (required for mixed modes; ignore otherwise).
- Select the format (americano / mexicano / mixed americano / mixed mexicano).
- Select the number of courts (1–N), each court holds 4 players.
- Set match win points, e.g. "first to X points" with a win-by-2 rule.
- Scoring priority selector: choose what ranks the leaderboard, e.g. **Wins first, then points difference**, or **Points scored first, then wins**, or configurable priority order among: Wins, Points, Points Difference, Matches Played.

## Matchmaking Algorithm

Constraints to satisfy, in priority order:

1. **Court capacity**: total players in a round must not exceed `courts × 4`. Any remainder (players without a full court) sit out (bye) — they should be fairly rotated so the same players aren't benched repeatedly.
2. **Play count balance**: the algorithm tracks how many games each player has played and prefers putting players with the fewest games on court.
3. **Order balance / fairness**: the next-round line-up should be balanced so no player is constantly playing back-to-back while others wait. Prefer a player's "next" participation to follow a fair rotation.
4. **Uniqueness (americano)**: minimize repeats of partner and opponent pairings across rounds until all combos are exhausted.
5. **No repeats in mixed modes**: never pair same-gender partners; try to avoid same partner combos repeating.

## Core Features

- **Leaderboard**: live table of all players sorted by the selected scoring priority; show Wins, Losses, Points scored, Points conceded, Points difference, Matches played, and current streak.
- **Add/remove player mid-game**: adding or removing a player at any time **automatically re-generates all rounds that haven't been played yet** using the matchmaking algorithm, keeping played rounds untouched. Removal also handles the case where the removed player is in the current unplayed round.
- **Toggle player active/inactive**: each player can be toggled on/off (e.g. not attending yet, or left early). Inactive players are excluded from future round generation; toggling re-computes unplayed rounds.
- **Round navigation**: view past rounds (with results recorded), current round, and upcoming rounds. Record scores per court per round.
- **Match history**: each played round stored with teams, scores, and participants so the leaderboard can always be recomputed.

## UI/UX

- Clean, mobile-friendly interface (players will use phones courtside).
- Screen 1: Setup (players, format, courts, scoring). Screen 2: Match running (courts view + leaderboard + player management).
- Add/remove/toggle players without losing match progress.

## Data Model

Persist in localStorage:

- `players[]`: { id, name, gender, active, matchesPlayed }
- `settings`: { format, numCourts, scoringPriority, winPoints, ... }
- `rounds[]`: { roundNumber, courts[], results[], played: bool }
- Recompute leaderboard on every score entry.

## Edge Cases

- Total players less than 4 → warn, can't start.
- Mixed modes with unequal gender counts → handle gracefully (allow a mixed pair + best available, or byes).
- Removing a player mid-round → regenerate only unplayed rounds; keep records of completed rounds consistent.
- Refresh/reopen the browser → full state restores from localStorage.
