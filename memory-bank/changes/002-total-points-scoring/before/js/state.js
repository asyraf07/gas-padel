/* state.js — events + per-event match state and actions */
var PadelApp = window.PadelApp || {};

PadelApp.state = (function () {
  var subscribers = [];
  var app = null;

  function defaultSettings() {
    return {
      format: 'americano',
      numCourts: 1,
      winPoints: 15,
      winByTwo: false,
      scoringPriority: [
        { key: 'wins', dir: 'desc' },
        { key: 'diff', dir: 'desc' },
        { key: 'points', dir: 'desc' },
        { key: 'matches', dir: 'asc' }
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
      started: false
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
    m.settings = Object.assign(defaultSettings(), m.settings || {});
    m.nextId = m.nextId >= 1 ? m.nextId : (m.players.length + 1);
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

  /* -------- player management -------- */
  function addPlayer(name, gender) {
    var m = get(); if (!m) return;
    m.players.push({ id: m.nextId++, name: name, gender: gender || null, active: true });
    if (m.started) PadelApp.match.buildUnplayed(m);
    changed();
  }

  function removePlayer(id) {
    var m = get(); if (!m) return;
    m.players = m.players.filter(function (p) { return p.id !== id; });
    if (m.started) PadelApp.match.buildUnplayed(m);
    changed();
  }

  function toggleActive(id) {
    var m = get(); if (!m) return;
    for (var i = 0; i < m.players.length; i++) {
      if (m.players[i].id === id) m.players[i].active = !m.players[i].active;
    }
    if (m.started) PadelApp.match.buildUnplayed(m);
    changed();
  }

  function setGender(id, gender) {
    var m = get(); if (!m) return;
    for (var i = 0; i < m.players.length; i++) {
      if (m.players[i].id === id) m.players[i].gender = gender || null;
    }
    if (m.started) PadelApp.match.buildUnplayed(m);
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

  function regenerateUnplayed() {
    var m = get(); if (!m) return;
    PadelApp.match.buildUnplayed(m);
    changed();
  }

  /* -------- scoring -------- */
  function recordScore(roundIdx, courtIdx, ptA, ptB) {
    var m = get(); if (!m) return false;
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

  return {
    load: load, get: get, settings: settings, players: players, started: started,
    subscribe: subscribe,
    currentEvent: currentEvent, currentEventId: currentEventId, events: events,
    createEvent: createEvent, openEvent: openEvent, leaveEvent: leaveEvent, removeEvent: removeEvent,
    addPlayer: addPlayer, removePlayer: removePlayer,
    toggleActive: toggleActive, setGender: setGender,
    start: start, regenerateUnplayed: regenerateUnplayed, updateSettings: updateSettings,
    recordScore: recordScore
  };
})();