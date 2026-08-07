# Padel Match Maker

A fully client-side web app for organising padel match making events. All data is persisted in the browser via `localStorage` — no backend required.

## Features

- **4 formats** — Americano, Mexicano, Mixed Americano, Mixed Mexicano.
  - Americano pre-builds the complete round-robin schedule up front so partners/opponents rotate evenly.
  - Mexicano re-ranks pairings from live points after every round.
- **Matchmaking fairness**: court capacity (with fair byes), play-count balance, wait-time fairness, and partner/opponent uniqueness until combos are exhausted.
- **Mixed constraint**: every team is one male + one female; uneven gender counts are handled gracefully.
- **Scoring**: configurable "first to X" win points with an optional win-by-2 rule, plus a reorderable ranking priority (wins, points, points diff, matches played, …).
- **Live re-scheduling**: add/remove/toggle players mid-event regenerates only unplayed rounds — played rounds and their scores stay intact.
- **Leaderboard**: recomputed on every score entry (Wins, Losses, Points, Against, Diff, Matches, current Streak).
- Round navigation with score entry per court and a history of past rounds.
- Full state restoration on refresh/reopen.

## Usage

Just serve the folder statically (or open `index.html` directly — it also works via `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Add at least 4 players in Setup, choose a format, then **Start Event**.

## Stack

Vanilla HTML / CSS / JS (classic scripts, no build step).

## Project layout

```
index.html        App shell
css/style.css     Mobile-first courtside styling
js/
  storage.js      localStorage persistence
  state.js        Central state + actions
  matchmaking.js  Round generation + full-schedule builder
  scoring.js      Leaderboard statistics
  setupScreen.js  Setup screen
  runScreen.js    Running screen (courts / leaderboard / players)
  app.js          Bootstrap + screen switching
```