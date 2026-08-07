/* app.js — bootstrap + screen switching */
var PadelApp = window.PadelApp || {};

PadelApp.app = (function () {
  function currentStarted() { return PadelApp.state.started(); }

  function renderAll() {
    var root = document.getElementById('app');
    var html;
    if (currentStarted()) {
      html = PadelApp.run.layout();
      root.innerHTML = html;
      PadelApp.run.bind(root);
    } else {
      html = PadelApp.setup.layout();
      root.innerHTML = html;
      PadelApp.setup.bind(root);
    }
  }

  function boot() {
    PadelApp.state.load();
    PadelApp.state.subscribe(renderAll);
    renderAll();
  }

  window.addEventListener('DOMContentLoaded', boot);
  return { renderAll: renderAll, boot: boot };
})();