/* state.js — events + per-event match state and actions */
var PadelApp = window.PadelApp || {};

PadelApp.state = (function () {
  var subscribers = [];
  var app = null;

  function defaultSettings() {
    return {
      matchType: 'americano',
      pairing: 'normal',
      numCourts: 1,
      totalPoints: 21,
      compensation: true,
      autoRegenerate: true,
      scoringPriority: [
        { key: 'points', dir: 'desc' },
        { key: 'wins', dir: 'desc' },
        { key: 'diff', dir: 'desc' },
        { key: 'losses', dir: 'asc' }
      ]
    };
  }

  function freshMatch() {
    return {
      players: [],
      settings: defaultSettings(),
      rounds: [],
      currentIndex: 0,
      nextId: 1,
      started: false,
      finished: false
    };
  }

  function freshApp() {
    return { events: [], currentEventId: null, nextEventId: 1 };
  }

  function currentEvent() {
    if (!app) return null;
    for (var i = 0; i < app.events.length; i++) {
      if (app.events[i].id === app.currentEventId) return app.events[i];
    }
    return null;
  }

  function get() {
    var ev = currentEvent();
    return ev ? ev.match : null;
  }

  function normalizeMatch(m) {
    var s = m.settings || {};
    /* legacy `format` → matchType × pairing migration */
    if (s.format) {
      var legacy = String(s.format);
      if (legacy === 'mixed_americano') { s.matchType = 'americano'; s.pairing = 'mixed'; }
      else if (legacy === 'mixed_mexicano') { s.matchType = 'mexicano'; s.pairing = 'mixed'; }
      else if (legacy === 'mexicano') { s.matchType = 'mexicano'; s.pairing = 'normal'; }
      else { s.matchType = 'americano'; s.pairing = 'normal'; }
      delete s.format;
    }
    if (s.totalPoints == null && typeof s.winPoints === 'number') s.totalPoints = s.winPoints;
    delete s.winPoints;
    delete s.winByTwo;
    m.settings = Object.assign(defaultSettings(), s);
    m.nextId = m.nextId >= 1 ? m.nextId : (m.players.length + 1);
    m.finished = !!m.finished;
    if (m.rounds && m.rounds.length) {
      var playedC = 0;
      m.rounds.forEach(function (r) { if (r.played) playedC++; });
      m.currentIndex = playedC;
    } else {
      m.rounds = [];
      m.currentIndex = 0;
    }
    return m;
  }

  function normalizeEvent(ev) {
    if (!ev.match) ev.match = freshMatch();
    normalizeMatch(ev.match);
    return ev;
  }

  function changed() {
    PadelApp.store.save(app);
    var m = get();
    PadelApp.score.setState(m ? m : null);
    notify();
  }

  function notify() {
    for (var i = 0; i < subscribers.length; i++) {
      try { subscribers[i](); } catch (e) { /* ignore render errors */ }
    }
  }

  function load() {
    var saved = PadelApp.store.load();
    if (saved) {
      app = saved;
      app.events = (app.events || []).map(normalizeEvent);
      app.nextEventId = app.nextEventId >= 1 ? app.nextEventId : app.events.length + 1;
      if (!currentEvent()) app.currentEventId = app.events.length ? app.events[0].id : null;
    } else {
      var legacy = PadelApp.store.loadLegacy();
      if (legacy) {
        app = freshApp();
        var ev = { id: app.nextEventId++, name: 'My event', date: '', match: normalizeMatch(legacy) };
        app.events.push(ev);
        app.currentEventId = ev.id;
      } else {
        app = freshApp();
      }
    }
    var m = get();
    PadelApp.score.setState(m ? m : null);
  }

  function settings() { var m = get(); return m ? m.settings : defaultSettings(); }
  function players() { var m = get(); return m ? m.players : []; }
  function started() { var m = get(); return m ? m.started : false; }
  function finished() { var m = get(); return m ? !!m.finished : false; }

  function subscribe(fn) { subscribers.push(fn); }

  /* -------- events -------- */
  function events() { return app.events; }
  function currentEventId() { return app.currentEventId; }

  function createEvent(name, date) {
    var ev = { id: app.nextEventId++, name: name || 'Unnamed event', date: date || '', match: freshMatch() };
    app.events.push(ev);
    app.currentEventId = ev.id;
    changed();
    return ev;
  }

  function openEvent(id) {
    app.currentEventId = id;
    changed();
  }

  function leaveEvent() {
    app.currentEventId = null;
    changed();
  }

  function removeEvent(id) {
    app.events = app.events.filter(function (ev) { return ev.id !== id; });
    if (app.currentEventId === id) app.currentEventId = null;
    changed();
  }

  function renameEvent(id, name) {
    for (var i = 0; i < app.events.length; i++) {
      if (app.events[i].id === id) app.events[i].name = name;
    }
    changed();
  }

  function setEventDate(id, date) {
    for (var i = 0; i < app.events.length; i++) {
      if (app.events[i].id === id) app.events[i].date = date;
    }
    changed();
  }

  /* -------- player management -------- */
  function nameTaken(name) {
    var m = get(); if (!m) return false;
    var lower = String(name || '').trim().toLowerCase();
    return m.players.some(function (p) { return String(p.name).toLowerCase() === lower; });
  }

  function addPlayer(name, gender) {
    var m = get(); if (!m || m.finished) return null;
    var n = String(name || '').trim();
    if (!n) return 'Enter a player name.';
    if (nameTaken(n)) return 'That name is already in use.';
    m.players.push({ id: m.nextId++, name: n, gender: gender || null, active: true });
    if (m.started && m.settings.autoRegenerate) PadelApp.match.buildUnplayed(m);
    changed();
    return null;
  }

  function renamePlayer(id, name) {
    var m = get(); if (!m || m.finished) return null;
    var n = String(name || '').trim();
    if (!n) return 'Enter a player name.';
    for (var i = 0; i < m.players.length; i++) {
      if (m.players[i].id === id) {
        if (m.players.some(function (p) { return p.id !== id && String(p.name).toLowerCase() === n.toLowerCase(); })) {
          return 'That name is already in use.';
        }
        m.players[i].name = n;
      }
    }
    changed();
    return null;
  }

  function removePlayer(id) {
    var m = get(); if (!m || m.finished) return;
    m.players = m.players.filter(function (p) { return p.id !== id; });
    if (m.started && m.settings.autoRegenerate) PadelApp.match.buildUnplayed(m);
    changed();
  }

  function toggleActive(id) {
    var m = get(); if (!m || m.finished) return;
    for (var i = 0; i < m.players.length; i++) {
      if (m.players[i].id === id) m.players[i].active = !m.players[i].active;
    }
    if (m.started && m.settings.autoRegenerate) PadelApp.match.buildUnplayed(m);
    changed();
  }

  function setGender(id, gender) {
    var m = get(); if (!m || m.finished) return;
    for (var i = 0; i < m.players.length; i++) {
      if (m.players[i].id === id) m.players[i].gender = gender || null;
    }
    if (m.started && m.settings.autoRegenerate) PadelApp.match.buildUnplayed(m);
    changed();
  }

  /* -------- tournament -------- */
  function start(settings) {
    var m = get(); if (!m) return;
    m.settings = Object.assign(defaultSettings(), settings || {});
    m.rounds = [];
    m.currentIndex = 0;
    m.started = true;
    PadelApp.match.buildUnplayed(m);
    changed();
  }

  function updateSettings(patch) {
    var m = get(); if (!m) return;
    m.settings = Object.assign(m.settings, patch || {});
    changed();
  }

  /* like updateSettings but does NOT notify (no re-render); for typing-persistent fields */
  function updateSettingsSilent(patch) {
    var m = get(); if (!m) return;
    m.settings = Object.assign(m.settings, patch || {});
    PadelApp.store.save(app);
    PadelApp.score.setState(m);
  }

  function regenerateUnplayed() {
    var m = get(); if (!m || m.finished) return;
    PadelApp.match.buildUnplayed(m);
    changed();
  }

  /* shuffle the order of unplayed rounds and their opponents, keeping pairs fixed */
  function reshuffleUnplayed() {
    var m = get(); if (!m || m.finished) return 0;
    var n = PadelApp.match.reshuffleUnplayed(m);
    if (n) changed();
    return n;
  }

  /* swap the player in one slot of an unplayed, unscored court */
  function hasPartialRound(m) {
    return (m.rounds || []).some(function (r) {
      return !r.played && (r.courts || []).some(function (c) { return c.score !== null; });
    });
  }

  function applySlotSwap(court, slotIdx, newPlayerId) {
    if (slotIdx < 2) court.teamA[slotIdx] = newPlayerId;
    else court.teamB[slotIdx - 2] = newPlayerId;
  }

  function swapPlayer(roundIdx, courtIdx, slotIdx, newPlayerId) {
    var m = get(); if (!m || m.finished) return 'This event is finished.';
    var round = m.rounds[roundIdx];
    if (!round || round.played) return 'Only unplayed rounds can be edited.';
    var court = round.courts[courtIdx];
    if (!court || court.score !== null) return 'Only unscored courts can be edited.';
    var onCourt = court.teamA.concat(court.teamB);
    if (onCourt.indexOf(newPlayerId) !== -1) return 'That player is already on this court.';
    var np = null;
    for (var i = 0; i < m.players.length; i++) if (m.players[i].id === newPlayerId) np = m.players[i];
    if (!np || !np.active) return 'That player is not active.';
    if (slotIdx < 0 || slotIdx > 3) return null;

    applySlotSwap(court, slotIdx, newPlayerId);

    /* auto-regeneration rebalances the rest of the schedule via buildUnplayed;
       skip when any unplayed round holds saved scores, so those aren't wiped.
       Re-apply the manual swap afterwards so the current court keeps the choice. */
    if (m.settings.autoRegenerate && !hasPartialRound(m)) {
      PadelApp.match.buildUnplayed(m);
      var r2 = m.rounds[roundIdx];
      var c2 = r2 && !r2.played ? r2.courts[courtIdx] : null;
      if (c2 && c2.score === null) {
        if (c2.teamA.concat(c2.teamB).indexOf(newPlayerId) === -1) {
          applySlotSwap(c2, slotIdx, newPlayerId);
        }
      }
    }
    changed();
    return null;
  }

  /* -------- finish event -------- */
  function finishEvent() {
    var m = get(); if (!m) return;
    m.finished = true;
    changed();
  }

  function unfinishEvent() {
    var m = get(); if (!m) return;
    m.finished = false;
    changed();
  }

  /* -------- scoring -------- */
  function recordScore(roundIdx, courtIdx, ptA, ptB) {
    var m = get(); if (!m || m.finished) return false;
    var round = m.rounds[roundIdx];
    if (!round || round.played) return false;
    var court = round.courts[courtIdx];
    if (!court) return false;
    court.score = [ptA, ptB];

    var allDone = round.courts.every(function (c) { return c.score !== null; });
    var justCompleted = false;
    if (allDone) {
      round.played = true;
      justCompleted = true;
      if (roundIdx + 1 > m.currentIndex) m.currentIndex = roundIdx + 1;
    }
    if (justCompleted && PadelApp.match.isMexican(m.settings)) {
      PadelApp.match.buildUnplayed(m);
    }
    changed();
    return justCompleted;
  }

  /* change an already-saved score; re-validates and regenerates future rounds */
  function editScore(roundIdx, courtIdx, ptA, ptB) {
    var m = get(); if (!m || m.finished) return 'This event is finished.';
    var round = m.rounds[roundIdx];
    var court = round && round.courts[courtIdx];
    if (!round || !court || court.score === null) return null;
    var err = validateScore(ptA, ptB, m.settings.totalPoints);
    if (err) return err;
    court.score = [ptA, ptB];
    if (round.courts.every(function (c) { return c.score !== null; })) round.played = true;
    if (round.played) PadelApp.match.buildUnplayed(m);
    changed();
    return null;
  }

  function validateScore(a, b, total) {
    if (isNaN(a) || isNaN(b)) return 'Enter both scores.';
    if (a === b) return 'Scores cannot be tied.';
    if (a + b !== total) return 'Scores must total exactly ' + total + '.';
    return null;
  }

  return {
    load: load, get: get, settings: settings, players: players, started: started,
    finished: finished,
    subscribe: subscribe,
    currentEvent: currentEvent, currentEventId: currentEventId, events: events,
    createEvent: createEvent, openEvent: openEvent, leaveEvent: leaveEvent, removeEvent: removeEvent,
    renameEvent: renameEvent, setEventDate: setEventDate,
    addPlayer: addPlayer, removePlayer: removePlayer, renamePlayer: renamePlayer,
    toggleActive: toggleActive, setGender: setGender,
    start: start, regenerateUnplayed: regenerateUnplayed, reshuffleUnplayed: reshuffleUnplayed, updateSettings: updateSettings,
    updateSettingsSilent: updateSettingsSilent,
    swapPlayer: swapPlayer,
    finishEvent: finishEvent, unfinishEvent: unfinishEvent,
    recordScore: recordScore, editScore: editScore
  };
})();