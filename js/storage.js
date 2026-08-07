/* storage.js — localStorage persistence (app-wide versioned key) */
var PadelApp = window.PadelApp || {};

PadelApp.store = (function () {
  var KEY = 'padelApp_v1';
  var OLD_KEY = 'padelState_v1';

  function save(app) {
    try {
      localStorage.setItem(KEY, JSON.stringify(app));
    } catch (e) { /* ignore quota errors */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.events)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  /* migrate the old single-event state into the events model */
  function loadLegacy() {
    try {
      var raw = localStorage.getItem(OLD_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return (s && s.players) ? s : null;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  return { save: save, load: load, loadLegacy: loadLegacy, clear: clear };
})();