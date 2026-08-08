/* prioEditor.js — shared ranking-priority editor (Setup screen + Leaderboard tab) */
var PadelApp = window.PadelApp || {};

PadelApp.prio = (function () {
  var PRI = {
    wins: 'Wins', points: 'Points', diff: 'Points diff',
    matches: 'Matches played', opp: 'Points against', losses: 'Losses'
  };

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* render the editor rows + add-key control */
  function html(priority) {
    var rows = (priority || []).map(function (p, i) {
      return '<div class="prio-row">' +
        '<span class="prio-name">' + (PRI[p.key] || p.key) + '</span>' +
        '<span class="prio-dir">' + (p.dir === 'asc' ? 'low first' : 'high first') + '</span>' +
        '<button class="btnghost tgl" data-i="' + i + '" data-key="' + p.key + '" data-dir="' + p.dir + '">' + (p.dir === 'asc' ? '\u2191' : '\u2193') + '</button>' +
        '<button class="btnghost mv" data-i="' + i + '" data-d="' + (i - 1) + '"' + (i === 0 ? ' disabled' : '') + '>&#8593;</button>' +
        '<button class="btnghost mv" data-i="' + i + '" data-d="' + (i + 1) + '"' + (i === priority.length - 1 ? ' disabled' : '') + '>&#8595;</button>' +
        '<button class="btnghost del" data-i="' + i + '">&times;</button>' +
        '</div>';
    }).join('') +
      '<div class="prio-add">' +
      '<select id="prio-key">' + Object.keys(PRI).map(function (k) {
        var used = priority.some(function (p) { return p.key === k; });
        return '<option value="' + k + '"' + (used ? ' disabled' : '') + '>' + PRI[k] + '</option>';
      }).join('') + '</select>' +
      '<button class="btn small" data-act="addprio">Add key</button>' +
      '</div>';
    return rows;
  }

  /* bind the editor's delegated click handlers.
     getPriority() returns the live scoringPriority array; onChange() persists after edits. */
  function bind(root, getPriority, onChange) {
    root.addEventListener('click', function (e) {
      var addp = e.target.closest('[data-act="addprio"]');
      if (addp) {
        var keySel = root.querySelector('#prio-key');
        var key = keySel.value;
        var prio = getPriority();
        if (!prio.some(function (p) { return p.key === key; })) prio.push({ key: key, dir: 'desc' });
        if (onChange) onChange();
        return;
      }
      var mv = e.target.closest('.mv');
      if (mv && !mv.disabled) {
        var arr = getPriority();
        var si = parseInt(mv.getAttribute('data-i'), 10);
        var dn = parseInt(mv.getAttribute('data-d'), 10);
        if (dn >= 0 && dn < arr.length) { var t = arr[si]; arr[si] = arr[dn]; arr[dn] = t; }
        if (onChange) onChange();
        return;
      }
      var del = e.target.closest('.del');
      if (del) {
        var di = parseInt(del.getAttribute('data-i'), 10);
        getPriority().splice(di, 1);
        if (onChange) onChange();
        return;
      }
    });

    root.addEventListener('click', function (e) {
      var t = e.target.closest('.tgl');
      if (!t) return;
      var key = t.getAttribute('data-key');
      var dir = t.getAttribute('data-dir');
      var arr = getPriority();
      for (var j = 0; j < arr.length; j++) {
        if (arr[j].key === key) { arr[j].dir = dir === 'asc' ? 'desc' : 'asc'; }
      }
      if (onChange) onChange();
    });
  }

  return { PRI: PRI, html: html, bind: bind };
})();
