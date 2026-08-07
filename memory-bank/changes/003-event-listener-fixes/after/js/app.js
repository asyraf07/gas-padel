/* app.js — bootstrap + screen switching */
var PadelApp = window.PadelApp || {};

PadelApp.app = (function () {
  function renderAll() {
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
  }

  function boot() {
    PadelApp.state.load();
    PadelApp.state.subscribe(renderAll);
    renderAll();
  }

  window.addEventListener('DOMContentLoaded', boot);
  return { renderAll: renderAll, boot: boot };
})();