/* storage.js — localStorage persistence (single versioned key) */
var PadelApp = window.PadelApp || {};

PadelApp.store = (function () {
  var KEY = 'padelState_v1';

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* ignore quota errors */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  return { save: save, load: load, clear: clear };
})();