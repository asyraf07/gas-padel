# Change 010b — Mixed Americano round balancing & gender-even verification

## Summary

Bugfix follow-up to change 010 (`plan # Bugfix 010b`): the mixed Americano schedule could build more rounds than unique man-woman pairings exist, so the same pairing repeated across rounds.

- **Duplicate rounds (the reported bug).** With 4 players (2M/2F) `buildUnplayed` targeted `players.length − 1` = 3 rounds, but only 2 man-woman partner pairs per gender exist, so round 3 replayed round 1 exactly (`[M1/F1 vs M2/F2]` twice). In Americano a partner pair must never repeat.
- **Gender-even verification.** Mixed mode now blocks Start unless the number of active men equals the number of active women — this makes the round-robin solvable and balanced. It's a start-time gate only; mid-event roster changes still regenerate gracefully.
- **Mixed round-count cap.** In Americano the schedule caps at `min(players.length − 1, men, women)` rounds: 2M/2F → 2 rounds, 3M/3F → 3, 4M/4F → 4 (each male partners each female exactly once).
- **Partner-repeat-free pairing.** `buildAmericanoTeams` in mixed mode pairs on-court men to women via a maximum bipartite matching that prefers partner edges never used before (Kuhn's augmenting-path search over edges with `partCount ≤ t`, raising `t` only until a perfect matching exists), instead of the sequential greedy that could strand a player into a repeated pair. The same-gender "best available" fill still runs afterwards for leftover (typically unbalanced mid-event) players.

## What changed

| File | Nature |
|------|--------|
| `js/matchmaking.js` | New `perfectMixedMatching`/`mixedMatch` bipartite matching used by `buildAmericanoTeams` (mixed); `buildAmericanoTeams` picks the matching result for mixed and falls back to the old greedy only when the matching can't form; `buildUnplayed` caps the Americano target to `min(players.length − 1, men, women)` in mixed mode |
| `js/setupScreen.js` | Start gates mixed events on equal active men/women with a clear modal ("Mixed mode needs an equal number of men and women to build a round-robin (you have X men and Y women)."); live gender-count warning in `warnHtml`; pairing hint wording ("…an equal number of men and women is required to start") |
| `PLAN.md` | New Bugfix 010b section |

## Behavior

- A mixed event with `M ≠ F` active players cannot Start (modal + live setup warning); the pairing hint explains the requirement. Unequal mixes reached mid-event still regenerate cleanly and fill courts with the existing "mixed pair + best available" same-gender pairs.
- Mixed Americano never schedules a round whose team pairings repeat a previous round's partner pairs; the round count is `min(M, F)` so the schedule is exactly as long as distinct pairings allow.
- Normal Americano (and both Mexicano modes) are unchanged: still `players.length − 1` rounds, ranking-based one-round-at-a-time for Mexicano.

## Verification

- `node --check` passed on `js/matchmaking.js`, `js/setupScreen.js`, `js/state.js`.
- Headless harness (see `/tmp`): mixed 2M/2F (1 and 2 courts) → exactly 2 rounds, **zero partner-pair repeats**; 3M/3F and 4M/4F → 3 and 4 rounds respectively with all partner pairs unique (4M/4F/2 courts fills all 8 players each round); unbalanced 4M/2F and 2M/6F regenerate gracefully (cap 2 rounds, no partner repeats); mixed and normal Mexicano produce their single round; normal 4-player Americano unchanged (3 rounds); mid-event add/regenerate respects played rounds and keeps partner pairs unique across the whole schedule.
- Manual: mixed setup with unequal genders blocks Start with the modal and shows the live warning; a balanced mixed event starts and its rounds never reuse a partner pair.

## Rollback

```
cp -r memory-bank/changes/010b-mixed-americano-round-balance/before/* ./
```