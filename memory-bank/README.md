# Memory Bank

A persistent knowledge base for the **Padel Match Maker** project. It records the project's state at each change and keeps full code snapshots so any point in history can be restored or compared.

## Structure

```
memory-bank/
  README.md            This index
  project.md           Project overview, architecture, data model, conventions
  activeContext.md     Current working state and latest decisions
  changeLog.md         Chronological list of changes
  changes/             One folder per change
    <change-id>/       e.g. 001-multi-event-main-menu
      CHANGE.md        What, why, how, verification, rollback
      before/          Complete code snapshot BEFORE the change
      after/           Complete code snapshot AFTER the change
```

## Code snapshots

Every change ships with the full application code in two states:

- `changes/<change-id>/before/` — the initial code before the change
- `changes/<change-id>/after/` — the code after the change

Both folders mirror the live project layout (`index.html`, `css/style.css`, `js/*.js`) so a snapshot can be copied straight back over the working tree.

## Contents

| # | Change | Status |
|---|--------|--------|
| 001 | Multi-event main menu (main menu, concurrent events, event name/date/match) | Applied |
| 002 | Total-points scoring | Applied |
| 003 | Event-listener accumulation & priority-editor fixes | Applied |
| 004 | Setup improvements, compensation points & leaderboard priority | Applied |
