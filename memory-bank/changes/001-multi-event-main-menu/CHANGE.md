# Change 001 — Multi-event main menu

## Summary

Added a main menu and the ability to manage **multiple concurrent events**. Each event bundles a **name**, a **time/date**, and the **match itself** (players, format, rounds, scores). Events are fully independent and persisted in the browser, so several can be running at the same time.

## Why

The app previously handled a single event directly on load. The requirement asked for a main menu listing events, with support for several events running simultaneously. Each event needs its own identity (name + date) plus its match state.

## What changed

1. **New menu screen** (`js/menuScreen.js`)
   - Lists every event as a card: name, formatted date/time, player count, status badge (Not started / Running / Finished).
   - Buttons: **Open** (enter the event) and **Delete** (with confirmation).
   - A "New event" form: event name + `datetime-local`.

2. **Events data model** (`js/state.js`, `js/storage.js`)
   - New persisted shape: `{ events: [...], currentEventId, nextEventId }`.
   - `state` now operates on the **current event's match object** via `currentEvent()/get()`.
   - `currentEventId` selects which event the setup/run screens edit.
   - Added actions: `createEvent`, `openEvent`, `leaveEvent`, `removeEvent`.
   - Migration from the old single-state key `padelState_v1` into one event named "My event".

3. **Routing** (`js/app.js`)
   - No event open → **Menu**; event exists but not started → **Setup**; started → **Run**.

4. **Header changes** (`js/setupScreen.js`, `js/runScreen.js`)
   - Both show the current event name + a `← Events` back button (`leaveEvent()`).
   - The old destructive "End event → wipe progress" reset was removed; deletion now happens deliberately from the menu.

5. **Styling** (`css/style.css`)
   - Event cards, status badges, header row, datetime input, app title.

## How it works

- New event → `currentEventId` set to it → Setup screen (empty player list).
- Open a running event → Run screen resumes exactly where it was; rounds/scores intact.
- Switching events leaves every other event untouched.

## Verification

- `node --check` passed on all `js/*.js`.
- Headless smoke test (22 assertions) covering: no-events start, concurrent creates, independent per-event data, switching preserving state, score recording, leaderboard recompute, delete, persistence round-trip, and legacy migration. All passed.
- Side-effect-free layout render smoke test (`menu` / `setup` / `run`) produced valid HTML.
- Manual browser flow recommended: create two events, start both, switch between them, reload to confirm restoration.

## Rollback

To revert to pre-change code, copy `before/` contents over the working tree:

```
cp -r changes/001-multi-event-main-menu/before/index.html .
cp -r changes/001-multi-event-main-menu/before/css/style.css css/
cp -r changes/001-multi-event-main-menu/before/js/*.js js/
rm -f js/menuScreen.js
```

Then remove the new `padelApp_v1` key from localStorage (or rely on the legacy migration) to restore the single-event model.