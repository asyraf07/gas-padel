/* setupScreen.js — Screen 1: players, format, courts, scoring */
var PadelApp = window.PadelApp || {};

PadelApp.setup = (function () {
  var FORMATS = {
    americano: 'Americano',
    mexicano: 'Mexicano',
    mixed_americano: 'Mixed Americano',
    mixed_mexicano: 'Mixed Mexicano'
  };
  var PRI = {
    wins: 'Wins', points: 'Points', diff: 'Points diff',
    matches: 'Matches played', opp: 'Points against', losses: 'Losses'
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

  function playerRows() {
    var pl = PadelApp.state.players();
    if (!pl.length) return '<p class="muted">No players yet. Add at least 4.</p>';
    return pl.map(function (p, i) {
      return '<div class="ply" data-id="' + p.id + '">' +
        '<span class="gidx">' + (i + 1) + '</span>' + gb(p.gender) +
        '<span class="pname">' + esc(p.name) + '</span>' +
        '<button class="btnghost small" data-act="remove">&times; Remove</button>' +
        '</div>';
    }).join('');
  }

  function prioEditor() {
    var s = PadelApp.state.settings();
    var rows = s.scoringPriority.map(function (p, i) {
      return '<div class="prio-row">' +
        '<span class="prio-name">' + (PRI[p.key] || p.key) + '</span>' +
        '<span class="prio-dir">' + (p.dir === 'asc' ? 'low first' : 'high first') + '</span>' +
        '<button class="btnghost tgl" data-i="' + i + '" data-key="' + p.key + '" data-dir="' + p.dir + '">' + (p.dir === 'asc' ? '\u2191' : '\u2193') + '</button>' +
        '<button class="btnghost mv" data-i="' + i + '" data-d="' + (i - 1) + '"' + (i === 0 ? ' disabled' : '') + '>&#8593;</button>' +
        '<button class="btnghost mv" data-i="' + i + '" data-d="' + (i + 1) + '"' + (i === s.scoringPriority.length - 1 ? ' disabled' : '') + '>&#8595;</button>' +
        '<button class="btnghost del" data-i="' + i + '">&times;</button>' +
        '</div>';
    }).join('') +
      '<div class="prio-add">' +
      '<select id="prio-key">' + Object.keys(PRI).map(function (k) {
        var used = s.scoringPriority.some(function (p) { return p.key === k; });
        return '<option value="' + k + '"' + (used ? ' disabled' : '') + '>' + PRI[k] + '</option>';
      }).join('') + '</select>' +
      '<button class="btn small" data-act="addprio">Add key</button>' +
      '</div>';
    return rows;
  }

  function warnHtml() {
    var act = PadelApp.state.players().filter(function (p) { return p.active; }).length;
    if (act > 0 && act < 4) return '<div class="warn">A game needs at least 4 active players. You have ' + act + '.</div>';
    return '';
  }

  function layout() {
    var s = PadelApp.state.settings();
    var ev = PadelApp.state.currentEvent();
    return '<header class="apphead"><div class="headrow">' +
      '<button class="btnghost small" data-act="back">&larr; Events</button>' +
      '<span class="estitle">' + esc(ev ? ev.name : 'Setup') + '</span></div></header>' +

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
      '</div>' +

      '<div class="card"><h2>Ranking priority</h2>' +
      '<div class="hint">Top = most important. Move keys; tap \u2191/\u2193 for direction.</div>' +
      '<div id="prio">' + prioEditor() + '</div>' +
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
        scoringPriority: s.scoringPriority.map(function (p) { return { key: p.key, dir: p.dir }; })
      };
    }

    function addPlayer() {
      var name = (root.querySelector('#p-name').value || '').trim();
      var g = root.querySelector('#p-gender').value || null;
      if (!name) return;
      PadelApp.state.addPlayer(name, g);
    }

    root.querySelector('[data-act="addplayer"]').addEventListener('click', addPlayer);
    root.querySelector('#p-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') addPlayer(); });

    root.addEventListener('click', function (e) {
      var back = e.target.closest('[data-act="back"]');
      if (back) { PadelApp.state.leaveEvent(); return; }
      var rem = e.target.closest('[data-act="remove"]');
      if (rem) {
        var id = Number(rem.closest('.ply').getAttribute('data-id'));
        PadelApp.state.removePlayer(id);
        return;
      }
      var addp = e.target.closest('[data-act="addprio"]');
      if (addp) {
        var keySel = root.querySelector('#prio-key');
        var key = keySel.value;
        var prio = PadelApp.state.settings().scoringPriority;
        if (!prio.some(function (p) { return p.key === key; })) prio.push({ key: key, dir: 'desc' });
        PadelApp.state.updateSettings({});
        return;
      }
var dirB = e.target.closest('[data-dir]');
      if (dirB) return; // handled by direction listener below
      var mv = e.target.closest('.mv');
      if (mv && !mv.disabled) {
        var arr = PadelApp.state.settings().scoringPriority;
        var si = parseInt(mv.getAttribute('data-i'), 10);
        var dn = parseInt(mv.getAttribute('data-d'), 10);
        if (dn >= 0 && dn < arr.length) { var t = arr[si]; arr[si] = arr[dn]; arr[dn] = t; }
        PadelApp.state.updateSettings({});
        return;
      }
      var del = e.target.closest('.del');
      if (del) {
        var di = parseInt(del.getAttribute('data-i'), 10);
        PadelApp.state.settings().scoringPriority.splice(di, 1);
        PadelApp.state.updateSettings({});
        return;
      }
    });

    // delegate dir toggle on .t handler (separate)
    root.addEventListener('click', function (e) {
      var t = e.target.closest('.t');
      if (!t) return;
      var iP = parseInt(t.getAttribute('data-i'), 10);
      var key = t.getAttribute('data-key');
      var dir = t.getAttribute('data-dir');
      var arr = PadelApp.state.settings().scoringPriority;
      for (var j = 0; j < arr.length; j++) {
        if (arr[j].key === key) { arr[j].dir = dir === 'asc' ? 'desc' : 'asc'; }
      }
      PadelApp.state.updateSettings({});
    });

    root.querySelector('[data-act="start"]').addEventListener('click', function () {
      var settings = readSettings();
      var active = PadelApp.state.players().filter(function (p) { return p.active; }).length;
      var mixed = settings.format.indexOf('mixed') === 0;
      var missingGender = PadelApp.state.players().some(function (p) { return !p.gender; });
      if (active < 4) { window.alert('Add at least 4 active players to start.'); return; }
      if (mixed && missingGender) { window.alert('Mixed formats require a gender for every player.'); return; }
      PadelApp.state.start(settings);
    });
  }

  return { layout: layout, bind: bind };
})();