/* runScreen.js — Screen 2: courts, leaderboard, players, history */
var PadelApp = window.PadelApp || {};

PadelApp.run = (function () {
  var view = { tab: 'courts', roundIdx: null };

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function gb(g) {
    return g === 'F' ? '<span class="g g-f">F</span>' : g === 'M' ? '<span class="g g-m">M</span>' : '';
  }
  function pName(id) {
    var ps = PadelApp.state.players();
    for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i].name;
    return '(removed)';
  }
  function formatName(f) {
    return { americano: 'Americano', mexicano: 'Mexicano', mixed_americano: 'Mixed Americano', mixed_mexicano: 'Mixed Mexicano' }[f] || f;
  }

  /* -------- header + tabs -------- */
  function header() {
    var s = PadelApp.state.settings();
    return '<header class="apphead">' +
      '<div class="estitle">' + formatName(s.format) +
      '<span class="fmt">' + s.numCourts + ' court' + (s.numCourts > 1 ? 's' : '') + ' &middot; first to ' + s.winPoints + (s.winByTwo ? ' by 2' : '') + '</span></div>' +
      '<div class="tabs">' +
      ['courts', 'leaderboard', 'players'].map(function (t) {
        var lbl = { courts: 'Courts', leaderboard: 'Leaderboard', players: 'Players' }[t];
        return '<button class="tab' + (view.tab === t ? ' on' : '') + '" data-tab="' + t + '">' + lbl + '</button>';
      }).join('') + '</div>' +
      '<button class="btnghost small end" data-act="end">End event</button>' +
      '</header>';
  }

  /* -------- courts tab -------- */
  function roundNav(s) {
    var total = s.rounds.length;
    var label = '';
    if (total === 0) label = 'No rounds yet';
    else {
      var r = s.rounds[view.roundIdx];
      label = 'Round ' + (view.roundIdx + 1) + ' of ' + total;
      if (r) label += r.played ? ' — played' : ' — upcoming';
      else label += ' — done';
    }
    return '<div class="roundnav">' +
      '<button class="btnghost navbtn" data-act="prev" ' + (view.roundIdx <= 0 ? 'disabled' : '') + '>&larr;</button>' +
      '<span class="rlabel">' + label + '</span>' +
      '<button class="btnghost navbtn" data-act="next" ' + (view.roundIdx >= total - 1 ? 'disabled' : '') + '>&rarr;</button>' +
      '</div>';
  }

  function courtCards(r) {
    if (!r || !r.courts.length) {
      return '<div class="muted card">Not enough active players for a full court.</div>';
    }
    var s = PadelApp.state.settings();
    return r.courts.map(function (c, i) {
      var input;
      if (c.score !== null) {
        input = '<div class="score-final"><b>' + c.score[0] + '</b> &ndash; <b>' + c.score[1] + '</b></div>';
      } else {
        input = '<div class="score-input">' +
          '<input type="number" id="sc-a-' + i + '" min="0" placeholder="0" inputmode="numeric" />' +
          '<span class="vs">:</span>' +
          '<input type="number" id="sc-b-' + i + '" min="0" placeholder="0" inputmode="numeric" />' +
          '<button class="btn small save" data-court="' + i + '">Save</button>' +
          '</div>';
      }
      return '<div class="court card">' +
        '<div class="ctitle">Court ' + (i + 1) + '</div>' +
        '<div class="teamrow"><span class="team">' + teamHtml(c.teamA) + '</span></div>' +
        '<div class="vsline">vs</div>' +
        '<div class="teamrow"><span class="team">' + teamHtml(c.teamB) + '</span></div>' +
        input + '</div>';
    }).join('');
  }

  function teamHtml(ids) {
    return ids.map(function (id) {
      var p = pnameObj(id);
      return p ? '<span class="ply-name">' + esc(p.name) + gb(p.gender) + '</span>' : '<span class="muted">(removed)</span>';
    }).join('');
  }

  function courtsTab() {
    var s = PadelApp.state.get();
    var r = s.rounds[view.roundIdx];
    var byes = r && r.byes && r.byes.length
      ? '<div class="byes">Bye: ' + r.byes.map(function (id) { return esc(pName(id)); }).join(', ') + '</div>' : '';
    return roundNav(s) + courtCards(r) + byes + historyHtml(s) + endOfRound(s);
  }

  function endOfRound(s) {
    var r = s.rounds[view.roundIdx];
    if (r && !r.played && r.courts.length && r.courts.every(function (c) { return c.score !== null; })) {
      return '<div class="ok">Round complete. ' + (PadelApp.match.isMexican(s.settings) ? 'Next round generated.' : 'Next round is ready.') + '</div>';
    }
    return '';
  }

  function historyHtml(s) {
    var played = s.rounds.filter(function (r) { return r.played; });
    if (!played.length) return '';
    var inner = played.map(function (r) {
      var courts = (r.courts || []).map(function (c) {
        return '<div class="hcourt">' + esc(pName(c.teamA[0])) + '/' + esc(pName(c.teamA[1])) + ' <b>' + c.score[0] + '–' + c.score[1] + '</b> ' + esc(pName(c.teamB[0])) + '/' + esc(pName(c.teamB[1])) + '</div>';
      }).join('');
      return '<div class="hround"><span class="hlabel">Round ' + r.roundNumber + '</span>' + courts + '</div>';
    }).join('');
    return '<details class="history"><summary>Past rounds</summary>' + inner + '</details>';
  }

  /* -------- leaderboard tab -------- */
  function leaderboardTab() {
    var rows = PadelApp.score.leaderboard();
    if (!rows.length) return '<div class="muted card">No players.</div>';
    var head = '<tr><th>#</th><th>Player</th><th>W</th><th>L</th><th>Pts</th><th>Agst</th><th>Diff</th><th>Played</th><th>Streak</th></tr>';
    var body = rows.map(function (r) {
      var st = r.streak > 0 ? 'W' + r.streak : r.streak < 0 ? 'L' + (-r.streak) : '—';
      return '<tr>' +
        '<td>' + r.rank + '</td>' +
        '<td class="lbname">' + esc(r.name) + gb(genderOf(r.id)) + '</td>' +
        '<td>' + r.wins + '</td><td>' + r.losses + '</td>' +
        '<td>' + r.pf + '</td><td>' + r.pa + '</td><td>' + r.diff + '</td>' +
        '<td>' + r.matches + '</td><td>' + st + '</td></tr>';
    }).join('');
    return '<div class="card lb"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  /* -------- players tab -------- */
  function playersTab() {
    var ps = PadelApp.state.players();
    var rows = ps.map(function (p) {
      return '<div class="ply" data-id="' + p.id + '">' +
        gb(p.gender) +
        '<span class="pname' + (p.active ? '' : ' inactive') + '">' + esc(p.name) + '</span>' +
        '<select class="gsel" data-id="' + p.id + '">' +
        '<option value="">—</option><option value="M"' + (p.gender === 'M' ? ' selected' : '') + '>M</option>' +
        '<option value="F"' + (p.gender === 'F' ? ' selected' : '') + '>F</option></select>' +
        '<label class="chk onoff"><input type="checkbox" data-act="toggle" data-id="' + p.id + '"' + (p.active ? ' checked' : '') + ' /> <span>' + (p.active ? 'on' : 'off') + '</span></label>' +
        '<button class="btnghost small" data-act="removeplayer" data-id="' + p.id + '">Remove</button>' +
        '</div>';
    }).join('');
    return '<div class="card"><h2>Players</h2>' +
      '<div class="form-row">' +
      '<input id="run-name" type="text" placeholder="Add player" autocomplete="off" />' +
      '<select id="run-gender"><option value="">Gender</option><option value="M">M</option><option value="F">F</option></select>' +
      '<button class="btn" data-act="addplayer">Add</button>' +
      '</div>' +
      '<div class="player-list">' + (rows || '<p class="muted">No players.</p>') + '</div>' +
      '<div class="hint">Changing players regenerates all upcoming rounds. Played rounds are kept.</div>' +
      '</div>';
  }

  /* -------- layout -------- */
  function layout() {
    var s = PadelApp.state.get();
    if (view.roundIdx === null || view.roundIdx >= s.rounds.length) {
      view.roundIdx = s.currentIndex < s.rounds.length ? s.currentIndex : s.rounds.length - 1;
      if (view.roundIdx < 0) view.roundIdx = 0;
    }
    var body = view.tab === 'leaderboard' ? leaderboardTab()
      : view.tab === 'players' ? playersTab()
      : courtsTab();
    return header() + '<main class="screen">' + body + '</main>';
  }

  /* -------- event wiring -------- */
  function bind(root) {
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]');
      if (t) { view.tab = t.getAttribute('data-tab'); PadelApp.app.renderAll(); return; }

      var prev = e.target.closest('[data-act="prev"]');
      if (prev && !prev.disabled) { view.roundIdx--; PadelApp.app.renderAll(); return; }
      var next = e.target.closest('[data-act="next"]');
      if (next && !next.disabled) { view.roundIdx++; PadelApp.app.renderAll(); return; }

      var save = e.target.closest('.save');
      if (save) {
        var ci = parseInt(save.getAttribute('data-court'), 10);
        var a = parseInt(root.querySelector('#sc-a-' + ci).value, 10);
        var b = parseInt(root.querySelector('#sc-b-' + ci).value, 10);
        if (isNaN(a) || isNaN(b)) { window.alert('Enter both scores.'); return; }
        var err = validate(a, b);
        if (err) { window.alert(err); return; }
        var done = PadelApp.state.recordScore(view.roundIdx, ci, a, b);
        if (done) window.alert('Round complete!');
        return;
      }

      var end = e.target.closest('[data-act="end"]');
      if (end) {
        if (window.confirm('End this event and return to setup? All progress is cleared.')) {
          view.tab = 'courts'; view.roundIdx = null;
          PadelApp.state.reset();
        }
        return;
      }

      var addp = e.target.closest('[data-act="addplayer"]');
      if (addp) {
        var name = (root.querySelector('#run-name').value || '').trim();
        var g = root.querySelector('#run-gender').value || null;
        if (!name) return;
        PadelApp.state.addPlayer(name, g);
        return;
      }
      var rem = e.target.closest('[data-act="removeplayer"]');
      if (rem) { PadelApp.state.removePlayer(Number(rem.getAttribute('data-id'))); return; }
      var tog = e.target.closest('[data-act="toggle"]');
      if (tog) { PadelApp.state.toggleActive(Number(tog.getAttribute('data-id'))); return; }
    });

    root.addEventListener('change', function (e) {
      var gsel = e.target.closest('.gsel');
      if (gsel) { PadelApp.state.setGender(Number(gsel.getAttribute('data-id')), gsel.value || null); return; }
    });

    var ni = root.querySelector('#run-name');
    if (ni) ni.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var g2 = root.querySelector('#run-gender').value || null;
        PadelApp.state.addPlayer((ni.value || '').trim(), g2);
      }
    });
  }

  function validate(a, b) {
    var s = PadelApp.state.settings();
    if (a === b) return 'Scores cannot be tied.';
    var winner = a > b ? a : b;
    if (winner < s.winPoints) return 'Winner must reach ' + s.winPoints + ' points.';
    if (s.winByTwo && Math.abs(a - b) < 2) return 'Win by 2 required.';
    return null;
  }

  function pnameObj(id) {
    var ps = PadelApp.state.players();
    for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
    return null;
  }
  function genderOf(id) { var p = pnameObj(id); return p ? p.gender : null; }

  return { layout: layout, bind: bind, view: view };
})();