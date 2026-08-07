/* menuScreen.js — main menu: list of events, create/open/delete */
var PadelApp = window.PadelApp || {};

PadelApp.menu = (function () {
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtDate(v) {
    if (!v) return 'No date set';
    var d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function statusOf(ev) {
    if (!ev.match.started) return { label: 'Not started', cls: 'st-new' };
    var has = (ev.match.rounds || []).length > 0;
    var done = has && ev.match.rounds.every(function (r) { return r.played; });
    return done ? { label: 'Finished', cls: 'st-done' } : { label: 'Running', cls: 'st-run' };
  }

  function layout() {
    var evs = PadelApp.state.events();
    var list = evs.map(function (ev) {
      var st = statusOf(ev);
      return '<div class="event-card" data-id="' + ev.id + '">' +
        '<div class="ev-info">' +
        '<div class="ev-name">' + esc(ev.name) + '</div>' +
        '<div class="ev-meta">' +
        '<span class="ev-date">' + fmtDate(ev.date) + '</span>' +
        '<span class="ev-players">' + ev.match.players.length + ' player' + (ev.match.players.length === 1 ? '' : 's') + '</span>' +
        '</div>' +
        '<span class="ev-status ' + st.cls + '">' + st.label + '</span>' +
        '</div>' +
        '<div class="ev-actions">' +
        '<button class="btn small" data-act="open">Open</button>' +
        '<button class="btnghost small" data-act="delete" title="Delete event">&times;</button>' +
        '</div>' +
        '</div>';
    }).join('');
    var empty = evs.length ? '' : '<div class="muted card">No events yet. Create one below.</div>';

    return '<header class="apphead"><span class="title">Padel Match Maker</span></header>' +

      '<div class="card"><h2>Events</h2>' +
      '<div class="event-list">' + list + '</div>' + empty +
      '</div>' +

      '<div class="card"><h2>New event</h2>' +
      '<div class="form-row">' +
      '<input id="ev-name" type="text" placeholder="Event name" autocomplete="off" />' +
      '<input id="ev-date" type="datetime-local" />' +
      '<button class="btn" data-act="create">Create</button>' +
      '</div>' +
      '<div class="hint">Multiple events can run at the same time — each keeps its own players, format and scores, and you can switch between them anytime.</div>' +
      '</div>';
  }

  function bind(root) {
    function create() {
      var name = (root.querySelector('#ev-name').value || '').trim();
      if (!name) { window.alert('Enter an event name.'); return; }
      var date = root.querySelector('#ev-date').value || '';
      resetRunView();
      PadelApp.state.createEvent(name, date);
    }

    function resetRunView() {
      if (PadelApp.run && PadelApp.run.view) {
        PadelApp.run.view.tab = 'courts';
        PadelApp.run.view.roundIdx = null;
      }
    }

    root.querySelector('[data-act="create"]').addEventListener('click', create);
    root.querySelector('#ev-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') create(); });

    root.addEventListener('click', function (e) {
      var op = e.target.closest('[data-act="open"]');
      if (op) {
        var id = Number(op.closest('.event-card').getAttribute('data-id'));
        resetRunView();
        PadelApp.state.openEvent(id);
        return;
      }
      var del = e.target.closest('[data-act="delete"]');
      if (del) {
        var did = Number(del.closest('.event-card').getAttribute('data-id'));
        var ev = PadelApp.state.events().filter(function (x) { return x.id === did; })[0];
        if (ev && window.confirm('Delete event "' + ev.name + '"? This removes its match data.')) {
          PadelApp.state.removeEvent(did);
        }
        return;
      }
    });
  }

  return { layout: layout, bind: bind };
})();