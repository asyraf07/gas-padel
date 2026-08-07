/* app.js — bootstrap + screen switching */
var PadelApp = window.PadelApp || {};

PadelApp.app = (function () {
  var lastScreen = null;

  function screenName() {
    var ev = PadelApp.state.currentEvent();
    if (!ev) return 'menu';
    return ev.match.started ? 'run' : 'setup';
  }

  function renderAll() {
    var screen = screenName();
    var prevActive = document.activeElement;
    var prevId = (prevActive && prevActive !== document.body && prevActive.id)
      ? prevActive.id : null;
    var y = screen === lastScreen
      ? (window.pageYOffset || document.documentElement.scrollTop || 0)
      : 0;
    var container = document.getElementById('app');
    var root = document.createElement('div');
    root.id = 'app';
    var ev = PadelApp.state.currentEvent();
    if (!ev) {
      root.innerHTML = PadelApp.menu.layout();
      PadelApp.menu.bind(root);
    } else if (ev.match.started) {
      root.innerHTML = PadelApp.run.layout();
      PadelApp.run.bind(root);
    } else {
      root.innerHTML = PadelApp.setup.layout();
      PadelApp.setup.bind(root);
    }
    container.parentNode.replaceChild(root, container);
    window.scrollTo(0, y);
    if (screen === lastScreen && prevId) {
      var next = root.querySelector('#' + prevId);
      if (next && next !== document.activeElement) {
        try { next.focus({ preventScroll: true }); } catch (e) { next.focus(); }
      }
    }
    setTimeout(function () {
      if (window.pageYOffset < y) window.scrollTo(0, y);
    }, 0);
    lastScreen = screen;
  }

  function boot() {
    PadelApp.state.load();
    PadelApp.state.subscribe(renderAll);
    renderAll();
  }

  window.addEventListener('DOMContentLoaded', boot);
  return { renderAll: renderAll, boot: boot };
})();