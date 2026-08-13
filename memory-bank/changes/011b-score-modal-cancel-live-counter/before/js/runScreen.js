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
  function label(s) {
    var mt = s.matchType === 'mexicano' ? 'Mexicano' : 'Americano';
    var pa = s.pairing === 'mixed' ? 'Mixed' : s.pairing === 'fixed' ? 'Fixed' : 'Normal';
    return mt + (pa === 'Normal' ? '' : ' &middot; ' + pa);
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
      '<span class="fmt">' + label(s) + ' &middot; ' + s.numCourts + ' court' + (s.numCourts > 1 ? 's' : '') + ' &middot; total points ' + s.totalPoints + '</span>' +
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

  function slotSel(globalSlot, curId, ci) {
    var ps = PadelApp.state.players();
    var active = ps.filter(function (p) { return p.active; });
    var opts = active.map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === curId ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    });
    var hasCur = active.some(function (p) { return p.id === curId; });
    if (!hasCur) {
      var cur = null;
      for (var i = 0; i < ps.length; i++) if (ps[i].id === curId) cur = ps[i];
      opts.unshift('<option value="' + curId + '" selected>' + esc(cur ? cur.name : '(removed)') + '</option>');
    }
    opts.push('<option value="__add__">+ Add player&hellip;</option>');
    return '<select class="slotpicker" data-court="' + ci + '" data-slot="' + globalSlot + '">' + opts.join('') + '</select>';
  }

  function teamSlotsHtml(c, ci, slotBase, showPickers) {
    if (!showPickers) return '<span class="team">' + teamHtml(c) + '</span>';
    var sels = c.map(function (id, idx) { return slotSel(slotBase + idx, id, ci); }).join('');
    return '<span class="team pick">' + sels + '</span>';
  }

  function courtCards(r) {
    if (!r || !r.courts.length) {
      return '<div class="muted card">Not enough active players for a full court.</div>';
    }
    var total = PadelApp.state.settings().totalPoints;
    var locked = PadelApp.state.finished();
    return r.courts.map(function (c, i) {
      var editing = view.editing && view.editing.round === view.roundIdx && view.editing.court === i;
      var showPickers = !locked && !r.played && c.score === null;
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
          '<div class="cteam"><div class="teamrow">' + teamSlotsHtml(c.teamA, i, 0, showPickers) + '</div>' +
          '<div class="tscore"><input type="number" id="sc-a-' + i + '" min="0" max="' + total + '" placeholder="0" value="' + va + '" readonly' + (locked ? ' disabled' : '') + ' data-pick="a" data-court="' + i + '" /></div>' +
          '</div>' +
          '<div class="vsline">vs</div>' +
          '<div class="cteam"><div class="teamrow">' + teamSlotsHtml(c.teamB, i, 2, showPickers) + '</div>' +
          '<div class="tscore"><input type="number" id="sc-b-' + i + '" min="0" max="' + total + '" placeholder="0" value="' + vb + '" readonly' + (locked ? ' disabled' : '') + ' data-pick="b" data-court="' + i + '" /></div>' +
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
    var regen = (!s.settings.autoRegenerate && !s.finished)
      ? '<div class="regen-row"><button class="btn" data-act="regen">Regenerate rounds</button>' +
        '<div class="hint">Auto-regeneration is off; rebuild upcoming rounds on demand.</div></div>' : '';
    return roundNav(s) + courtCards(r) + byes + regen + historyHtml(s) + endOfRound(s);
  }

  function endOfRound(s) {
    var r = s.rounds[view.roundIdx];
    if (r && !r.played && r.courts.length && r.courts.every(function (c) { return c.score !== null; })) {
      return '<div class="ok">Round complete. ' + (PadelApp.match.isMexican(s.settings) ? 'Next round generated.' : 'Next round is ready.') + '</div>';
    }
    return '';
  }

  function teamNames(ids) {
    return (ids || []).map(function (id) { return esc(pName(id)); }).join('/');
  }

  function historyHtml(s) {
    var played = s.rounds.filter(function (r) { return r.played; });
    if (!played.length) return '';
    var inner = played.map(function (r) {
      var courts = (r.courts || []).map(function (c) {
        return '<div class="hcourt">' + teamNames(c.teamA) + ' <b>' + c.score[0] + '–' + c.score[1] + '</b> ' + teamNames(c.teamB) + '</div>';
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
      '<div class="smeta">' + label(s) + ' &middot; ' + s.numCourts + ' court' + (s.numCourts > 1 ? 's' : '') +
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
    var s = PadelApp.state.settings();
    var fixed = s.pairing === 'fixed';
    var mixed = s.pairing === 'mixed';
    var ps = PadelApp.state.players();
    var rows = ps.map(function (p) {
      return '<div class="ply" data-id="' + p.id + '">' +
        gb(p.gender) +
        '<span class="pname' + (p.active ? '' : ' inactive') + '">' + esc(p.name) + (mixed && !p.gender ? ' <span class="badge">missing gender</span>' : '') + '</span>' +
        '<button class="btnghost small" data-act="renameplayer" data-id="' + p.id + '" title="Rename player"' + (finished ? ' disabled' : '') + '>&#9998;</button>' +
        (fixed ? '' : '<select class="gsel" data-id="' + p.id + '"' + (finished ? ' disabled' : '') + '>' +
          '<option value="">—</option><option value="M"' + (p.gender === 'M' ? ' selected' : '') + '>M</option>' +
          '<option value="F"' + (p.gender === 'F' ? ' selected' : '') + '>F</option></select>') +
        '<label class="chk onoff"><input type="checkbox" data-act="toggle" data-id="' + p.id + '"' + (p.active ? ' checked' : '') + (finished ? ' disabled' : '') + ' /> <span>' + (p.active ? 'on' : 'off') + '</span></label>' +
        '<button class="btnghost small" data-act="removeplayer" data-id="' + p.id + '"' + (finished ? ' disabled' : '') + '>Remove</button>' +
        '</div>';
    }).join('');
    var genderSel = fixed ? '' :
      '<select id="run-gender"' + (finished ? ' disabled' : '') + '><option value="">' + (mixed ? 'Gender *' : 'Gender') + '</option><option value="M">M</option><option value="F">F</option></select>';
    return '<div class="card"><h2>' + (fixed ? 'Teams' : 'Players') + '</h2>' +
      '<div class="form-row">' +
      '<input id="run-name" type="text" placeholder="' + (fixed ? 'Add team' : 'Add player') + '" autocomplete="off"' + (finished ? ' disabled' : '') + ' />' +
      genderSel +
      '<button class="btn" data-act="addplayer"' + (finished ? ' disabled' : '') + '>Add</button>' +
      '</div>' +
      '<label class="chk auto"><input type="checkbox" data-act="autoregen"' + (s.autoRegenerate ? ' checked' : '') + (finished ? ' disabled' : '') + ' /> <span>Auto-regenerate unplayed rounds when players change</span></label>' +
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
    function openScorePicker(ci, side) {
      var tp = PadelApp.state.settings().totalPoints;
      var opts = [];
      for (var n = 0; n <= tp; n++) opts.push(n);
      PadelApp.modal.picker('Score — court ' + (ci + 1) + ' (' + (side === 'a' ? 'Team A' : 'Team B') + ')', opts, function (v) {
        var iA = root.querySelector('#sc-a-' + ci);
        var iB = root.querySelector('#sc-b-' + ci);
        if (!iA || !iB) return;
        if (side === 'a') { iA.value = v; iB.value = tp - v; }
        else { iB.value = v; iA.value = tp - v; }
      });
    }

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

      var chip = e.target.closest('.tscore input[data-pick]');
      if (chip && !chip.disabled) {
        var cci = parseInt(chip.getAttribute('data-court'), 10);
        var css = chip.getAttribute('data-pick');
        openScorePicker(cci, css);
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
        var gEl = root.querySelector('#run-gender');
        var g = gEl ? (gEl.value || null) : null;
        if (!name) return;
        if (PadelApp.state.settings().pairing === 'mixed' && !g) { PadelApp.modal.alert('Mixed pairing requires a gender.'); return; }
        var err = PadelApp.state.addPlayer(name, g);
        if (err) { PadelApp.modal.alert(err); return; }
        return;
      }
      var rem = e.target.closest('[data-act="removeplayer"]');
      if (rem) {
        var rid = Number(rem.getAttribute('data-id'));
        var pobj = pnameObj(rid);
        PadelApp.modal.confirm('Remove ' + (pobj ? pobj.name : 'this player') + '? Unplayed rounds will be regenerated without them; played rounds keep their scores.', 'Remove player', function (ok) {
          if (ok) PadelApp.state.removePlayer(rid);
        });
        return;
      }
      var tog = e.target.closest('[data-act="toggle"]');
      if (tog) { PadelApp.state.toggleActive(Number(tog.getAttribute('data-id'))); return; }
      var rp = e.target.closest('[data-act="renameplayer"]');
      if (rp) {
        var pid = Number(rp.getAttribute('data-id'));
        var p = pnameObj(pid);
        PadelApp.modal.prompt('Rename player', p ? p.name : '', function (value) {
          var v = (value || '').trim();
          if (!v) return;
          var err2 = PadelApp.state.renamePlayer(pid, v);
          if (err2) PadelApp.modal.alert(err2);
        });
        return;
      }
      var regen = e.target.closest('[data-act="regen"]');
      if (regen) { PadelApp.state.regenerateUnplayed(); return; }
    });

    root.addEventListener('change', function (e) {
      var gsel = e.target.closest('.gsel');
      if (gsel) { PadelApp.state.setGender(Number(gsel.getAttribute('data-id')), gsel.value || null); return; }
      var ar = e.target.closest('[data-act="autoregen"]');
      if (ar) { PadelApp.state.updateSettings({ autoRegenerate: ar.checked }); return; }
      var sp = e.target.closest('.slotpicker');
      if (sp) {
        var sci = parseInt(sp.getAttribute('data-court'), 10);
        var slot = parseInt(sp.getAttribute('data-slot'), 10);
        var val = sp.value;
        if (val === '__add__') {
          var mixed = PadelApp.state.settings().pairing === 'mixed';
          var addDone = function (nm, g) {
            if (!nm) return;
            var err = PadelApp.state.addPlayer(nm, g);
            if (err) { PadelApp.modal.alert(err); return; }
            var ps = PadelApp.state.players();
            var newId = ps.length ? ps[ps.length - 1].id : null;
            if (newId == null) return;
            var err2 = PadelApp.state.swapPlayer(view.roundIdx, sci, slot, newId);
            if (err2) PadelApp.modal.alert(err2);
          };
          if (mixed) {
            PadelApp.modal.form('Add player',
              '<label class="fld">Name<input class="modal-input" id="ap-name" type="text" /></label>' +
              '<label class="fld">Gender<select class="modal-input" id="ap-gender"><option value="">—</option><option value="M">Male</option><option value="F">Female</option></select></label>',
              function (overlay) {
                var nm = (overlay.querySelector('#ap-name').value || '').trim();
                var g = overlay.querySelector('#ap-gender').value || null;
                if (!nm) return;
                if (!g) { PadelApp.modal.alert('Mixed pairing requires a gender.'); return; }
                addDone(nm, g);
              });
          } else {
            PadelApp.modal.prompt('Add player', '', function (value) {
              addDone((value || '').trim(), null);
            });
          }
          return;
        }
        var err3 = PadelApp.state.swapPlayer(view.roundIdx, sci, slot, parseInt(val, 10));
        if (err3) PadelApp.modal.alert(err3);
        return;
      }
    });

    var ni = root.querySelector('#run-name');
    if (ni) ni.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var gEl2 = root.querySelector('#run-gender');
        var g2 = gEl2 ? (gEl2.value || null) : null;
        var nm = (ni.value || '').trim();
        if (!nm) return;
        if (PadelApp.state.settings().pairing === 'mixed' && !g2) { PadelApp.modal.alert('Mixed pairing requires a gender.'); return; }
        var err = PadelApp.state.addPlayer(nm, g2);
        if (err) PadelApp.modal.alert(err);
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
