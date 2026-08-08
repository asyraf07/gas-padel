/* setupScreen.js — Screen 1: players, format, courts, scoring */
var PadelApp = window.PadelApp || {};

PadelApp.setup = (function () {
  var FORMATS = {
    americano: 'Americano',
    mexicano: 'Mexicano',
    mixed_americano: 'Mixed Americano',
    mixed_mexicano: 'Mixed Mexicano'
  };

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function gb(g) {
    if (!g) return '';
    return g === 'F' ? '<span class="g g-f">F</span>' : '<span class="g g-m">M</span>';
  }

  function fmtDate(v) {
    if (!v) return '';
    var d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function minPlayers() {
    return (PadelApp.state.settings().numCourts || 1) * 4;
  }

  function playerRows() {
    var pl = PadelApp.state.players();
    if (!pl.length) return '<p class="muted">No players yet. Add at least ' + minPlayers() + '.</p>';
    return pl.map(function (p, i) {
      return '<div class="ply" data-id="' + p.id + '">' +
        '<span class="gidx">' + (i + 1) + '</span>' + gb(p.gender) +
        '<span class="pname">' + esc(p.name) + '</span>' +
        '<button class="btnghost small" data-act="renameplayer" data-id="' + p.id + '" title="Rename player">&#9998;</button>' +
        '<button class="btnghost small" data-act="remove">&times; Remove</button>' +
        '</div>';
    }).join('');
  }

  function warnHtml() {
    var act = PadelApp.state.players().filter(function (p) { return p.active; }).length;
    var min = minPlayers();
    if (act > 0 && act < min) return '<div class="warn">A game needs at least ' + min + ' active players (' + PadelApp.state.settings().numCourts + ' court' + (PadelApp.state.settings().numCourts > 1 ? 's' : '') + '). You have ' + act + '.</div>';
    return '';
  }

  function layout() {
    var s = PadelApp.state.settings();
    var ev = PadelApp.state.currentEvent();
    var date = ev && ev.date ? '<span class="evdate">' + esc(fmtDate(ev.date)) + '</span>' : '';
    return '<header class="apphead"><div class="headrow">' +
      '<button class="btnghost small" data-act="back">&larr; Events</button>' +
      '<span class="estitle">' + esc(ev ? ev.name : 'Setup') + date + '</span>' +
      '<button class="btnghost small" data-act="editevent" title="Edit event">&#9998;</button></div></header>' +

      '<div class="card"><h2>Players</h2>' +
      '<div class="form-row">' +
      '<input id="p-name" type="text" placeholder="Name" autocomplete="off" />' +
      '<select id="p-gender"><option value="">Gender</option><option value="M">Male</option><option value="F">Female</option></select>' +
      '<button class="btn" data-act="addplayer">Add</button>' +
      '</div>' +
      '<div class="player-list">' + playerRows() + '</div>' +
      '</div>' +

      '<div class="card"><h2>Format &amp; Courts</h2>' +
      '<select id="s-format">' + Object.keys(FORMATS).map(function (k) {
        return '<option value="' + k + '"' + (s.format === k ? ' selected' : '') + '>' + FORMATS[k] + '</option>';
      }).join('') + '</select>' +
      '<div class="hint">Courts <select id="s-courts">' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) {
        return '<option value="' + n + '"' + (s.numCourts === n ? ' selected' : '') + '>' + n + '</option>';
      }).join('') + '</select></div>' +

      '<div class="form-row">' +
      '<label>Total points <input id="s-wins" type="number" min="1" max="999" value="' + s.totalPoints + '" /></label>' +
      '</div>' +

      '<label class="chk"><input id="s-comp" type="checkbox"' + (s.compensation ? ' checked' : '') + ' /> <span>Compensation points</span></label>' +
      '<div class="hint">Players who play fewer matches get extra points (floor(totalPoints/2) each) to make up the difference.</div>' +
      '</div>' +

      '<div class="card"><h2>Ranking priority</h2>' +
      '<div class="hint">Top = most important. Move keys; set High/Low order.</div>' +
      '<div id="prio">' + PadelApp.prio.html(s.scoringPriority) + '</div>' +
      '</div>' +

      warnHtml() +
      '<button class="btn btn-lg start" data-act="start">Start Event</button>';
  }

  function bind(root) {
    function readSettings() {
      var s = PadelApp.state.settings();
      return {
        format: root.querySelector('#s-format').value,
        numCourts: parseInt(root.querySelector('#s-courts').value, 10),
        totalPoints: parseInt(root.querySelector('#s-wins').value, 10) || 21,
        compensation: root.querySelector('#s-comp').checked,
        scoringPriority: s.scoringPriority.map(function (p) { return { key: p.key, dir: p.dir }; })
      };
    }

    /* persist the live DOM values of every setup field before a re-render,
       so no interaction can reset fields whose change event hasn't fired yet */
    function currentFormPatch() {
      return {
        format: root.querySelector('#s-format').value,
        numCourts: parseInt(root.querySelector('#s-courts').value, 10) || 1,
        totalPoints: parseInt(root.querySelector('#s-wins').value, 10) || 21,
        compensation: root.querySelector('#s-comp').checked
      };
    }

    function addPlayer() {
      var name = (root.querySelector('#p-name').value || '').trim();
      var g = root.querySelector('#p-gender').value || null;
      if (!name) return;
      PadelApp.state.addPlayer(name, g);
      var ni = document.getElementById('p-name');
      if (ni) ni.focus();
    }

    root.querySelector('[data-act="addplayer"]').addEventListener('click', addPlayer);
    root.querySelector('#p-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') addPlayer(); });
    root.querySelector('#s-wins').addEventListener('input', function () {
      PadelApp.state.updateSettingsSilent({ totalPoints: parseInt(root.querySelector('#s-wins').value, 10) || 21 });
    });
    root.querySelector('#s-format').addEventListener('change', function () {
      PadelApp.state.updateSettings(currentFormPatch());
    });
    root.querySelector('#s-courts').addEventListener('change', function () {
      PadelApp.state.updateSettings(currentFormPatch());
    });
    root.querySelector('#s-comp').addEventListener('change', function () {
      PadelApp.state.updateSettings(currentFormPatch());
    });

    root.addEventListener('click', function (e) {
      var back = e.target.closest('[data-act="back"]');
      if (back) { PadelApp.state.leaveEvent(); return; }
      var evedit = e.target.closest('[data-act="editevent"]');
      if (evedit) {
        var cev = PadelApp.state.currentEvent();
        if (cev) {
          PadelApp.modal.form('Edit event',
            '<label class="fld">Event name<input class="modal-input" id="se-name" type="text" value="' + esc(cev.name) + '" required /></label>' +
            '<label class="fld">Date &amp; time<input class="modal-input" id="se-date" type="datetime-local" value="' + esc(cev.date || '') + '" /></label>',
            function (overlay) {
              var name = (overlay.querySelector('#se-name').value || '').trim();
              var date = overlay.querySelector('#se-date').value || '';
              if (!name) { PadelApp.modal.alert('Enter an event name.', 'Edit event'); return; }
              PadelApp.state.renameEvent(cev.id, name);
              PadelApp.state.setEventDate(cev.id, date);
            });
        }
        return;
      }
      var rem = e.target.closest('[data-act="remove"]');
      if (rem) {
        var id = Number(rem.closest('.ply').getAttribute('data-id'));
        PadelApp.state.removePlayer(id);
        return;
      }
      var rp = e.target.closest('[data-act="renameplayer"]');
      if (rp) {
        var pid = Number(rp.getAttribute('data-id'));
        var pl = PadelApp.state.players();
        var nm = '';
        for (var i = 0; i < pl.length; i++) if (pl[i].id === pid) nm = pl[i].name;
        PadelApp.modal.prompt('Rename player', nm, function (value) {
          var v = (value || '').trim();
          if (v) PadelApp.state.renamePlayer(pid, v);
        });
        return;
      }
    });

    PadelApp.prio.bind(root,
      function () { return PadelApp.state.settings().scoringPriority; },
      function () { PadelApp.state.updateSettings(currentFormPatch()); });

    root.querySelector('[data-act="start"]').addEventListener('click', function () {
      var settings = readSettings();
      var active = PadelApp.state.players().filter(function (p) { return p.active; }).length;
      var mixed = settings.format.indexOf('mixed') === 0;
      var missingGender = PadelApp.state.players().some(function (p) { return !p.gender; });
      if (active < minPlayers()) { PadelApp.modal.alert('Add at least ' + minPlayers() + ' active players to start.'); return; }
      if (mixed && missingGender) { PadelApp.modal.alert('Mixed formats require a gender for every player.'); return; }
      PadelApp.state.start(settings);
    });
  }

  return { layout: layout, bind: bind };
})();