/* scoring.js — leaderboard & point computation (pure, recomputed on demand) */
var PadelApp = window.PadelApp || {};

PadelApp.score = (function () {
  var stateRef = null;

  function setState(s) { stateRef = s; }

  function rounds() { return (stateRef && stateRef.rounds) || []; }
  function players() { return (stateRef && stateRef.players) || []; }

  function matchWon(pointsA, pointsB) {
    if (pointsA === null || pointsB === null) return null;
    return pointsA > pointsB ? 'A' : (pointsB > pointsA ? 'B' : 'draw');
  }

  /* total points a player scored across all played rounds */
  function totalPointsFor(pid) {
    var t = 0;
    rounds().forEach(function (r) {
      if (!r.played) return;
      (r.courts || []).forEach(function (c) {
        if (!c.score) return;
        if (c.teamA.indexOf(pid) !== -1) t += c.score[0];
        else if (c.teamB.indexOf(pid) !== -1) t += c.score[1];
      });
    });
    return t;
  }

  /* raw aggregates per player */
  function aggregates() {
    var map = {};
    players().forEach(function (p) {
      map[p.id] = { id: p.id, name: p.name, matches: 0, wins: 0, losses: 0,
                    pf: 0, pa: 0, diff: 0, streak: 0 };
    });

    /* first pass: scores via any court with a saved score, in chronological order */
    rounds().forEach(function (r) {
      (r.courts || []).forEach(function (c) {
        if (!c.score) return;
        var a = c.score[0], b = c.score[1];
        var won = matchWon(a, b);
        c.teamA.forEach(function (id) {
          var row = map[id]; if (!row) return;
          row.matches++; row.pf += a; row.pa += b;
          if (won === 'A') row.wins++; else if (won === 'B') row.losses++;
        });
        c.teamB.forEach(function (id) {
          var row = map[id]; if (!row) return;
          row.matches++; row.pf += b; row.pa += a;
          if (won === 'B') row.wins++; else if (won === 'A') row.losses++;
        });
      });
    });

    /* streak: walk courts in order for trailing wins/losses */
    var order = [];
    rounds().forEach(function (r) {
      (r.courts || []).forEach(function (c) {
        if (!c.score) return;
        var won = matchWon(c.score[0], c.score[1]);
        order.push({ c: c, won: won });
      });
    });
    for (var k = 0; k < order.length; k++) {
      var oc = order[k], owon = oc.won;
      var outcome = owon === 'draw' ? null : (owon === 'A' ? 'W' : 'L');
      [].concat(oc.c.teamA, oc.c.teamB).forEach(function (id) {
        var row = map[id]; if (!row) return;
        var playerOutcome;
        if (outcome === null) playerOutcome = null;
        else {
          var inA = oc.c.teamA.indexOf(id) !== -1;
          var ahWon = (oc.won === 'A');
          var bhWon = (oc.won === 'B');
          playerOutcome = (inA && ahWon) || (!inA && bhWon) ? 'W' : 'L';
        }
        row.streakSeq = row.streakSeq || [];
        row.streakSeq.push(playerOutcome);
      });
    }
    /* compute trailing streak */
    players().forEach(function (p) {
      var r = map[p.id];
      if (!r || !r.streakSeq) { r && (r.streak = 0); return; }
      var seq = r.streakSeq; r.streak = 0;
      for (var s = seq.length - 1; s >= 0; s--) {
        if (!seq[s]) break;
        if (r.streak === 0) { r.streak = (seq[s] === 'W' ? 1 : -1); }
        else {
          var cur = seq[s] === 'W' ? 1 : -1;
          if (cur !== Math.sign(r.streak)) break;
          r.streak = r.streak + cur;
        }
      }
      delete r.streakSeq;
    });

    players().forEach(function (p) {
      var r = map[p.id];
      if (r) r.diff = r.pf - r.pa;
    });

    var comp = (stateRef && stateRef.settings && stateRef.settings.compensation) ? 1 : 0;
    var perMatch = Math.floor(((stateRef && stateRef.settings && stateRef.settings.totalPoints) || 21) / 2);
    var maxMatches = 0;
    if (comp) {
      Object.keys(map).forEach(function (id) {
        if (map[id].matches > maxMatches) maxMatches = map[id].matches;
      });
    }
    Object.keys(map).forEach(function (id) {
      map[id].comp = comp ? (maxMatches - map[id].matches) * perMatch : 0;
    });
    return map;
  }

  function valueForKey(row, key) {
    switch (key) {
      case 'wins': return row.wins;
      case 'points': return row.pf + (row.comp || 0);
      case 'diff': return row.diff;
      case 'matches': return row.matches;
      case 'opp': return row.pa;
      case 'losses': return row.losses;
      default: return row.wins;
    }
  }

  /* sorted leaderboard rows */
  function leaderboard() {
    var priority = (stateRef && stateRef.settings.scoringPriority) ||
      [{ key: 'wins', dir: 'desc' }, { key: 'diff', dir: 'desc' }, { key: 'points', dir: 'desc' }];
    var map = aggregates();
    var rows = players().map(function (p) { return map[p.id]; }).filter(Boolean);

    function comp(a, b) {
      for (var i = 0; i < priority.length; i++) {
        var crit = priority[i];
        var va = valueForKey(a, crit.key) || 0;
        var vb = valueForKey(b, crit.key) || 0;
        if (va === vb) continue;
        return crit.dir === 'asc' ? va - vb : vb - va;
      }
      return 0;
    }
    rows.sort(comp);
    return rows.map(function (r, i) { r.rank = i + 1; return r; });
  }

  return {
    setState: setState,
    totalPointsFor: totalPointsFor,
    aggregates: aggregates,
    leaderboard: leaderboard
  };
})();