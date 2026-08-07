/* state.js — central state and actions */
var PadelApp = window.PadelApp || {};

PadelApp.state = (function () {
  var subscribers = [];
  var state = null;

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

  function fresh() {
    return {
      players: [],
      settings: defaultSettings(),
      rounds: [],
      currentIndex: 0,
      nextId: 1,
      started: false
    };
  }

  function changed() {
    PadelApp.store.save(state);
    PadelApp.score.setState(state);
    notify();
  }

  function notify() {
    for (var i = 0; i < subscribers.length; i++) {
      try { subscribers[i](); } catch (e) { /* ignore render errors */ }
    }
  }

  function load() {
    var saved = PadelApp.store.load();
    if (saved && saved.players) {
      state = saved;
      state.settings = Object.assign(defaultSettings(), state.settings || {});
      state.nextId = state.nextId >= 1 ? state.nextId : (state.players.length + 1);
      if (state.rounds && state.rounds.length) {
        var playedC = 0;
        state.rounds.forEach(function (r) { if (r.played) playedC++; });
        state.currentIndex = playedC;
      } else {
        state.rounds = [];
        state.currentIndex = 0;
      }
    } else {
      state = fresh();
    }
    PadelApp.score.setState(state);
  }

  function get() { return state; }
  function settings() { return state.settings; }
  function players() { return state.players; }
  function started() { return state.started; }

  function subscribe(fn) { subscribers.push(fn); }

  /* -------- player management -------- */
  function addPlayer(name, gender) {
    state.players.push({ id: state.nextId++, name: name, gender: gender || null, active: true });
    if (state.started) PadelApp.match.buildUnplayed(state);
    changed();
  }
  function removePlayer(id) {
    state.players = state.players.filter(function (p) { return p.id !== id; });
    if (state.started) PadelApp.match.buildUnplayed(state);
    changed();
  }
  function toggleActive(id) {
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].id === id) state.players[i].active = !state.players[i].active;
    }
    if (state.started) PadelApp.match.buildUnplayed(state);
    changed();
  }
  function setGender(id, gender) {
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].id === id) state.players[i].gender = gender || null;
    }
    if (state.started) PadelApp.match.buildUnplayed(state);
    changed();
  }

  /* -------- tournament -------- */
  function start(settings) {
    state.settings = Object.assign(defaultSettings(), settings || {});
    state.rounds = [];
    state.currentIndex = 0;
    state.started = true;
    PadelApp.match.buildUnplayed(state);
    changed();
  }

  function reset() {
    state = fresh();
    changed();
  }

  function updateSettings(patch) {
    patch = patch || {};
    state.settings = Object.assign(state.settings, patch);
    changed();
  }

  function regenerateUnplayed() {
    PadelApp.match.buildUnplayed(state);
    changed();
  }

  /* -------- scoring -------- */
  function recordScore(roundIdx, courtIdx, ptA, ptB) {
    var round = state.rounds[roundIdx];
    if (!round || round.played) return false;
    var court = round.courts[courtIdx];
    if (!court) return false;
    court.score = [ptA, ptB];

    var allDone = round.courts.every(function (c) { return c.score !== null; });
    var justCompleted = false;
    if (allDone) {
      round.played = true;
      justCompleted = true;
      if (roundIdx + 1 > state.currentIndex) state.currentIndex = roundIdx + 1;
    }
    if (justCompleted && PadelApp.match.isMexican(state.settings)) {
      PadelApp.match.buildUnplayed(state);
    }
    changed();
    return justCompleted;
  }

  return {
    load: load, get: get, settings: settings, players: players, started: started,
    subscribe: subscribe,
    addPlayer: addPlayer, removePlayer: removePlayer,
    toggleActive: toggleActive, setGender: setGender,
    start: start, reset: reset, regenerateUnplayed: regenerateUnplayed, updateSettings: updateSettings,
    recordScore: recordScore
  };
})();