/* matchmaking.js — pure round generation + full-schedule builder */
var PadelApp = window.PadelApp || {};

PadelApp.match = (function () {
  function isMixed(settings) {
    if (settings.pairing === 'mixed') return true;
    if (settings.pairing === 'fixed') return false;
    if (settings.format) return settings.format.indexOf('mixed') === 0;
    return false;
  }
  function isAmericano(settings) {
    if (settings.matchType === 'mexicano') return false;
    if (settings.matchType === 'americano') return true;
    if (settings.format) return settings.format === 'americano' || settings.format === 'mixed_americano';
    return true;
  }
  function isMexican(settings) { return !isAmericano(settings); }
  function isFixed(settings) { return settings.pairing === 'fixed'; }

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

  function pickOnCourt(players, stats, capacity, perCourt, mixed) {
    var sorted = players.slice().sort(function (a, b) { return eager(a, b, stats); });
    var maxPlay = Math.floor(Math.min(sorted.length, capacity) / perCourt) * perCourt;
    var onCourt = sorted.slice(0, maxPlay);
    var byeList = sorted.slice(maxPlay);
    if (mixed) {
      /* keep genders balanced on court so as many mixed teams as possible can form:
         swap over-represented on-court players with off-court players of the
         other gender (fewest games first), preferring on-court players who played most */
      var slots = onCourt.length;
      var want = Math.floor(slots / 2);
      var mCount = 0, fCount = 0;
      onCourt.forEach(function (p) { if (p.gender === 'F') fCount++; else mCount++; });
      if (mCount !== fCount) {
        var over = mCount > fCount ? 'M' : 'F';
        var under = over === 'M' ? 'F' : 'M';
        var need = Math.abs(mCount - fCount) / 2;
        var offUnder = byeList.filter(function (p) { return p.gender === under; });
        if (offUnder.length >= need) {
          var oIdx = [];
          onCourt.forEach(function (p, i) { if (p.gender === over) oIdx.push(i); });
          var removeIdx = oIdx.slice(-need);
          var keep = [], newByes = [];
          onCourt.forEach(function (p, i) {
            if (removeIdx.indexOf(i) === -1) keep.push(p);
            else newByes.push(p);
          });
          var add = offUnder.slice(0, need);
          byeList = offUnder.slice(need).concat(newByes);
          onCourt = keep.concat(add);
        }
      }
    }
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
    /* 10.4.2 mixed total round: pair leftover (same-gender) players among themselves —
       "mixed pair + best available" — before forcing a bye, keeping courts full */
    if (mixed && unpaired.length > 1) {
      var leftovers = unpaired.slice().sort(function (a, b) { return eager(a, b, stats); });
      var fills = [];
      while (leftovers.length >= 2) {
        var a2 = leftovers.shift();
        var bi = 0, bs = Infinity;
        for (var j = 0; j < leftovers.length; j++) {
          var s2 = tracker.partCount(a2.id, leftovers[j].id);
          if (s2 < bs) { bs = s2; bi = j; }
        }
        var b2 = leftovers.splice(bi, 1)[0];
        fills.push({ players: [a2.id, b2.id] });
      }
      teams = teams.concat(fills);
      unpaired = leftovers;
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
      var rest = ms.slice(n).concat(fs.slice(n));
      /* 10.4.2 mixed total round: pair leftover same-gender players top-vs-bottom
         before forcing byes, keeping courts full */
      if (rest.length > 1) {
        var sorted = rest.sort(function (a, b) { return stats.get(b.id).points - stats.get(a.id).points; });
        var h = Math.floor(sorted.length / 2);
        for (var j = 0; j < h; j++) teams.push({ players: [sorted[j].id, sorted[j + h].id] });
        if (sorted.length % 2 === 1) unpaired.push(sorted[h * 2].id);
      } else {
        rest.forEach(function (p) { unpaired.push(p.id); });
      }
    } else {
      var list = players.slice().sort(function (a, b) { return stats.get(b.id).points - stats.get(a.id).points; });
      var h2 = Math.floor(list.length / 2);
      for (var k = 0; k < h2; k++) teams.push({ players: [list[k].id, list[k + h2].id] });
    }
    teams.sort(function (a, b) { return stats.get(b.players[0]).points - stats.get(a.players[0]).points; });
    return { teams: teams, unpaired: unpaired };
  }

  /* ---- fixed pairing, mexicano: each entry is a team; rank by points, top vs bottom ---- */
  function rankFixedCourts(onCourt, stats) {
    var sorted = onCourt.slice().sort(function (a, b) { return stats.get(b.id).points - stats.get(a.id).points; });
    var n = sorted.length;
    var courts = [];
    for (var i = 0; i < Math.floor(n / 2); i++) {
      courts.push({ teamA: [sorted[i].id], teamB: [sorted[n - 1 - i].id] });
    }
    var unpaired = n % 2 === 1 ? [sorted[Math.floor(n / 2)].id] : [];
    return { courts: courts, unpaired: unpaired };
  }

  /* ---- collapse a full round ---- */
  function buildRound(players, priorRounds, currentIndex, tracker, settings) {
    var pointsFn = isMexican(settings) ? function (id) { return PadelApp.score.totalPointsFor(id); } : null;
    var stats = computeStats(players, priorRounds, currentIndex, pointsFn);
    var fixed = isFixed(settings);
    var perCourt = fixed ? 2 : 4;
    var capacity = (settings.numCourts || 1) * perCourt;
    var mixed = isMixed(settings);

    if (fixed && isAmericano(settings)) {
      /* fixed americano: every entry is a full team. Round-robin over ALL teams
         (most-needy first) and keep only `numCourts` matches, so opponents never
         repeat across the schedule even when courts can't fit everyone. */
      var pool = players.slice().sort(function (a, b) { return eager(a, b, stats); });
      var fTeams = pool.map(function (p) { return { players: [p.id] }; });
      var fRes = pairIntoCourts(fTeams, tracker);
      var use = settings.numCourts || 1;
      var kept = fRes.courts.slice(0, use);
      var byes = [];
      fRes.courts.slice(use).forEach(function (c) { byes = byes.concat(c.teamA, c.teamB); });
      byes = byes.concat(fRes.leftover);
      kept.forEach(function (c) { tracker.noteMatch(c.teamA, c.teamB); });
      return {
        courts: kept.map(function (c) { return { teamA: c.teamA, teamB: c.teamB, score: null }; }),
        byes: byes
      };
    }

    var picked = pickOnCourt(players, stats, capacity, perCourt, mixed);
    var byes = picked.byes.map(function (p) { return p.id; });

    if (picked.onCourt.length < perCourt) {
      return { courts: [], byes: byes };
    }

    var courts;
    if (fixed && isMexican(settings)) {
      /* each entry is a full team; pair best-ranked vs worst-ranked */
      var fc = rankFixedCourts(picked.onCourt, stats);
      courts = fc.courts.map(function (c) {
        return { teamA: c.teamA, teamB: c.teamB, score: null };
      });
      byes = byes.concat(fc.unpaired);
      fc.courts.forEach(function (c) { tracker.noteMatch(c.teamA, c.teamB); });
    } else {
      var teamRes;
      if (isMexican(settings)) {
        teamRes = rankTeams(picked.onCourt, stats, mixed);
      } else {
        teamRes = buildAmericanoTeams(picked.onCourt, stats, tracker, mixed);
      }
      byes = byes.concat(teamRes.unpaired);

      var courtRes = pairIntoCourts(teamRes.teams, tracker);
      byes = byes.concat(courtRes.leftover);

      courts = courtRes.courts.map(function (c) {
        return { teamA: c.teamA, teamB: c.teamB, score: null };
      });
      courtRes.courts.forEach(function (c) { tracker.noteMatch(c.teamA, c.teamB); });
    }

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
    isMexican: isMexican,
    isFixed: isFixed
  };
})();