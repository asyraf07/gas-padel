/* setupScreen.js — Screen 1: players, format, courts, scoring */
var PadelApp = window.PadelApp || {};

PadelApp.setup = (function () {
  var MATCHTYPES = { americano: 'Americano', mexicano: 'Mexicano' };
  var PAIRINGS = { normal: 'Normal', mixed: 'Mixed', fixed: 'Fixed' };

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

  function minPlayers(s) {
    var cfg = s || PadelApp.state.settings();
    return (cfg.numCourts || 1) * (cfg.pairing === 'fixed' ? 2 : 4);
  }

  function playerRows() {
    var s = PadelApp.state.settings();
    var mixed = s.pairing === 'mixed';
    var pl = PadelApp.state.players();
    if (!pl.length) return '<p class="muted">No players yet. Add at least ' + minPlayers() + '.</p>';
    return pl.map(function (p, i) {
      var badge = mixed && !p.gender ? ' <span class="badge">missing gender</span>' : '';
      var gsel = s.pairing === 'fixed' ? '' :
        '<select class="gsel" data-id="' + p.id + '" title="Gender">' +
        '<option value="">&mdash;</option>' +
        '<option value="M"' + (p.gender === 'M' ? ' selected' : '') + '>M</option>' +
        '<option value="F"' + (p.gender === 'F' ? ' selected' : '') + '>F</option></select>';
      return '<div class="ply" data-id="' + p.id + '">' +
        '<span class="gidx">' + (i + 1) + '</span>' + gb(p.gender) +
        '<span class="pname">' + esc(p.name) + badge + '</span>' +
        '<button class="btnghost small" data-act="renameplayer" data-id="' + p.id + '" title="Rename player">&#9998;</button>' +
        gsel +
        '<button class="btnghost small" data-act="remove">&times; Remove</button>' +
        '</div>';
    }).join('');
  }

  function warnHtml() {
    var s = PadelApp.state.settings();
    var pl = PadelApp.state.players();
    var act = pl.filter(function (p) { return p.active; }).length;
    var min = minPlayers();
    var warns = [];
    if (act > 0 && act < min) warns.push('A game needs at least ' + min + ' active ' + (s.pairing === 'fixed' ? 'team' : 'player') + 's (' + s.numCourts + ' court' + (s.numCourts > 1 ? 's' : '') + '). You have ' + act + '.');
    if (s.pairing === 'mixed' && pl.some(function (p) { return p.active && !p.gender; })) warns.push('Mixed pairing requires a gender for every active player.');
    if (s.pairing === 'mixed') {
      var m = 0, f = 0;
      pl.forEach(function (p) {
        if (!p.active || !p.gender) return;
        if (p.gender === 'F') f++; else m++;
      });
      if (m !== f) warns.push('Mixed mode needs an equal number of men and women to build a round-robin (you have ' + m + ' men and ' + f + ' women).');
    }
    return warns.length ? '<div class="warn">' + warns.join('<br/>') + '</div>' : '';
  }

  function layout() {
    var s = PadelApp.state.settings();
    var fixed = s.pairing === 'fixed';
    var mixed = s.pairing === 'mixed';
    var ev = PadelApp.state.currentEvent();
    var date = ev && ev.date ? '<span class="evdate">' + esc(fmtDate(ev.date)) + '</span>' : '';
    var genderSel = fixed ? '' :
      '<select id="p-gender"' + (mixed ? ' required' : '') + '><option value="">' + (mixed ? 'Gender *' : 'Gender') + '</option><option value="M">Male</option><option value="F">Female</option></select>';
    return '<header class="apphead"><div class="headrow">' +
      '<button class="btnghost small" data-act="back">&larr; Events</button>' +
      '<span class="estitle">' + esc(ev ? ev.name : 'Setup') + date + '</span>' +
      '<button class="btnghost small" data-act="editevent" title="Edit event">&#9998;</button></div></header>' +

      '<div class="card"><h2>' + (fixed ? 'Teams' : 'Players') + '</h2>' +
      '<div class="form-row">' +
      '<input id="p-name" type="text" placeholder="' + (fixed ? 'Team name' : 'Name') + '" autocomplete="off" />' +
      genderSel +
      '<button class="btn" data-act="addplayer">Add</button>' +
      '</div>' +
      '<div class="player-list">' + playerRows() + '</div>' +
      '</div>' +

      '<div class="card"><h2>Format &amp; Courts</h2>' +
      '<div class="hint">Match type <select id="s-matchtype">' + Object.keys(MATCHTYPES).map(function (k) {
        return '<option value="' + k + '"' + (s.matchType === k ? ' selected' : '') + '>' + MATCHTYPES[k] + '</option>';
      }).join('') + '</select></div>' +
      '<div class="hint">Pairing <select id="s-pairing">' + Object.keys(PAIRINGS).map(function (k) {
        return '<option value="' + k + '"' + (s.pairing === k ? ' selected' : '') + '>' + PAIRINGS[k] + '</option>';
      }).join('') + '</select>' +
      '<div class="hint">' + (s.pairing === 'fixed' ? 'Each entry is a fixed team — no genders needed.' : s.pairing === 'mixed' ? 'Mixed pairs a man and a woman — every player needs a gender, and an equal number of men and women is required to start.' : 'Normal pairs players by rank and rotation.') + '</div></div>' +
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
        matchType: root.querySelector('#s-matchtype').value,
        pairing: root.querySelector('#s-pairing').value,
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
        matchType: root.querySelector('#s-matchtype').value,
        pairing: root.querySelector('#s-pairing').value,
        numCourts: parseInt(root.querySelector('#s-courts').value, 10) || 1,
        totalPoints: parseInt(root.querySelector('#s-wins').value, 10) || 21,
        compensation: root.querySelector('#s-comp').checked
      };
    }

    function addPlayer() {
      var s = PadelApp.state.settings();
      var fixed = s.pairing === 'fixed';
      var name = (root.querySelector('#p-name').value || '').trim();
      var gEl = root.querySelector('#p-gender');
      var g = gEl ? (gEl.value || null) : null;
      if (!name) return;
      if (s.pairing === 'mixed' && !g) { PadelApp.modal.alert('Mixed pairing requires a gender.'); return; }
      var err = PadelApp.state.addPlayer(name, g);
      if (err) { PadelApp.modal.alert(err); return; }
      var ni = document.getElementById('p-name');
      if (ni) ni.focus();
    }

    root.querySelector('[data-act="addplayer"]').addEventListener('click', addPlayer);
    root.querySelector('#p-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') addPlayer(); });
    root.querySelector('#s-wins').addEventListener('input', function () {
      PadelApp.state.updateSettingsSilent({ totalPoints: parseInt(root.querySelector('#s-wins').value, 10) || 21 });
    });
    root.querySelector('#s-matchtype').addEventListener('change', function () {
      PadelApp.state.updateSettings(currentFormPatch());
    });
    root.querySelector('#s-pairing').addEventListener('change', function () {
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
        var pl2 = PadelApp.state.players();
        var nm2 = '';
        for (var i2 = 0; i2 < pl2.length; i2++) if (pl2[i2].id === id) nm2 = pl2[i2].name;
        PadelApp.modal.confirm('Remove ' + nm2 + '? Played rounds keep their scores.', 'Remove player', function (ok) {
          if (ok) PadelApp.state.removePlayer(id);
        });
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
          if (!v) return;
          var err = PadelApp.state.renamePlayer(pid, v);
          if (err) PadelApp.modal.alert(err);
        });
        return;
      }
    });

    root.addEventListener('change', function (e) {
      var gsel = e.target.closest('.gsel');
      if (gsel) PadelApp.state.setGender(Number(gsel.getAttribute('data-id')), gsel.value || null);
    });

    PadelApp.prio.bind(root,
      function () { return PadelApp.state.settings().scoringPriority; },
      function () { PadelApp.state.updateSettings(currentFormPatch()); });

    root.querySelector('[data-act="start"]').addEventListener('click', function () {
      var settings = readSettings();
      var active = PadelApp.state.players().filter(function (p) { return p.active; }).length;
      var mixed = settings.pairing === 'mixed';
      var unit = settings.pairing === 'fixed' ? 'team' : 'player';
      if (active < minPlayers(settings)) { PadelApp.modal.alert('Add at least ' + minPlayers(settings) + ' active ' + unit + 's to start.'); return; }
      if (mixed && PadelApp.state.players().some(function (p) { return p.active && !p.gender; })) { PadelApp.modal.alert('Mixed pairing requires a gender for every active player.'); return; }
      if (mixed) {
        var m2 = 0, f2 = 0;
        PadelApp.state.players().forEach(function (p) {
          if (!p.active || !p.gender) return;
          if (p.gender === 'F') f2++; else m2++;
        });
        if (m2 !== f2) { PadelApp.modal.alert('Mixed mode needs an equal number of men and women to build a round-robin (you have ' + m2 + ' men and ' + f2 + ' women).'); return; }
      }
      PadelApp.state.start(settings);
    });
  }

  return { layout: layout, bind: bind };
})();