/* runScreen.js — Screen 2: courts, leaderboard, players, history */
var PadelApp = window.PadelApp || {};

PadelApp.run = (function () {
  var view = { tab: 'courts', roundIdx: null, editing: null };

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
  function fmtDate(v) {
    if (!v) return '';
    var d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /* -------- header + tabs -------- */
  function header() {
    var s = PadelApp.state.settings();
    var ev = PadelApp.state.currentEvent();
    var finished = PadelApp.state.finished();
    var date = ev && ev.date ? '<span class="evdate">' + esc(fmtDate(ev.date)) + '</span>' : '';
    return '<header class="apphead">' +
      '<div class="headrow">' +
      '<button class="btnghost small" data-act="menu">&larr; Events</button>' +
      '<div class="estitle">' + esc(ev ? ev.name : '') +
      (finished ? ' <span class="finished-badge">Finished</span>' : '') +
      '<span class="fmt">' + formatName(s.format) + ' &middot; ' + s.numCourts + ' court' + (s.numCourts > 1 ? 's' : '') + ' &middot; total points ' + s.totalPoints + '</span>' +
      date + '</div>' +
      '<button class="btnghost small" data-act="editevent" title="Edit event">&#9998;</button>' +
      '<button class="btnghost small" data-act="' + (finished ? 'unfinish' : 'finish') + '" title="' + (finished ? 'Reopen event for editing' : 'Finish event') + '">' + (finished ? 'Undo' : 'Finish') + '</button>' +
      '</div>' +
      '<div class="tabs">' +
      ['courts', 'leaderboard', 'players'].map(function (t) {
        var lbl = { courts: 'Courts', leaderboard: 'Leaderboard', players: 'Players' }[t];
        return '<button class="tab' + (view.tab === t ? ' on' : '') + '" data-tab="' + t + '">' + lbl + '</button>';
      }).join('') + '</div>' +
      '</header>';
  }

  function openEventEdit() {
    var ev = PadelApp.state.currentEvent();
    if (!ev) return;
    PadelApp.modal.form('Edit event',
      '<label class="fld">Event name<input class="modal-input" id="ee-name" type="text" value="' + esc(ev.name) + '" required /></label>' +
      '<label class="fld">Date &amp; time<input class="modal-input" id="ee-date" type="datetime-local" value="' + esc(ev.date || '') + '" /></label>',
      function (overlay) {
        var name = (overlay.querySelector('#ee-name').value || '').trim();
        var date = overlay.querySelector('#ee-date').value || '';
        if (!name) { PadelApp.modal.alert('Enter an event name.', 'Edit event'); return; }
        PadelApp.state.renameEvent(ev.id, name);
        PadelApp.state.setEventDate(ev.id, date);
      });
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

  var CHIPS = [11, 12, 15, 18, 21];

  function chipsHtml(total, ci, side) {
    var cs = CHIPS.filter(function (n) { return n <= total; });
    if (!cs.length) return '';
    return '<div class="chips">' + cs.map(function (n) {
      return '<button type="button" class="chip" data-court="' + ci + '" data-side="' + side + '" data-val="' + n + '">' + n + '</button>';
    }).join('') + '</div>';
  }

  function courtCards(r) {
    if (!r || !r.courts.length) {
      return '<div class="muted card">Not enough active players for a full court.</div>';
    }
    var total = PadelApp.state.settings().totalPoints;
    var locked = PadelApp.state.finished();
    return r.courts.map(function (c, i) {
      var editing = view.editing && view.editing.round === view.roundIdx && view.editing.court === i;
      var body;
      if (c.score !== null && !editing) {
        body = '<div class="cscore">' +
          '<div class="cteam"><div class="teamrow"><span class="team">' + teamHtml(c.teamA) + '</span></div>' +
          '<div class="tscore final">' + c.score[0] + '</div></div>' +
          '<div class="vsline">vs</div>' +
          '<div class="cteam"><div class="teamrow"><span class="team">' + teamHtml(c.teamB) + '</span></div>' +
          '<div class="tscore final">' + c.score[1] + '</div></div>' +
          '</div>' +
          (locked ? '' : '<div class="score-actions"><button class="btnghost small" data-act="editscore" data-court="' + i + '">Edit</button></div>');
      } else {
        var va = (editing && c.score) ? c.score[0] : '';
        var vb = (editing && c.score) ? c.score[1] : '';
        body = '<div class="cscore">' +
          '<div class="cteam"><div class="teamrow"><span class="team">' + teamHtml(c.teamA) + '</span></div>' +
          '<div class="tscore"><input type="number" id="sc-a-' + i + '" min="0" max="' + total + '" placeholder="0" inputmode="numeric" value="' + va + '"' + (locked ? ' disabled' : '') + ' /></div>' +
          (locked ? '' : chipsHtml(total, i, 'a')) +
          '</div>' +
          '<div class="vsline">vs</div>' +
          '<div class="cteam"><div class="teamrow"><span class="team">' + teamHtml(c.teamB) + '</span></div>' +
          '<div class="tscore"><input type="number" id="sc-b-' + i + '" min="0" max="' + total + '" placeholder="0" inputmode="numeric" value="' + vb + '"' + (locked ? ' disabled' : '') + ' /></div>' +
          (locked ? '' : chipsHtml(total, i, 'b')) +
          '</div>' +
          '</div>' +
          '<div class="score-actions">' +
          (editing && !locked ? '<button class="btnghost small" data-act="canceledit">Cancel</button>' : '') +
          (!locked ? '<button class="btn small save" data-court="' + i + '">Save</button>' : '') +
          '</div>';
      }
      return '<div class="court card">' +
        '<div class="ctitle">Court ' + (i + 1) + (locked ? ' <span class="locked-tag">locked</span>' : '') + '</div>' + body + '</div>';
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
  var PRI = {
    wins: 'Wins', points: 'Points', diff: 'Points diff',
    matches: 'Matches played', opp: 'Points against', losses: 'Losses'
  };

  function rankByHtml() {
    var s = PadelApp.state.settings();
    var parts = (s.scoringPriority || []).map(function (p) {
      return (PRI[p.key] || p.key) + (p.dir === 'asc' ? ' (low first)' : ' (high first)');
    });
    if (!parts.length) return '';
    if (s.compensation) parts.push('compensation points');
    return '<div class="hint rankby">Ranked by: ' + parts.join(' &middot; ') + '</div>';
  }

  function legendHtml() {
    return '<details class="legend"><summary>Column legend</summary><ul>' +
      '<li><b>#</b> — rank position</li>' +
      '<li><b>Player</b> — player name</li>' +
      '<li><b>W</b> — matches won</li>' +
      '<li><b>L</b> — matches lost</li>' +
      '<li><b>Pts</b> — points scored (includes compensation, shown as <span class="comp">(+N)</span>)</li>' +
      '<li><b>Agst</b> — points scored against you</li>' +
      '<li><b>Diff</b> — points difference (for minus against)</li>' +
      '<li><b>Played</b> — matches played</li>' +
      '<li><b>Streak</b> — current win/loss streak (W2 = won 2 in a row)</li>' +
      '</ul></details>';
  }

  function summaryHtml() {
    if (!PadelApp.state.finished()) return '';
    var ev = PadelApp.state.currentEvent();
    var s = PadelApp.state.settings();
    var rows = PadelApp.score.leaderboard();
    var winner = rows.length ? rows[0] : null;
    return '<div class="card summary">' +
      '<div class="sname">' + esc(ev ? ev.name : '') + '</div>' +
      '<div class="smeta">' + formatName(s.format) + ' &middot; ' + s.numCourts + ' court' + (s.numCourts > 1 ? 's' : '') +
      (ev && ev.date ? ' &middot; ' + esc(fmtDate(ev.date)) : '') + '</div>' +
      (winner ? '<div class="swinner">Winner: ' + esc(winner.name) + '</div>' : '') +
      '</div>';
  }

  function leaderboardTab() {
    var s = PadelApp.state.settings();
    var rows = PadelApp.score.leaderboard();
    if (!rows.length) return '<div class="muted card">No players.</div>';
    var head = '<tr><th>#</th><th>Player</th><th>W</th><th>L</th><th>Pts</th><th>Agst</th><th>Diff</th><th>Played</th><th>Streak</th></tr>';
    var body = rows.map(function (r) {
      var st = r.streak > 0 ? 'W' + r.streak : r.streak < 0 ? 'L' + (-r.streak) : '—';
      return '<tr>' +
        '<td>' + r.rank + '</td>' +
        '<td class="lbname"><span class="n">' + esc(r.name) + '</span>' + gb(genderOf(r.id)) + '</td>' +
        '<td>' + r.wins + '</td><td>' + r.losses + '</td>' +
        '<td>' + r.pf + (r.comp > 0 ? ' <span class="comp">(+' + r.comp + ')</span>' : '') + '</td><td>' + r.pa + '</td><td>' + r.diff + '</td>' +
        '<td>' + r.matches + '</td><td>' + st + '</td></tr>';
    }).join('');
    var prioPanel = '<details class="prio-panel"><summary>Ranking priority</summary>' +
      '<div class="hint">Top = most important. Move keys; set High/Low order.</div>' +
      '<div id="prio">' + PadelApp.prio.html(s.scoringPriority) + '</div></details>';
    return summaryHtml() + '<div class="card lb">' + rankByHtml() +
      '<div class="lb-scroll"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      legendHtml() + '</div>' +
      prioPanel;
  }

  /* -------- players tab -------- */
  function playersTab() {
    var finished = PadelApp.state.finished();
    var ps = PadelApp.state.players();
    var rows = ps.map(function (p) {
      return '<div class="ply" data-id="' + p.id + '">' +
        gb(p.gender) +
        '<span class="pname' + (p.active ? '' : ' inactive') + '">' + esc(p.name) + '</span>' +
        '<button class="btnghost small" data-act="renameplayer" data-id="' + p.id + '" title="Rename player"' + (finished ? ' disabled' : '') + '>&#9998;</button>' +
        '<select class="gsel" data-id="' + p.id + '"' + (finished ? ' disabled' : '') + '>' +
        '<option value="">—</option><option value="M"' + (p.gender === 'M' ? ' selected' : '') + '>M</option>' +
        '<option value="F"' + (p.gender === 'F' ? ' selected' : '') + '>F</option></select>' +
        '<label class="chk onoff"><input type="checkbox" data-act="toggle" data-id="' + p.id + '"' + (p.active ? ' checked' : '') + (finished ? ' disabled' : '') + ' /> <span>' + (p.active ? 'on' : 'off') + '</span></label>' +
        '<button class="btnghost small" data-act="removeplayer" data-id="' + p.id + '"' + (finished ? ' disabled' : '') + '>Remove</button>' +
        '</div>';
    }).join('');
    return '<div class="card"><h2>Players</h2>' +
      '<div class="form-row">' +
      '<input id="run-name" type="text" placeholder="Add player" autocomplete="off"' + (finished ? ' disabled' : '') + ' />' +
      '<select id="run-gender"' + (finished ? ' disabled' : '') + '><option value="">Gender</option><option value="M">M</option><option value="F">F</option></select>' +
      '<button class="btn" data-act="addplayer"' + (finished ? ' disabled' : '') + '>Add</button>' +
      '</div>' +
      '<div class="player-list">' + (rows || '<p class="muted">No players.</p>') + '</div>' +
      '<div class="hint">' + (finished ? 'Event finished — players are locked.' : 'Changing players regenerates all upcoming rounds. Played rounds are kept.') + '</div>' +
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
      if (t) { view.tab = t.getAttribute('data-tab'); view.editing = null; PadelApp.app.renderAll(); return; }

      var prev = e.target.closest('[data-act="prev"]');
      if (prev && !prev.disabled) { view.roundIdx--; view.editing = null; PadelApp.app.renderAll(); return; }
      var next = e.target.closest('[data-act="next"]');
      if (next && !next.disabled) { view.roundIdx++; view.editing = null; PadelApp.app.renderAll(); return; }

      var ed = e.target.closest('[data-act="editscore"]');
      if (ed) {
        view.editing = { round: view.roundIdx, court: parseInt(ed.getAttribute('data-court'), 10) };
        PadelApp.app.renderAll();
        return;
      }
      var ce = e.target.closest('[data-act="canceledit"]');
      if (ce) { view.editing = null; PadelApp.app.renderAll(); return; }

      var chip = e.target.closest('.chip');
      if (chip) {
        var cci = parseInt(chip.getAttribute('data-court'), 10);
        var css = chip.getAttribute('data-side');
        var cv = parseInt(chip.getAttribute('data-val'), 10);
        var tp = PadelApp.state.settings().totalPoints;
        var iA = root.querySelector('#sc-a-' + cci);
        var iB = root.querySelector('#sc-b-' + cci);
        if (iA && iB) {
          if (css === 'a') { iA.value = cv; iB.value = tp - cv; }
          else { iB.value = cv; iA.value = tp - cv; }
        }
        return;
      }

      var fin = e.target.closest('[data-act="finish"]');
      if (fin) {
        PadelApp.modal.confirm('Finish this event? Score entry and player changes will be locked, and the leaderboard will show a final summary.', 'Finish event', function (ok) {
          if (ok) { view.editing = null; PadelApp.state.finishEvent(); }
        });
        return;
      }
      var unfin = e.target.closest('[data-act="unfinish"]');
      if (unfin) {
        PadelApp.modal.confirm('Reopen this event? Score entry and player changes will be allowed again.', 'Undo finish', function (ok) {
          if (ok) PadelApp.state.unfinishEvent();
        });
        return;
      }

      var save = e.target.closest('.save');
      if (save) {
        var ci = parseInt(save.getAttribute('data-court'), 10);
        var a = parseInt(root.querySelector('#sc-a-' + ci).value, 10);
        var b = parseInt(root.querySelector('#sc-b-' + ci).value, 10);
        var editing = view.editing && view.editing.round === view.roundIdx && view.editing.court === ci;
        if (editing) {
          view.editing = null;
          var err2 = PadelApp.state.editScore(view.roundIdx, ci, a, b);
          if (err2) PadelApp.modal.alert(err2, 'Edit score');
        } else {
          if (isNaN(a) || isNaN(b)) { PadelApp.modal.alert('Enter both scores.'); return; }
          var err = validate(a, b);
          if (err) { PadelApp.modal.alert(err); return; }
          var done = PadelApp.state.recordScore(view.roundIdx, ci, a, b);
          if (done) PadelApp.modal.alert('Round complete!');
        }
        return;
      }

      var menu = e.target.closest('[data-act="menu"]');
      if (menu) {
        view.tab = 'courts'; view.roundIdx = null; view.editing = null;
        PadelApp.state.leaveEvent();
        return;
      }
      var evedit = e.target.closest('[data-act="editevent"]');
      if (evedit) { openEventEdit(); return; }

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
      var rp = e.target.closest('[data-act="renameplayer"]');
      if (rp) {
        var pid = Number(rp.getAttribute('data-id'));
        var p = pnameObj(pid);
        PadelApp.modal.prompt('Rename player', p ? p.name : '', function (value) {
          var v = (value || '').trim();
          if (v) PadelApp.state.renamePlayer(pid, v);
        });
        return;
      }
    });

    root.addEventListener('change', function (e) {
      var gsel = e.target.closest('.gsel');
      if (gsel) { PadelApp.state.setGender(Number(gsel.getAttribute('data-id')), gsel.value || null); return; }
    });

    root.addEventListener('input', function (e) {
      var inp = e.target.closest('.tscore input');
      if (!inp) return;
      var m = /^sc-(a|b)-(\d+)$/.exec(inp.id);
      if (!m) return;
      var side = m[1];
      var ci = parseInt(m[2], 10);
      var v = parseInt(inp.value, 10);
      var tp = PadelApp.state.settings().totalPoints;
      if (!isNaN(v) && v >= 0 && v <= tp) {
        var oth = root.querySelector('#sc-' + (side === 'a' ? 'b' : 'a') + '-' + ci);
        if (oth && oth !== document.activeElement) oth.value = tp - v;
      }
    });

    var ni = root.querySelector('#run-name');
    if (ni) ni.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var g2 = root.querySelector('#run-gender').value || null;
        PadelApp.state.addPlayer((ni.value || '').trim(), g2);
      }
    });

    var prioBox = root.querySelector('#prio');
    if (prioBox) {
      PadelApp.prio.bind(root, function () { return PadelApp.state.settings().scoringPriority; },
        function () { PadelApp.state.updateSettings({}); });
    }
  }

  function validate(a, b) {
    var s = PadelApp.state.settings();
    if (isNaN(a) || isNaN(b)) return 'Enter both scores.';
    if (a < 0 || a > s.totalPoints || b < 0 || b > s.totalPoints) return 'Scores must be between 0 and ' + s.totalPoints + '.';
    if (a === b) return 'Scores cannot be tied.';
    if (a + b !== s.totalPoints) return 'Scores must total exactly ' + s.totalPoints + '.';
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
