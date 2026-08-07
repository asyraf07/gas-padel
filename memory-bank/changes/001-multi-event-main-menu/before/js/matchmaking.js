/* matchmaking.js — pure round generation + full-schedule builder */
var PadelApp = window.PadelApp || {};

PadelApp.match = (function () {
  function isMixed(settings) {
    return settings.format === 'mixed_americano' || settings.format === 'mixed_mexicano';
  }
  function isAmericano(settings) {
    return settings.format === 'americano' || settings.format === 'mixed_americano';
  }
  function isMexican(settings) {
    return settings.format === 'mexicano' || settings.format === 'mixed_mexicano';
  }

  /* ---- partner / opponent tracker ---- */
  function Tracker() {
    this.partner = {};
    this.opponent = {};
  }
  Tracker.prototype.key = function (a, b) { return a < b ? a + '|' + b : b + '|' + a; };
  Tracker.prototype.partCount = function (a, b) { return this.partner[this.key(a, b)] || 0; };
  Tracker.prototype.oppCount = function (a, b) { return this.opponent[this.key(a, b)] || 0; };
  Tracker.prototype.incr = function (o, a, b) { o[this.key(a, b)] = (o[this.key(a, b)] || 0) + 1; };
  Tracker.prototype.noteMatch = function (teamA, teamB) {
    if (teamA.length === 2) this.incr(this.partner, teamA[0], teamA[1]);
    if (teamB.length === 2) this.incr(this.partner, teamB[0], teamB[1]);
    for (var i = 0; i < teamA.length; i++)
      for (var j = 0; j < teamB.length; j++)
        this.incr(this.opponent, teamA[i], teamB[j]);
    return this;
  };

  function computeStats(playerObjs, priorRounds, currentIndex, pointsFn) {
    var stats = new Map();
    playerObjs.forEach(function (p) {
      stats.set(p.id, { games: 0, last: -1, roundsSinceLast: 0, points: 0 });
    });
    priorRounds.forEach(function (r, ri) {
      (r.courts || []).forEach(function (c) {
        c.teamA.concat(c.teamB).forEach(function (id) {
          var s = stats.get(id);
          if (s) { s.games++; s.last = ri; }
        });
      });
    });
    playerObjs.forEach(function (p) {
      var s = stats.get(p.id);
      s.roundsSinceLast = s.last < 0 ? currentIndex + 1 : currentIndex - s.last;
      if (pointsFn) s.points = pointsFn(p.id) || 0;
    });
    return stats;
  }

  function eager(a, b, stats) {
    var sa = stats.get(a.id), sb = stats.get(b.id);
    if (sa.games !== sb.games) return sa.games - sb.games;
    return sb.roundsSinceLast - sa.roundsSinceLast;
  }

  function pickOnCourt(players, stats, capacity) {
    var sorted = players.slice().sort(function (a, b) { return eager(a, b, stats); });
    var byes = sorted.slice();
    var maxPlay = Math.floor(Math.min(sorted.length, capacity) / 4) * 4;
    var onCourt = sorted.slice(0, maxPlay);
    var byeList = sorted.slice(maxPlay);
    return { onCourt: onCourt, byes: byeList };
  }

  /* ---- americano teams, minimizing partner repeats ---- */
  function buildAmericanoTeams(onCourt, stats, tracker, mixed) {
    var unpaired = [];
    var remaining = onCourt.slice().sort(function (a, b) { return eager(a, b, stats); });
    var teams = [];
    while (remaining.length) {
      var p1 = remaining.shift();
      var bestIdx = -1, bestScore = Infinity;
      for (var i = 0; i < remaining.length; i++) {
        var q = remaining[i];
        if (mixed && q.gender === p1.gender) continue;
        var s = tracker.partCount(p1.id, q.id);
        if (s < bestScore) { bestScore = s; bestIdx = i; }
      }
      if (bestIdx < 0) { unpaired.push(p1); continue; }
      var sel = remaining[bestIdx];
      remaining.splice(bestIdx, 1);
      teams.push({ players: [p1.id, sel.id] });
    }
    return { teams: teams, unpaired: unpaired };
  }

  function opponentPenalty(tracker, teamA, teamB) {
    var t = 0;
    for (var i = 0; i < teamA.length; i++)
      for (var j = 0; j < teamB.length; j++)
        t += tracker.oppCount(teamA[i], teamB[j]);
    return t;
  }

  /* ---- pair teams into courts, minimizing repeat opponents ---- */
  function pairIntoCourts(teams, tracker) {
    var queue = teams.slice();
    var courts = [];
    var leftover = [];
    while (queue.length >= 2) {
      var teamA = queue.shift();
      var bestIdx = -1, bestScore = Infinity;
      for (var i = 0; i < queue.length; i++) {
        var s = opponentPenalty(tracker, teamA.players, queue[i].players);
        if (s < bestScore) { bestScore = s; bestIdx = i; }
      }
      var teamB = queue[bestIdx];
      queue.splice(bestIdx, 1);
      courts.push({ teamA: teamA.players.slice(), teamB: teamB.players.slice() });
    }
    if (queue.length === 1) leftover = leftover.concat(queue[0].players);
    return { courts: courts, leftover: leftover };
  }

  /* ---- mexicano: rank-based teams ---- */
  function rankTeams(players, stats, mixed) {
    var unpaired = [];
    var teams = [];
    if (mixed) {
      var ms = players.filter(function (p) { return p.gender === 'M'; }).sort(function (a, b) { return stats.get(b.id).points - stats.get(a.id).points; });
      var fs = players.filter(function (p) { return p.gender === 'F'; }).sort(function (a, b) { return stats.get(b.id).points - stats.get(a.id).points; });
      var n = Math.min(ms.length, fs.length);
      for (var i = 0; i < n; i++) teams.push({ players: [ms[i].id, fs[i].id] });
      ms.slice(n).concat(fs.slice(n)).forEach(function (p) { unpaired.push(p.id); });
    } else {
      var list = players.slice().sort(function (a, b) { return stats.get(b.id).points - stats.get(a.id).points; });
      var h = Math.floor(list.length / 2);
      for (var j = 0; j < h; j++) teams.push({ players: [list[j].id, list[j + h].id] });
    }
    teams.sort(function (a, b) { return stats.get(b.players[0]).points - stats.get(a.players[0]).points; });
    return { teams: teams, unpaired: unpaired };
  }

  /* ---- collapse a full round ---- */
  function buildRound(players, priorRounds, currentIndex, tracker, settings) {
    var pointsFn = isMexican(settings) ? function (id) { return PadelApp.score.totalPointsFor(id); } : null;
    var stats = computeStats(players, priorRounds, currentIndex, pointsFn);
    var capacity = (settings.numCourts || 1) * 4;
    var picked = pickOnCourt(players, stats, capacity);
    var byes = picked.byes.map(function (p) { return p.id; });

    if (picked.onCourt.length < 4) {
      return { courts: [], byes: byes };
    }

    var mixed = isMixed(settings);
    var teamRes;
    if (isMexican(settings)) {
      teamRes = rankTeams(picked.onCourt, stats, mixed);
    } else {
      teamRes = buildAmericanoTeams(picked.onCourt, stats, tracker, mixed);
    }
    byes = byes.concat(teamRes.unpaired);

    var courtRes = pairIntoCourts(teamRes.teams, tracker);
    byes = byes.concat(courtRes.leftover);

    var courts = courtRes.courts.map(function (c) {
      return { teamA: c.teamA, teamB: c.teamB, score: null };
    });
    courtRes.courts.forEach(function (c) { tracker.noteMatch(c.teamA, c.teamB); });

    return { courts: courts, byes: byes };
  }

  function trackerFromRounds(rounds) {
    var t = new Tracker();
    rounds.forEach(function (r) {
      if (!r.played) return;
      (r.courts || []).forEach(function (c) { t.noteMatch(c.teamA, c.teamB); });
    });
    return t;
  }

  /* ---- main entry: regenerate ALL unplayed rounds from state ---- */
  function buildUnplayed(state) {
    var settings = state.settings;
    var players = state.players.filter(function (p) { return p.active; });
    var played = state.rounds.filter(function (r) { return r.played; });
    var tracker = trackerFromRounds(played);
    var currentIndex = played.length;

    var generated = [];
    var prior = played.slice();

    if (isAmericano(settings)) {
      var target = Math.max(players.length - 1, 1);
      target = Math.min(target, 60);
      for (var r = 0; r < target; r++) {
        var round = buildRound(players, prior, currentIndex + r, tracker, settings);
        round.roundNumber = currentIndex + r + 1;
        round.played = false;
        prior.push(round);
        generated.push(round);
      }
    } else {
      var mecRound = buildRound(players, prior, currentIndex, tracker, settings);
      mecRound.roundNumber = currentIndex + 1;
      mecRound.played = false;
      generated.push(mecRound);
      prior.push(mecRound);
    }

    state.rounds = played.concat(generated);
    state.currentIndex = played.length;
    return generated.length;
  }

  return {
    buildUnplayed: buildUnplayed,
    isAmericano: isAmericano,
    isMixed: isMixed,
    isMexican: isMexican
  };
})();