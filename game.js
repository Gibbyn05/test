// APEX MANAGER - Mobile Sports Management Game
// Single file, no imports, plain ES6

(function() {
'use strict';

// ─── GLOBAL STATE ────────────────────────────────────────────────────────────
var G = {
  screen: 'dashboard',
  club: { name: '', gold: 5000, reputation: 30, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, season: 1 },
  squad: [],
  manager: { name: '', xp: 0, level: 1, skills: { tactic: 0, development: 0, economy: 0, recruitment: 0, motivation: 0 }, skillPoints: 3 },
  season: { week: 1, fixtures: [], results: [], leagueTable: [] },
  facilities: { stadium: 1, training: 1, academy: 1 },
  match: null,
  transfers: [],
  aiTeams: []
};

var LEVEL_THRESHOLDS = [0,200,500,900,1400,2000,2700,3500,4400,5400,6500];

var POSITIONS = ['GK','CB','LB','RB','CM','LM','RM','ST','CAM'];
var PERSONALITIES = ['LEADER','EGOIST','WORKHORSE','GENIUS','HOTHEAD','ICEMAN','VETERAN','COMEBACK_KID'];
var PERSONALITY_EMOJI = { LEADER:'⚡', EGOIST:'😤', WORKHORSE:'💪', GENIUS:'🧠', HOTHEAD:'🔥', ICEMAN:'❄️', VETERAN:'🎖️', COMEBACK_KID:'💥' };

var FIRST_NAMES = ['James','Carlos','Ali','Lucas','Marco','Kevin','Diego','Luca','Omar','Ivan','Ben','Kai','Ryo','Emil','Andres','Felix','Mateo','Yusuf','Nico','Sam'];
var LAST_NAMES = ['Silva','Torres','Kane','Muller','Diaz','Costa','Rossi','Park','Ahmed','Novak','Moller','Kaya','Santos','Berg','Osei','Ferri','Cruz','Holm','Mane','Webb'];
var AI_TEAM_NAMES = ['FC Dynamo','United Rangers','City Athletic','Northern FC','Riverside','Bay Stars','Valley United'];

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function randName() { return pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES); }
function formatG(n) { return Math.floor(n) + 'G'; }

function posColor(pos) {
  if (pos === 'GK') return '#f5c842';
  if (pos === 'CB' || pos === 'LB' || pos === 'RB') return '#4a8fd4';
  if (pos === 'CM' || pos === 'LM' || pos === 'RM' || pos === 'CAM') return '#4caf50';
  return '#e74c3c';
}

function ovrColor(ovr) {
  if (ovr >= 75) return '#4caf50';
  if (ovr >= 62) return '#f39c12';
  return '#e74c3c';
}

function calcOVR(player) {
  var s = player.stats;
  var pos = player.position;
  var w;
  if (pos === 'GK')       w = { spd:0.1, sht:0.05, drb:0.05, pas:0.1, def:0.35, sta:0.1, air:0.25 };
  else if (pos === 'CB')  w = { spd:0.1, sht:0.05, drb:0.05, pas:0.1, def:0.4, sta:0.1, air:0.2 };
  else if (pos === 'LB' || pos === 'RB') w = { spd:0.2, sht:0.05, drb:0.1, pas:0.15, def:0.3, sta:0.15, air:0.05 };
  else if (pos === 'CM')  w = { spd:0.1, sht:0.1, drb:0.1, pas:0.25, def:0.2, sta:0.2, air:0.05 };
  else if (pos === 'LM' || pos === 'RM') w = { spd:0.2, sht:0.1, drb:0.2, pas:0.2, def:0.1, sta:0.15, air:0.05 };
  else if (pos === 'CAM') w = { spd:0.1, sht:0.15, drb:0.2, pas:0.25, def:0.05, sta:0.1, air:0.15 };
  else                    w = { spd:0.15, sht:0.3, drb:0.2, pas:0.1, def:0.05, sta:0.1, air:0.1 };
  var ovr = 0;
  for (var k in w) ovr += s[k] * w[k];
  return Math.round(ovr);
}

function applyPersonalityStats(player) {
  var s = player.stats;
  var p = player.personality;
  if (p === 'EGOIST')      { s.sht = clamp(s.sht + 15, 1, 99); s.pas = clamp(s.pas - 10, 1, 99); }
  if (p === 'WORKHORSE')   { s.sta = clamp(s.sta + 20, 1, 99); s.sht = clamp(s.sht - 8, 1, 99); }
  if (p === 'GENIUS')      { s.pas = clamp(s.pas + 20, 1, 99); s.spd = clamp(s.spd - 12, 1, 99); }
  if (p === 'HOTHEAD')     { s.def = clamp(s.def + 15, 1, 99); }
  player.ovr = calcOVR(player);
}

// ─── PLAYER GENERATION ───────────────────────────────────────────────────────
var playerIdCounter = 1;
function generatePlayer(position, targetOVR) {
  targetOVR = targetOVR || 62;
  var base = clamp(targetOVR - 5 + rand(0, 10), 40, 90);
  var stats = {
    spd: clamp(base + rand(-12, 12), 30, 95),
    sht: clamp(base + rand(-12, 12), 30, 95),
    drb: clamp(base + rand(-12, 12), 30, 95),
    pas: clamp(base + rand(-12, 12), 30, 95),
    def: clamp(base + rand(-12, 12), 30, 95),
    sta: clamp(base + rand(-12, 12), 30, 95),
    air: clamp(base + rand(-12, 12), 30, 95)
  };
  var personality = pick(PERSONALITIES);
  var player = {
    id: playerIdCounter++,
    name: randName(),
    age: rand(18, 35),
    position: position,
    stats: stats,
    ovr: 0,
    potential: rand(60, 99),
    personality: personality,
    moral: 75,
    condition: 100,
    injured: false,
    injuryDays: 0,
    contract: { wage: rand(10, 50), duration: rand(1, 3) },
    selected: true
  };
  applyPersonalityStats(player);
  player.ovr = calcOVR(player);
  return player;
}

function generateStartingSquad() {
  var positions = ['GK','CB','CB','LB','RB','CM','CM','LM','RM','CAM','ST','CB','CM','ST','LM','RM','LB','GK'];
  var squad = [];
  for (var i = 0; i < 18; i++) {
    var p = generatePlayer(positions[i], 62);
    if (i >= 11) p.selected = false;
    squad.push(p);
  }
  return squad;
}

// ─── LEAGUE & FIXTURES ───────────────────────────────────────────────────────
function generateAITeams(playerOVR) {
  var teams = [];
  for (var i = 0; i < 7; i++) {
    var ovr = clamp(playerOVR + rand(-15, 15), 45, 85);
    teams.push({ name: AI_TEAM_NAMES[i], ovr: ovr, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, played: 0 });
  }
  return teams;
}

function generateFixtures() {
  var opponents = G.aiTeams.slice();
  var fixtures = [];
  var home = [true, false, true, false, true, false, true, false, true, false, true, false, true, false];
  for (var i = 0; i < 7; i++) {
    fixtures.push({ opponent: opponents[i], home: home[i * 2], week: i + 1, played: false });
    fixtures.push({ opponent: opponents[i], home: home[i * 2 + 1], week: i + 8, played: false });
  }
  fixtures.sort(function(a, b) { return a.week - b.week; });
  return fixtures;
}

function buildLeagueTable() {
  var table = [{ name: G.club.name, w: G.club.wins, d: G.club.draws, l: G.club.losses, gf: G.club.goalsFor, ga: G.club.goalsAgainst, pts: G.club.wins * 3 + G.club.draws, played: G.club.wins + G.club.draws + G.club.losses }];
  for (var i = 0; i < G.aiTeams.length; i++) {
    var t = G.aiTeams[i];
    table.push({ name: t.name, w: t.w, d: t.d, l: t.l, gf: t.gf, ga: t.ga, pts: t.w * 3 + t.d, played: t.w + t.d + t.l });
  }
  table.sort(function(a, b) { return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga); });
  return table;
}

function getLeaguePosition() {
  var table = buildLeagueTable();
  for (var i = 0; i < table.length; i++) {
    if (table[i].name === G.club.name) return i + 1;
  }
  return 1;
}

// ─── TRANSFERS ────────────────────────────────────────────────────────────────
function generateTransferPlayer() {
  var pos = pick(POSITIONS);
  var targetOVR = rand(55, 80);
  var p = generatePlayer(pos, targetOVR);
  var recDiscount = 1 - G.manager.skills.recruitment * 0.1;
  p.price = Math.floor(clamp((p.ovr - 50) * 100 + rand(200, 800), 500, 5000) * recDiscount);
  return p;
}

function refreshTransfers() {
  G.transfers = [];
  for (var i = 0; i < 6; i++) G.transfers.push(generateTransferPlayer());
}

// ─── MANAGER XP ──────────────────────────────────────────────────────────────
function addXP(amount) {
  G.manager.xp += amount;
  var newLevel = 1;
  for (var i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (G.manager.xp >= LEVEL_THRESHOLDS[i]) { newLevel = i + 1; break; }
  }
  if (newLevel > G.manager.level) {
    G.manager.skillPoints += (newLevel - G.manager.level);
    G.manager.level = newLevel;
    showToast('Level Up! Now level ' + G.manager.level + '. Skill point awarded!');
  }
}

function showToast(msg) {
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 18px;border-radius:20px;z-index:9999;font-size:14px;max-width:280px;text-align:center;animation:fadeIn 0.3s;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 2500);
}

// ─── SAVE/LOAD ────────────────────────────────────────────────────────────────
function saveGame() {
  try {
    if (G.match && G.match.intervalId) {
      clearInterval(G.match.intervalId);
      G.match.intervalId = null;
    }
    localStorage.setItem('apexmanager_save', JSON.stringify(G));
    if (G.match && G.match.phase === 'playing') {
      G.match.intervalId = setInterval(matchTick, 300);
    }
  } catch(e) {}
}

function loadGame() {
  try {
    var raw = localStorage.getItem('apexmanager_save');
    if (raw) {
      var saved = JSON.parse(raw);
      if (saved && saved.club && saved.club.name) {
        G = saved;
        if (G.match) G.match.intervalId = null;
        return true;
      }
    }
  } catch(e) {}
  return false;
}

// ─── MATCH ENGINE ─────────────────────────────────────────────────────────────
function getSelectedPlayers() {
  return G.squad.filter(function(p) { return p.selected && !p.injured; }).slice(0, 11);
}

function getTeamOVR() {
  var sel = getSelectedPlayers();
  if (!sel.length) return 50;
  var total = 0;
  for (var i = 0; i < sel.length; i++) {
    var p = sel[i];
    var cond = p.personality === 'WORKHORSE' ? Math.max(p.condition, 60) : p.condition;
    total += p.ovr * (cond / 100);
  }
  return total / sel.length;
}

function startMatch(fixture) {
  if (G.match && G.match.intervalId) clearInterval(G.match.intervalId);
  var playerOVR = getTeamOVR();
  G.match = {
    fixture: fixture,
    opponent: fixture.opponent,
    home: fixture.home,
    homeScore: 0, awayScore: 0,
    time: 0,
    momentum: 0,
    possession: 50,
    yourCondition: 100,
    activeTactic: 'balanced',
    cooldowns: { press: 0, counter: 0, defensive: 0, possession: 0 },
    timeoutsLeft: 2,
    motivationUsed: false,
    halftimeDone: false,
    phase: 'playing',
    currentCM: null,
    currentMG: null,
    events: [],
    intervalId: null,
    criticalMomentTimes: generateCMTimes(),
    yourOVR: playerOVR
  };
  fixture.played = true;
  G.match.intervalId = setInterval(matchTick, 300);
  G.screen = 'match';
  renderScreen();
}

function generateCMTimes() {
  var times = [];
  var count = rand(3, 5);
  var used = {};
  while (times.length < count) {
    var t = rand(10, 85);
    if (!used[t] && t !== 45) { used[t] = true; times.push(t); }
  }
  return times.sort(function(a,b){return a-b;});
}

function matchTick() {
  var m = G.match;
  if (!m || m.phase !== 'playing') return;

  m.time++;

  // Condition drain
  var condDrain = m.activeTactic === 'press' ? 0.4 : 0.2;
  m.yourCondition = clamp(m.yourCondition - condDrain, 0, 100);

  // Momentum decay + noise
  m.momentum = clamp(m.momentum * 0.92 + rand(-2, 2), -100, 100);

  // Possession
  var tactBonusVal = { press: 1.15, counter: 1.1, balanced: 1.0, defensive: 0.85 };
  var tBonus = tactBonusVal[m.activeTactic] || 1.0;
  m.possession = clamp(50 + (m.momentum * 0.15) + (tBonus - 1) * 20, 20, 80);

  // Cooldown tick
  for (var k in m.cooldowns) { if (m.cooldowns[k] > 0) m.cooldowns[k]--; }

  // Possession tactic momentum
  if (m.activeTactic === 'possession') m.momentum = clamp(m.momentum + 1, -100, 100);

  var yourOVR = m.yourOVR * (m.yourCondition / 100);
  var momBonus = 1 + m.momentum * 0.004;
  var oppOVR = m.opponent.ovr;

  var yourAttack = yourOVR * tBonus * momBonus;
  var oppAttack = oppOVR / momBonus;

  // COMEBACK_KID check
  var losing = (m.home ? m.homeScore < m.awayScore : m.awayScore < m.homeScore);
  var winning = (m.home ? m.homeScore > m.awayScore : m.awayScore > m.homeScore);
  var hasComebackKid = G.squad.some(function(p){ return p.selected && p.personality === 'COMEBACK_KID' && !p.injured; });
  if (hasComebackKid) {
    if (losing) yourAttack *= 1.2;
    if (winning) yourAttack *= 0.95;
  }

  var hasGenius = G.squad.some(function(p){ return p.selected && p.personality === 'GENIUS' && !p.injured; });
  if (hasGenius) yourAttack *= 1.1;

  var yourChanceRate = clamp(0.03 + (yourAttack - oppAttack) * 0.0008, 0.01, 0.10);
  var oppChanceRate = clamp(0.03 + (oppAttack - yourAttack) * 0.0008, 0.01, 0.10);

  // Counter tactic
  if (m.activeTactic === 'counter' && m.possession < 45) {
    yourChanceRate *= 1.3;
  }

  // GENIUS chance bonus
  if (hasGenius) yourChanceRate = clamp(yourChanceRate + 0.01, 0.01, 0.12);

  // Check for critical moment
  if (m.criticalMomentTimes.length && m.time === m.criticalMomentTimes[0]) {
    m.criticalMomentTimes.shift();
    triggerCriticalMoment();
    return;
  }

  // Halftime
  if (m.time === 45 && !m.halftimeDone) {
    m.halftimeDone = true;
    m.phase = 'halftime';
    clearInterval(m.intervalId);
    m.intervalId = null;
    addMatchEvent(45, 'Half time!', 'info');
    renderScreen();
    return;
  }

  // Match end
  if (m.time >= 90) {
    endMatch();
    return;
  }

  // Your chance
  if (Math.random() < yourChanceRate) {
    var triggerMG = Math.random() < 0.3;
    if (triggerMG) {
      triggerMinigame('TIMING_CROSS', yourChanceRate);
      return;
    }
    if (Math.random() < 0.35) {
      scoreGoal(true);
    } else {
      addMatchEvent(m.time, 'Chance! Just wide...', 'chance');
      m.momentum = clamp(m.momentum + 5, -100, 100);
    }
  }

  // Opponent chance
  if (Math.random() < oppChanceRate) {
    if (Math.random() < 0.35) {
      scoreGoal(false);
    } else {
      addMatchEvent(m.time, m.opponent.name + ' chance - saved!', 'opp_chance');
      m.momentum = clamp(m.momentum - 5, -100, 100);
    }
  }

  updateMatchUI();
}

function scoreGoal(isPlayer) {
  var m = G.match;
  if (m.home) {
    if (isPlayer) { m.homeScore++; m.momentum = clamp(m.momentum + 20, -100, 100); }
    else { m.awayScore++; m.momentum = clamp(m.momentum - 20, -100, 100); }
  } else {
    if (isPlayer) { m.awayScore++; m.momentum = clamp(m.momentum + 20, -100, 100); }
    else { m.homeScore++; m.momentum = clamp(m.momentum - 20, -100, 100); }
  }

  var scorer = '';
  if (isPlayer) {
    var attackers = G.squad.filter(function(p){ return p.selected && (p.position === 'ST' || p.position === 'CAM' || p.position === 'LM' || p.position === 'RM') && !p.injured; });
    if (attackers.length) scorer = ' (' + pick(attackers).name + ')';

    // LEADER moral boost
    var hasLeader = G.squad.some(function(p){ return p.selected && p.personality === 'LEADER' && !p.injured; });
    if (hasLeader) {
      G.squad.forEach(function(p){ if(p.selected) p.moral = clamp(p.moral + 5, 0, 100); });
    }

    addMatchEvent(m.time, 'GOAL!' + scorer + ' ⚽', 'goal');
  } else {
    addMatchEvent(m.time, m.opponent.name + ' score! ', 'opp_goal');
  }
}

function addMatchEvent(time, text, type) {
  G.match.events.unshift({ time: time, text: text, type: type });
  if (G.match.events.length > 20) G.match.events.pop();
}

function endMatch() {
  var m = G.match;
  clearInterval(m.intervalId);
  m.intervalId = null;
  m.phase = 'ended';

  var yourScore = m.home ? m.homeScore : m.awayScore;
  var oppScore = m.home ? m.awayScore : m.homeScore;
  var opp = m.opponent;

  // Update AI team
  var result;
  if (yourScore > oppScore) {
    result = 'win';
    G.club.wins++;
    G.club.gold += Math.floor(200 * G.facilities.stadium * (1 + G.manager.skills.economy * 0.08));
    opp.l++; opp.ga += yourScore; opp.gf += oppScore;
    addXP(150);
  } else if (yourScore === oppScore) {
    result = 'draw';
    G.club.draws++;
    G.club.gold += Math.floor(80 * G.facilities.stadium * (1 + G.manager.skills.economy * 0.08));
    opp.d++; opp.ga += yourScore; opp.gf += oppScore;
    addXP(50);
  } else {
    result = 'loss';
    G.club.losses++;
    G.club.gold += Math.floor(30 * G.facilities.stadium * (1 + G.manager.skills.economy * 0.08));
    opp.w++; opp.ga += yourScore; opp.gf += oppScore;
    addXP(30);
  }

  opp.played++;
  opp.pts = opp.w * 3 + opp.d;
  G.club.goalsFor += yourScore;
  G.club.goalsAgainst += oppScore;
  G.club.reputation = clamp(G.club.reputation + (result === 'win' ? 3 : result === 'draw' ? 1 : -2), 0, 100);

  G.season.results.push({ opponent: opp.name, yourScore: yourScore, oppScore: oppScore, result: result });

  // Player condition recovery and training boost
  var trainingBoost = [0, 0.3, 0.6, 1.0, 1.5, 2.2][G.facilities.training] || 0;
  G.squad.forEach(function(p) {
    p.condition = clamp(p.condition + 15, 0, 100);
    if (p.personality === 'WORKHORSE') p.condition = Math.max(p.condition, 60);
    // Training OVR boost
    var devBonus = 1 + G.manager.skills.development * 0.05;
    var growthChance = (trainingBoost / 100) * devBonus;
    if (Math.random() < growthChance && p.ovr < p.potential) {
      for (var stat in p.stats) {
        if (Math.random() < 0.3) p.stats[stat] = clamp(p.stats[stat] + 1, 1, 99);
      }
      p.ovr = calcOVR(p);
    }
  });

  // Advance week
  G.season.week++;
  if (G.season.week > 10) {
    G.season.week = 1;
    G.club.season++;
    refreshTransfers();
  }

  // Pay wages
  var wages = G.squad.reduce(function(s, p){ return s + p.contract.wage; }, 0);
  G.club.gold = Math.max(0, G.club.gold - wages);

  saveGame();
  addMatchEvent(90, 'Full Time! ' + (m.home ? G.club.name : m.opponent.name) + ' ' + m.homeScore + ' - ' + m.awayScore + ' ' + (m.home ? m.opponent.name : G.club.name), 'fulltime');
  renderScreen();
}

// ─── CRITICAL MOMENTS ─────────────────────────────────────────────────────────
var CM_TYPES = ['INJURY','RED_CARD_RISK','MOMENTUM_SHIFT','KEY_PLAYER_DOWN','CROWD_SURGE'];

function triggerCriticalMoment() {
  var m = G.match;
  clearInterval(m.intervalId);
  m.intervalId = null;
  m.phase = 'critical_moment';

  var type = pick(CM_TYPES);
  var sel = getSelectedPlayers();
  var player = sel.length ? pick(sel) : null;

  var cm = { type: type, player: player };
  switch(type) {
    case 'INJURY':
      cm.title = 'Injury Alert!';
      cm.desc = (player ? player.name : 'A player') + ' is hurt! Sub or play on?';
      cm.opt1 = { text: '🔄 Substitute (safe)', fn: function() {
        if (player) { player.injured = true; player.injuryDays = rand(5, 15); player.selected = false; addXP(25); }
        m.momentum = clamp(m.momentum - 5, -100, 100);
        resumeMatch();
      }};
      cm.opt2 = { text: '💪 Play on (risky)', fn: function() {
        if (player && Math.random() < 0.5) {
          player.injured = true; player.injuryDays = rand(10, 25);
          addMatchEvent(m.time, player.name + ' worsens the injury!', 'bad');
        } else {
          m.momentum = clamp(m.momentum + 8, -100, 100);
          addMatchEvent(m.time, 'Played through the pain!', 'good');
        }
        resumeMatch();
      }};
      break;
    case 'RED_CARD_RISK':
      cm.title = 'Referee Warning!';
      cm.desc = 'Aggressive tackle by ' + (player ? player.name : 'your player') + '! How do you react?';
      cm.opt1 = { text: '✋ Accept booking', fn: function() {
        addMatchEvent(m.time, 'Yellow card shown. Fair enough.', 'warn');
        if (player && player.personality === 'HOTHEAD' && Math.random() < 0.3) {
          addMatchEvent(m.time, player.name + ' gets a second yellow!', 'bad');
          player.selected = false;
          m.momentum = clamp(m.momentum - 20, -100, 100);
        }
        addXP(25);
        resumeMatch();
      }};
      cm.opt2 = { text: '😡 Protest decision', fn: function() {
        if (Math.random() < 0.4) {
          addMatchEvent(m.time, 'Protest backfires! Red card!', 'bad');
          if (player) player.selected = false;
          m.momentum = clamp(m.momentum - 25, -100, 100);
        } else {
          addMatchEvent(m.time, 'Referee backs down! No card!', 'good');
          m.momentum = clamp(m.momentum + 5, -100, 100);
        }
        resumeMatch();
      }};
      break;
    case 'MOMENTUM_SHIFT':
      cm.title = 'Momentum Swing!';
      cm.desc = 'Opposition pushing hard! What is your call?';
      cm.opt1 = { text: '⚡ Counter now!', fn: function() {
        if (Math.random() < 0.55) { scoreGoal(true); addXP(25); }
        else { addMatchEvent(m.time, 'Counter failed, exposed at back!', 'bad'); m.momentum = clamp(m.momentum - 15, -100, 100); }
        resumeMatch();
      }};
      cm.opt2 = { text: '🛡 Hold the line', fn: function() {
        m.momentum = clamp(m.momentum + 10, -100, 100);
        addMatchEvent(m.time, 'Solid defensive shape restored.', 'good');
        resumeMatch();
      }};
      break;
    case 'KEY_PLAYER_DOWN':
      cm.title = 'Star Struggling!';
      cm.desc = (player ? player.name : 'Your star') + ' looks exhausted. Trust or sub?';
      cm.opt1 = { text: '🔄 Sub early', fn: function() {
        if (player) { player.selected = false; player.condition = clamp(player.condition + 20, 0, 100); }
        addMatchEvent(m.time, 'Fresh legs on the pitch!', 'good');
        addXP(25);
        resumeMatch();
      }};
      cm.opt2 = { text: '💫 Trust them', fn: function() {
        if (player && Math.random() < 0.45) {
          addMatchEvent(m.time, player.name + ' delivers the magic moment!', 'goal');
          scoreGoal(true);
        } else {
          addMatchEvent(m.time, player.name + ' fades out completely.', 'bad');
          m.momentum = clamp(m.momentum - 10, -100, 100);
        }
        resumeMatch();
      }};
      break;
    case 'CROWD_SURGE':
      cm.title = 'Crowd Erupting!';
      cm.desc = 'The fans are going wild! Ride the wave?';
      cm.opt1 = { text: '⚔️ Attack wave!', fn: function() {
        m.momentum = clamp(m.momentum + 25, -100, 100);
        if (Math.random() < 0.4) scoreGoal(true);
        addXP(25);
        resumeMatch();
      }};
      cm.opt2 = { text: '🔒 Secure result', fn: function() {
        m.momentum = clamp(m.momentum + 5, -100, 100);
        addMatchEvent(m.time, 'Disciplined approach. Holding on.', 'info');
        resumeMatch();
      }};
      break;
  }

  m.currentCM = cm;
  renderScreen();
}

function resumeMatch() {
  var m = G.match;
  m.phase = 'playing';
  m.currentCM = null;
  m.currentMG = null;
  if (m.time < 90) {
    m.intervalId = setInterval(matchTick, 300);
  } else {
    endMatch();
  }
  renderScreen();
}

// ─── MINI-GAMES ───────────────────────────────────────────────────────────────
function triggerMinigame(type, baseRate) {
  var m = G.match;
  clearInterval(m.intervalId);
  m.intervalId = null;
  m.phase = 'minigame';
  m.currentMG = { type: type, baseRate: baseRate, done: false };
  renderScreen();
  setTimeout(function() { initMinigame(type, baseRate); }, 100);
}

function initMinigame(type, baseRate) {
  var canvas = document.getElementById('mg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  if (type === 'TIMING_CROSS') {
    initTimingCross(canvas, ctx, baseRate);
  } else if (type === 'PENALTY') {
    initPenalty(canvas, ctx, baseRate);
  } else if (type === 'REACTION_BLOCK') {
    initReactionBlock(canvas, ctx, baseRate);
  }
}

function initTimingCross(canvas, ctx, baseRate) {
  canvas.width = 300; canvas.height = 100;
  var barX = 0;
  var dir = 1;
  var speed = 3;
  var sel = getSelectedPlayers();
  var avgPas = 50;
  if (sel.length) {
    var total = 0;
    sel.forEach(function(p){ total += p.stats.pas; });
    avgPas = total / sel.length;
  }
  var zoneW = clamp(40 + avgPas * 0.4, 30, 100);
  var zoneX = (300 - zoneW) / 2;
  var active = true;
  var timeLimit = 3000;
  var startTime = Date.now();

  var countdown = document.getElementById('mg-countdown');
  var timerInterval = setInterval(function() {
    var elapsed = Date.now() - startTime;
    var remaining = Math.max(0, timeLimit - elapsed) / 1000;
    if (countdown) countdown.textContent = remaining.toFixed(1) + 's';
    if (elapsed >= timeLimit && active) {
      active = false;
      clearInterval(timerInterval);
      cancelAnimationFrame(rafId);
      finishMinigame('miss', 0.5, baseRate);
    }
  }, 100);

  var rafId;
  function draw() {
    ctx.clearRect(0, 0, 300, 100);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 300, 100);

    // Zone
    ctx.fillStyle = 'rgba(76,175,80,0.4)';
    ctx.fillRect(zoneX, 20, zoneW, 60);
    ctx.fillStyle = '#4caf50';
    ctx.strokeRect(zoneX, 20, zoneW, 60);

    // Moving bar
    ctx.fillStyle = '#fff';
    ctx.fillRect(barX, 10, 8, 80);

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '12px sans-serif';
    ctx.fillText('TAP when bar is in green zone!', 10, 95);

    barX += speed * dir;
    if (barX >= 292 || barX <= 0) dir *= -1;

    if (active) rafId = requestAnimationFrame(draw);
  }
  draw();

  canvas.onclick = function() {
    if (!active) return;
    active = false;
    clearInterval(timerInterval);
    cancelAnimationFrame(rafId);
    var inZone = barX >= zoneX && barX <= zoneX + zoneW;
    var perfect = barX >= zoneX + zoneW * 0.35 && barX <= zoneX + zoneW * 0.65;
    if (perfect) {
      finishMinigame('perfect', 2.0, baseRate);
    } else if (inZone) {
      finishMinigame('good', 1.4, baseRate);
    } else {
      finishMinigame('miss', 0.5, baseRate);
    }
  };
}

function initPenalty(canvas, ctx, baseRate) {
  canvas.width = 300; canvas.height = 200;
  var cx = 150, cy = 100;
  var crossX = cx, crossY = cy;
  var angle = 0;
  var active = true;
  var startTime = Date.now();
  var timeLimit = 3000;

  var timerInterval = setInterval(function() {
    var elapsed = Date.now() - startTime;
    var remaining = Math.max(0, timeLimit - elapsed) / 1000;
    var cd = document.getElementById('mg-countdown');
    if (cd) cd.textContent = remaining.toFixed(1) + 's';
    if (elapsed >= timeLimit && active) {
      active = false;
      clearInterval(timerInterval);
      cancelAnimationFrame(rafId);
      finishMinigame('miss', 0.35, baseRate);
    }
  }, 100);

  var rafId;
  function draw() {
    ctx.clearRect(0, 0, 300, 200);
    ctx.fillStyle = '#2d5a1b';
    ctx.fillRect(0, 0, 300, 200);

    // Goal
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 40, 180, 100);

    // Zones
    var zones = [
      {x:60,y:40,w:60,h:100,q:'left'},
      {x:120,y:40,w:60,h:100,q:'center'},
      {x:180,y:40,w:60,h:100,q:'right'}
    ];
    zones.forEach(function(z) {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(z.x, z.y, z.w, z.h);
    });

    // Moving crosshair
    angle += 0.04;
    crossX = 150 + Math.sin(angle * 1.3) * 70;
    crossY = 90 + Math.sin(angle) * 35;
    crossX = clamp(crossX, 70, 230);
    crossY = clamp(crossY, 50, 130);

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(crossX - 12, crossY); ctx.lineTo(crossX + 12, crossY);
    ctx.moveTo(crossX, crossY - 12); ctx.lineTo(crossX, crossY + 12);
    ctx.stroke();

    // Shrinking timer ring
    var elapsed = Date.now() - startTime;
    var frac = 1 - elapsed / timeLimit;
    ctx.strokeStyle = frac > 0.5 ? '#4caf50' : '#f39c12';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(crossX, crossY, 20, -Math.PI/2, -Math.PI/2 + frac * Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.fillText('TAP to shoot!', 105, 185);

    if (active) rafId = requestAnimationFrame(draw);
  }
  draw();

  canvas.onclick = function(e) {
    if (!active) return;
    active = false;
    clearInterval(timerInterval);
    cancelAnimationFrame(rafId);

    var cx_zone = crossX;
    var isCenter = cx_zone >= 120 && cx_zone <= 180;
    var isCorner = cx_zone < 80 || cx_zone > 220 || crossY < 60 || crossY > 120;
    var iceman = G.squad.some(function(p){ return p.selected && p.personality === 'ICEMAN' && !p.injured; });
    var bonus = iceman ? 0.25 : 0;

    var successRate;
    if (isCenter) successRate = 0.90 + bonus;
    else if (!isCorner) successRate = 0.65 + bonus;
    else successRate = 0.35 + bonus;

    if (Math.random() < successRate) finishMinigame('perfect', 2.0, baseRate);
    else finishMinigame('miss', 0, baseRate);
  };
}

function initReactionBlock(canvas, ctx, baseRate) {
  canvas.width = 300; canvas.height = 200;
  var positions = [
    {x:30,y:80}, {x:90,y:80}, {x:150,y:80}, {x:210,y:80}, {x:270,y:80}
  ];
  var target = rand(0, 4);
  var lit = false;
  var done = false;
  var startTime;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 300, 200);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText('Get ready...', 110, 100);

  setTimeout(function() {
    if (done) return;
    lit = true;
    startTime = Date.now();
    var timeout = setTimeout(function() {
      if (!done) {
        done = true;
        finishMinigame('miss', 0.5, baseRate);
        addMatchEvent(G.match.time, 'Too slow! Opposition breaks through!', 'bad');
      }
    }, 800);

    function drawReaction() {
      ctx.clearRect(0, 0, 300, 200);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 300, 200);
      ctx.fillStyle = '#fff';
      ctx.font = '13px sans-serif';
      ctx.fillText('TAP the lit position!', 85, 30);

      positions.forEach(function(p, i) {
        ctx.fillStyle = i === target ? '#ffeb3b' : '#444';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(i + 1, p.x - 5, p.y + 6);
      });
      if (lit && !done) requestAnimationFrame(drawReaction);
    }
    drawReaction();

    canvas.onclick = function(e) {
      if (!done) {
        done = true;
        clearTimeout(timeout);
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        var hit = -1;
        positions.forEach(function(p, i) {
          var dx = mx - p.x, dy = my - p.y;
          if (Math.sqrt(dx*dx + dy*dy) < 30) hit = i;
        });
        if (hit === target) {
          G.match.momentum = clamp(G.match.momentum + 10, -100, 100);
          finishMinigame('perfect', 1.5, baseRate);
          addMatchEvent(G.match.time, 'Great block! Interception!', 'good');
        } else {
          finishMinigame('miss', 0.5, baseRate);
          addMatchEvent(G.match.time, 'Wrong position! They break!', 'bad');
        }
      }
    };
  }, 1000);
}

function finishMinigame(quality, multiplier, baseRate) {
  var m = G.match;
  m.currentMG = null;
  if (quality === 'perfect') {
    addXP(20);
    if (Math.random() < baseRate * multiplier) scoreGoal(true);
    else { addMatchEvent(m.time, 'Great skill! Shot just over!', 'chance'); m.momentum = clamp(m.momentum + 8, -100, 100); }
  } else if (quality === 'good') {
    if (Math.random() < baseRate * multiplier) scoreGoal(true);
    else addMatchEvent(m.time, 'Good effort, keeper saves!', 'chance');
  } else {
    addMatchEvent(m.time, 'Chance wasted!', 'bad');
  }
  resumeMatch();
}

// ─── RENDERING ────────────────────────────────────────────────────────────────
function renderScreen() {
  var app = document.getElementById('app');
  if (!app) return;

  var html = renderHeader();
  switch(G.screen) {
    case 'dashboard':  html += renderDashboard(); break;
    case 'squad':      html += renderSquad(); break;
    case 'match':      html += renderMatch(); break;
    case 'league':     html += renderLeague(); break;
    case 'facilities': html += renderFacilities(); break;
    case 'transfers':  html += renderTransfers(); break;
  }
  html += renderNav();
  app.innerHTML = html;
  attachEventListeners();
}

function renderHeader() {
  var m = G.match;
  var liveScore = '';
  if (m && m.phase !== 'ended') {
    var hn = m.home ? G.club.name : m.opponent.name;
    var an = m.home ? m.opponent.name : G.club.name;
    liveScore = '<span class="live-score">' + hn + ' <b>' + m.homeScore + '-' + m.awayScore + '</b> ' + an + ' <span class="live-dot">●</span></span>';
  }
  return '<div class="header">' +
    '<div class="header-top"><span class="club-name">' + G.club.name + '</span>' +
    '<span class="gold-display">💰' + formatG(G.club.gold) + '</span></div>' +
    (liveScore ? '<div class="live-bar">' + liveScore + '</div>' : '') +
    '</div>';
}

function renderNav() {
  var tabs = [
    { id: 'dashboard', icon: '🏠', label: 'Home' },
    { id: 'squad', icon: '👥', label: 'Squad' },
    { id: 'match', icon: '⚽', label: 'Match' },
    { id: 'league', icon: '🏆', label: 'League' },
    { id: 'facilities', icon: '🏟️', label: 'Club' },
    { id: 'transfers', icon: '🔄', label: 'Transfer' }
  ];
  var pendingMatch = G.season.fixtures.some(function(f){ return !f.played; });
  var html = '<nav class="bottom-nav">';
  tabs.forEach(function(t) {
    var active = G.screen === t.id ? ' active' : '';
    var dot = (t.id === 'match' && pendingMatch && G.screen !== 'match') ? '<span class="red-dot"></span>' : '';
    html += '<button class="nav-btn' + active + '" data-screen="' + t.id + '">' + t.icon + dot + '<br><small>' + t.label + '</small></button>';
  });
  html += '</nav>';
  return html;
}

function renderDashboard() {
  var xpCurrent = G.manager.xp - (LEVEL_THRESHOLDS[G.manager.level - 1] || 0);
  var xpNeeded = (LEVEL_THRESHOLDS[G.manager.level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length-1]) - (LEVEL_THRESHOLDS[G.manager.level - 1] || 0);
  var xpPct = Math.min(100, Math.round(xpCurrent / xpNeeded * 100));

  var pos = getLeaguePosition();
  var nextFixture = G.season.fixtures.find(function(f){ return !f.played; });
  var recentResults = G.season.results.slice(-3).reverse();

  var html = '<div class="screen dashboard">';
  html += '<div class="rep-bar-wrap"><div class="rep-label">Reputation</div><div class="rep-bar"><div class="rep-fill" style="width:' + G.club.reputation + '%"></div></div></div>';

  html += '<div class="manager-card">';
  html += '<div class="manager-info"><b>' + G.manager.name + '</b> &nbsp; Lv.' + G.manager.level + ' Manager</div>';
  html += '<div class="xp-bar-wrap"><div class="xp-bar"><div class="xp-fill" style="width:' + xpPct + '%"></div></div>';
  html += '<span class="xp-label">' + xpCurrent + '/' + xpNeeded + ' XP</span></div>';
  if (G.manager.skillPoints > 0) {
    html += '<button class="btn-skill-up" onclick="openSkillTree()">🌟 ' + G.manager.skillPoints + ' Skill Point(s) Available!</button>';
  }
  html += '</div>';

  if (nextFixture) {
    var diff = Math.round((nextFixture.opponent.ovr - getTeamOVR()) / 5);
    var stars = '';
    for (var i = 0; i < 5; i++) stars += (i < clamp(3 + diff, 1, 5)) ? '★' : '☆';
    html += '<div class="match-card">';
    html += '<div class="match-card-title">Next Match</div>';
    html += '<div class="match-teams">' + (nextFixture.home ? '🏠 ' : '✈️ ') + G.club.name + ' vs ' + nextFixture.opponent.name + '</div>';
    html += '<div class="match-diff">Difficulty: <span class="stars">' + stars + '</span> (OVR ' + Math.round(nextFixture.opponent.ovr) + ')</div>';
    html += '<button class="btn-start-match" onclick="onStartMatch()">▶ START MATCH</button>';
    html += '</div>';
  } else {
    html += '<div class="match-card"><div class="match-card-title">Season Complete!</div><p>All fixtures played. Check the league table.</p></div>';
  }

  html += '<div class="quick-stats">';
  html += '<div class="stat-box"><div class="stat-val green">' + G.club.wins + '</div><div class="stat-lbl">Wins</div></div>';
  html += '<div class="stat-box"><div class="stat-val yellow">' + G.club.draws + '</div><div class="stat-lbl">Draws</div></div>';
  html += '<div class="stat-box"><div class="stat-val red">' + G.club.losses + '</div><div class="stat-lbl">Losses</div></div>';
  html += '<div class="stat-box"><div class="stat-val">' + pos + (pos===1?'st':pos===2?'nd':pos===3?'rd':'th') + '</div><div class="stat-lbl">Position</div></div>';
  html += '</div>';

  if (recentResults.length) {
    html += '<div class="section-title">Recent Results</div><div class="results-list">';
    recentResults.forEach(function(r) {
      var cls = r.result === 'win' ? 'green' : r.result === 'draw' ? 'yellow' : 'red';
      html += '<div class="result-row"><span class="result-badge ' + cls + '">' + r.result.toUpperCase()[0] + '</span>';
      html += ' vs ' + r.opponent + ' <b>' + r.yourScore + '-' + r.oppScore + '</b></div>';
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function renderSquad() {
  var html = '<div class="screen squad"><div class="section-title">Squad (' + G.squad.length + ' players)</div>';
  html += '<div class="player-grid">';
  G.squad.forEach(function(p) {
    var pcol = posColor(p.position);
    var ocol = ovrColor(p.ovr);
    var injBadge = p.injured ? '<span class="inj-badge">🚑 ' + p.injuryDays + 'd</span>' : '';
    var selBadge = p.selected ? '<span class="sel-badge">✓</span>' : '';
    html += '<div class="player-card" onclick="openPlayerModal(' + p.id + ')">';
    html += '<div class="player-card-top">';
    html += '<span class="pos-badge" style="background:' + pcol + '">' + p.position + '</span>';
    html += '<span class="ovr-circle" style="background:' + ocol + '">' + p.ovr + '</span>';
    html += selBadge + injBadge;
    html += '</div>';
    html += '<div class="player-name">' + p.name + '</div>';
    html += '<div class="player-meta">' + PERSONALITY_EMOJI[p.personality] + ' ' + p.personality + ' | Age ' + p.age + '</div>';
    html += '<div class="mini-bar-wrap"><span>CON</span><div class="mini-bar"><div class="mini-fill" style="width:' + p.condition + '%;background:#4caf50"></div></div></div>';
    html += '<div class="mini-bar-wrap"><span>MOR</span><div class="mini-bar"><div class="mini-fill" style="width:' + p.moral + '%;background:#2196f3"></div></div></div>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function renderMatch() {
  var m = G.match;
  if (!m) {
    return '<div class="screen match"><div class="no-match"><p>No active match.</p><p>Start a match from the dashboard.</p></div></div>';
  }

  if (m.phase === 'minigame') {
    return renderMinigame();
  }

  if (m.phase === 'critical_moment' && m.currentCM) {
    return renderCriticalMoment();
  }

  var hn = m.home ? G.club.name : m.opponent.name;
  var an = m.home ? m.opponent.name : G.club.name;
  var momPct = (m.momentum + 100) / 2;
  var momColor = m.momentum > 0 ? '#4caf50' : m.momentum < 0 ? '#e74c3c' : '#888';

  var html = '<div class="screen match-screen">';
  html += '<div class="match-header">';
  html += '<div class="match-score-teams"><span class="team-name-sm">' + hn + '</span></div>';
  html += '<div class="score-display">' + m.homeScore + ' <span class="score-dash">–</span> ' + m.awayScore + '</div>';
  html += '<div class="match-score-teams"><span class="team-name-sm">' + an + '</span></div>';
  html += '</div>';

  html += '<div class="match-info-row">';
  html += '<span class="match-time">' + m.time + '\'</span>';
  html += '<span class="poss-label">Poss: ' + Math.round(m.possession) + '%</span>';
  html += '<span class="cond-label">Con: ' + Math.round(m.yourCondition) + '%</span>';
  html += '</div>';

  html += '<div class="mom-wrap"><div class="mom-label">Momentum</div>';
  html += '<div class="mom-bar"><div class="mom-center"></div><div class="mom-fill" style="left:' + (m.momentum >= 0 ? '50%' : (momPct)+'%') + ';width:' + Math.abs(m.momentum/2) + '%;background:' + momColor + '"></div></div>';
  html += '<div class="mom-val">' + (m.momentum > 0 ? '+' : '') + Math.round(m.momentum) + '</div></div>';

  // Tactic buttons
  var tactCD = {
    press: { label: '🔥 Press', key: 'press', cd: 15 },
    counter: { label: '⚡ Counter', key: 'counter', cd: 12 },
    defensive: { label: '🛡 Block', key: 'defensive', cd: 10 },
    possession: { label: '🎯 Posses.', key: 'possession', cd: 8 }
  };
  var tactCDReduction = 1 - G.manager.skills.tactic * 0.1;

  html += '<div class="tactic-row">';
  for (var tKey in tactCD) {
    var td = tactCD[tKey];
    var cdLeft = m.cooldowns[td.key] || 0;
    var isActive = m.activeTactic === td.key;
    var disabled = cdLeft > 0 ? 'disabled' : '';
    html += '<button class="tact-btn' + (isActive ? ' active-tact' : '') + '" onclick="setTactic(\'' + td.key + '\')" ' + disabled + '>';
    html += td.label;
    if (cdLeft > 0) html += '<br><small>' + cdLeft + '</small>';
    html += '</button>';
  }
  html += '</div>';

  html += '<div class="action-row">';
  html += '<button class="btn-timeout" onclick="useTimeout()" ' + (m.timeoutsLeft <= 0 || m.phase === 'ended' ? 'disabled' : '') + '>⏸ Timeout (' + m.timeoutsLeft + ')</button>';
  if (!m.motivationUsed && m.phase !== 'ended') {
    html += '<button class="btn-motivate" onclick="useMotivation()">📣 Motivate</button>';
  }
  if (m.phase === 'halftime') {
    html += '<button class="btn-resume-half" onclick="resumeHalftime()">▶ Resume Match</button>';
  }
  if (m.phase === 'ended') {
    html += '<button class="btn-end-match" onclick="endMatchReturn()">🏁 View Results</button>';
  }
  html += '</div>';

  // Events feed
  html += '<div class="events-feed">';
  var eventsToShow = m.events.slice(0, 7);
  eventsToShow.forEach(function(ev) {
    var cls = ev.type === 'goal' ? 'ev-goal' : ev.type === 'opp_goal' ? 'ev-opp-goal' : ev.type === 'bad' ? 'ev-bad' : ev.type === 'good' ? 'ev-good' : 'ev-info';
    html += '<div class="event-row ' + cls + '"><span class="ev-time">' + ev.time + '\'</span> ' + ev.text + '</div>';
  });
  html += '</div>';

  html += '</div>';
  return html;
}

function renderCriticalMoment() {
  var m = G.match;
  var cm = m.currentCM;
  var html = '<div class="screen match-screen">';
  html += '<div class="cm-overlay">';
  html += '<div class="cm-card">';
  html += '<div class="cm-icon">⚡</div>';
  html += '<div class="cm-title">' + cm.title + '</div>';
  html += '<div class="cm-desc">' + cm.desc + '</div>';
  html += '<button class="cm-btn cm-btn1" onclick="onCMChoice(1)">' + cm.opt1.text + '</button>';
  html += '<button class="cm-btn cm-btn2" onclick="onCMChoice(2)">' + cm.opt2.text + '</button>';
  html += '</div></div></div>';
  return html;
}

function renderMinigame() {
  var m = G.match;
  var mg = m.currentMG;
  var titles = { TIMING_CROSS: '🎯 Crossing Challenge!', PENALTY: '⚽ Penalty Shootout!', REACTION_BLOCK: '🧤 Reaction Block!' };
  var descs = { TIMING_CROSS: 'Time your cross perfectly!', PENALTY: 'Aim your shot!', REACTION_BLOCK: 'Block the attack!' };
  var html = '<div class="screen match-screen">';
  html += '<div class="mg-overlay">';
  html += '<div class="mg-card">';
  html += '<div class="mg-title">' + (titles[mg.type] || 'Mini Game') + '</div>';
  html += '<div class="mg-desc">' + (descs[mg.type] || '') + '</div>';
  html += '<canvas id="mg-canvas" class="mg-canvas"></canvas>';
  html += '<div id="mg-countdown" class="mg-countdown">3.0s</div>';
  html += '</div></div></div>';
  return html;
}

function renderLeague() {
  var table = buildLeagueTable();
  var html = '<div class="screen league"><div class="section-title">League Table</div>';
  html += '<table class="league-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>';
  table.forEach(function(t, i) {
    var isYou = t.name === G.club.name;
    var gd = t.gf - t.ga;
    html += '<tr class="' + (isYou ? 'your-team' : '') + '">';
    html += '<td>' + (i+1) + '</td><td class="team-name-cell">' + t.name + (isYou ? ' ★' : '') + '</td>';
    html += '<td>' + t.played + '</td><td>' + t.w + '</td><td>' + t.d + '</td><td>' + t.l + '</td>';
    html += '<td>' + (gd >= 0 ? '+' : '') + gd + '</td><td><b>' + t.pts + '</b></td>';
    html += '</tr>';
  });
  html += '</tbody></table>';

  var upcoming = G.season.fixtures.filter(function(f){ return !f.played; }).slice(0, 4);
  if (upcoming.length) {
    html += '<div class="section-title">Upcoming Fixtures</div><div class="fixtures-list">';
    upcoming.forEach(function(f) {
      html += '<div class="fixture-row">';
      html += (f.home ? '🏠 ' : '✈️ ') + G.club.name + ' vs <b>' + f.opponent.name + '</b>';
      html += ' (Wk ' + f.week + ')';
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderFacilities() {
  var facilityData = [
    {
      key: 'stadium', name: '🏟️ Stadium', icon: '🏟️',
      costs: [250, 500, 1000, 2000, 4000],
      benefits: ['Win: 200G', 'Win: 400G', 'Win: 700G', 'Win: 1200G', 'Win: 2000G'],
      desc: 'Increases match income'
    },
    {
      key: 'training', name: '⚽ Training Ground', icon: '⚽',
      costs: [300, 600, 1200, 2400, 5000],
      benefits: ['OVR +0.3/wk', 'OVR +0.6/wk', 'OVR +1.0/wk', 'OVR +1.5/wk', 'OVR +2.2/wk'],
      desc: 'Boosts player development'
    },
    {
      key: 'academy', name: '🎓 Academy', icon: '🎓',
      costs: [500, 1000, 2000, 4000, 8000],
      benefits: ['2 youth/season', '3 youth/season', '5 youth/season', '7 youth/season', '10 youth/season'],
      desc: 'Generates youth players'
    }
  ];

  var html = '<div class="screen facilities"><div class="section-title">Facilities</div>';
  facilityData.forEach(function(f) {
    var level = G.facilities[f.key];
    var maxed = level >= 5;
    var cost = maxed ? 0 : f.costs[level - 1];
    var canAfford = G.club.gold >= cost;
    html += '<div class="facility-card">';
    html += '<div class="fac-header"><span class="fac-icon">' + f.icon + '</span><span class="fac-name">' + f.name + '</span></div>';
    html += '<div class="fac-level">Level ' + level + '/5 ' + '★'.repeat(level) + '☆'.repeat(5-level) + '</div>';
    html += '<div class="fac-benefit">Current: ' + f.benefits[level - 1] + '</div>';
    html += '<div class="fac-desc">' + f.desc + '</div>';
    if (!maxed) {
      html += '<div class="fac-next">Next: ' + f.benefits[level] + '</div>';
      html += '<button class="btn-upgrade' + (!canAfford ? ' disabled-btn' : '') + '" onclick="upgradeFacility(\'' + f.key + '\', ' + cost + ')" ' + (!canAfford ? 'disabled' : '') + '>Upgrade ' + formatG(cost) + '</button>';
    } else {
      html += '<div class="fac-maxed">MAX LEVEL ✓</div>';
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function renderTransfers() {
  var html = '<div class="screen transfers">';
  html += '<div class="section-title">Transfer Market <button class="btn-refresh" onclick="onRefreshTransfers()">🔄 Refresh (Free)</button></div>';
  html += '<div class="player-grid">';
  G.transfers.forEach(function(p) {
    var pcol = posColor(p.position);
    var ocol = ovrColor(p.ovr);
    var canAfford = G.club.gold >= p.price;
    html += '<div class="player-card">';
    html += '<div class="player-card-top"><span class="pos-badge" style="background:' + pcol + '">' + p.position + '</span>';
    html += '<span class="ovr-circle" style="background:' + ocol + '">' + p.ovr + '</span></div>';
    html += '<div class="player-name">' + p.name + '</div>';
    html += '<div class="player-meta">' + PERSONALITY_EMOJI[p.personality] + ' ' + p.personality + ' | Age ' + p.age + '</div>';
    html += '<div class="player-meta">Wage: ' + p.contract.wage + 'G/match</div>';
    html += '<button class="btn-buy' + (!canAfford ? ' disabled-btn' : '') + '" onclick="buyPlayer(' + p.id + ')" ' + (!canAfford ? 'disabled' : '') + '>Buy ' + formatG(p.price) + '</button>';
    html += '</div>';
  });
  html += '</div>';

  html += '<div class="section-title">Sell Players</div><div class="player-grid">';
  G.squad.forEach(function(p) {
    var sellPrice = Math.floor(clamp((p.ovr - 50) * 80 + rand(100, 500), 200, 3000));
    var pcol = posColor(p.position);
    var ocol = ovrColor(p.ovr);
    html += '<div class="player-card">';
    html += '<div class="player-card-top"><span class="pos-badge" style="background:' + pcol + '">' + p.position + '</span>';
    html += '<span class="ovr-circle" style="background:' + ocol + '">' + p.ovr + '</span></div>';
    html += '<div class="player-name">' + p.name + '</div>';
    html += '<div class="player-meta">' + PERSONALITY_EMOJI[p.personality] + ' | ' + p.position + '</div>';
    html += '<button class="btn-sell" onclick="sellPlayer(' + p.id + ', ' + sellPrice + ')">Sell ' + formatG(sellPrice) + '</button>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openPlayerModal(id) {
  var p = G.squad.find(function(x){ return x.id === id; });
  if (!p) return;
  var pcol = posColor(p.position);
  var ocol = ovrColor(p.ovr);
  var stats = p.stats;

  var html = '<div class="modal-overlay" onclick="closeModal(event, this)">';
  html += '<div class="modal">';
  html += '<div class="modal-header" style="background:' + pcol + '"><b>' + p.position + '</b></div>';
  html += '<div class="modal-body">';
  html += '<div class="modal-name">' + p.name + '</div>';
  html += '<div class="modal-meta">Age: ' + p.age + ' | ' + PERSONALITY_EMOJI[p.personality] + ' ' + p.personality + '</div>';
  html += '<div class="modal-ovr" style="color:' + ocol + '">OVR: ' + p.ovr + ' | Pot: ' + p.potential + '</div>';
  html += '<div class="stats-grid">';
  var statLabels = { spd:'SPD', sht:'SHT', drb:'DRB', pas:'PAS', def:'DEF', sta:'STA', air:'AIR' };
  for (var sk in statLabels) {
    html += '<div class="stat-row-m"><span>' + statLabels[sk] + '</span>';
    html += '<div class="stat-bar-m"><div class="stat-fill-m" style="width:' + stats[sk] + '%;background:' + ovrColor(stats[sk]) + '"></div></div>';
    html += '<span>' + stats[sk] + '</span></div>';
  }
  html += '</div>';
  html += '<div class="modal-bars">';
  html += '<div class="mini-bar-wrap"><span>Condition: ' + p.condition + '%</span><div class="mini-bar"><div class="mini-fill" style="width:' + p.condition + '%;background:#4caf50"></div></div></div>';
  html += '<div class="mini-bar-wrap"><span>Moral: ' + p.moral + '</span><div class="mini-bar"><div class="mini-fill" style="width:' + p.moral + '%;background:#2196f3"></div></div></div>';
  html += '</div>';
  html += '<div class="modal-contract">Wage: ' + p.contract.wage + 'G | Contract: ' + p.contract.duration + ' yr</div>';
  if (p.injured) html += '<div class="inj-info">🚑 Injured: ' + p.injuryDays + ' days remaining</div>';
  html += '<div class="modal-actions">';
  html += '<button class="btn-toggle-sel" onclick="togglePlayerSelection(' + p.id + ')">' + (p.selected ? '🪑 Move to Bench' : '✅ Add to Starting XI') + '</button>';
  html += '<button class="btn-close-modal" onclick="closeModal()">Close</button>';
  html += '</div></div></div></div>';

  var overlay = document.createElement('div');
  overlay.innerHTML = html;
  document.body.appendChild(overlay.firstChild);
}

function openSkillTree() {
  if (G.manager.skillPoints <= 0) { showToast('No skill points available!'); return; }
  var skills = [
    { key: 'tactic', name: '🗺️ Tactic', desc: 'Reduces tactic cooldowns -10% per level' },
    { key: 'development', name: '📈 Development', desc: 'Player OVR growth +5% per level' },
    { key: 'economy', name: '💰 Economy', desc: 'Match income +8% per level' },
    { key: 'recruitment', name: '🔍 Recruitment', desc: 'Transfer prices -10% per level' },
    { key: 'motivation', name: '📣 Motivation', desc: 'Moral boost +5% per level' }
  ];

  var html = '<div class="modal-overlay" onclick="closeModal(event, this)">';
  html += '<div class="modal">';
  html += '<div class="modal-header">Skill Tree (Points: ' + G.manager.skillPoints + ')</div>';
  html += '<div class="modal-body">';
  skills.forEach(function(s) {
    var level = G.manager.skills[s.key];
    var maxed = level >= 5;
    html += '<div class="skill-row">';
    html += '<div class="skill-info"><b>' + s.name + '</b> Lv.' + level + '/5</div>';
    html += '<div class="skill-desc">' + s.desc + '</div>';
    html += '<div class="skill-stars">' + '★'.repeat(level) + '☆'.repeat(5-level) + '</div>';
    if (!maxed) {
      html += '<button class="btn-skill" onclick="upgradeSkill(\'' + s.key + '\')">Upgrade (1 pt)</button>';
    } else {
      html += '<span class="skill-maxed">MAXED</span>';
    }
    html += '</div>';
  });
  html += '<button class="btn-close-modal" onclick="closeModal()">Close</button>';
  html += '</div></div></div>';

  var overlay = document.createElement('div');
  overlay.innerHTML = html;
  document.body.appendChild(overlay.firstChild);
}

function closeModal(event, elem) {
  if (event && event.target !== elem) return;
  var overlays = document.querySelectorAll('.modal-overlay');
  overlays.forEach(function(o) { if (o.parentNode) o.parentNode.removeChild(o); });
}

// ─── EVENT HANDLERS ───────────────────────────────────────────────────────────
function attachEventListeners() {
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      G.screen = this.dataset.screen;
      renderScreen();
    });
  });
}

function onStartMatch() {
  var nextFixture = G.season.fixtures.find(function(f){ return !f.played; });
  if (!nextFixture) { showToast('No upcoming fixtures!'); return; }
  var sel = getSelectedPlayers();
  if (sel.length < 7) { showToast('Need at least 7 fit players!'); return; }
  startMatch(nextFixture);
}

function setTactic(tactic) {
  var m = G.match;
  if (!m || m.phase !== 'playing') return;
  var cdMap = { press: 15, counter: 12, defensive: 10, possession: 8 };
  var cdKey = { press: 'press', counter: 'counter', defensive: 'defensive', possession: 'possession' };
  var reduction = 1 - G.manager.skills.tactic * 0.1;
  if (m.cooldowns[cdKey[tactic]] > 0) { showToast('Tactic on cooldown!'); return; }
  m.activeTactic = tactic;
  m.cooldowns[cdKey[tactic]] = Math.round(cdMap[tactic] * reduction);
  addMatchEvent(m.time, 'Tactic changed: ' + tactic.toUpperCase(), 'info');
  updateMatchUI();
}

function useTimeout() {
  var m = G.match;
  if (!m || m.timeoutsLeft <= 0) return;
  m.timeoutsLeft--;
  m.momentum = clamp(m.momentum + 15, -100, 100);
  addMatchEvent(m.time, 'Timeout called! Team regrouped.', 'good');
  showToast('Timeout used! Momentum boosted!');
  updateMatchUI();
}

function useMotivation() {
  var m = G.match;
  if (!m || m.motivationUsed) return;
  m.motivationUsed = true;
  var moralBoost = 5 + G.manager.skills.motivation * 5;
  G.squad.forEach(function(p) { if (p.selected) p.moral = clamp(p.moral + moralBoost, 0, 100); });
  m.momentum = clamp(m.momentum + 20, -100, 100);
  addMatchEvent(m.time, 'Manager rallies the troops! +Momentum!', 'good');
  showToast('Team motivated! +' + moralBoost + ' moral!');
  updateMatchUI();
}

function resumeHalftime() {
  var m = G.match;
  if (!m) return;
  m.phase = 'playing';
  m.activeTactic = 'balanced';
  addMatchEvent(45, 'Second half underway!', 'info');
  m.intervalId = setInterval(matchTick, 300);
  renderScreen();
}

function endMatchReturn() {
  G.match = null;
  G.screen = 'dashboard';
  renderScreen();
}

function onCMChoice(which) {
  var m = G.match;
  if (!m || !m.currentCM) return;
  var cm = m.currentCM;
  if (which === 1) cm.opt1.fn();
  else cm.opt2.fn();
}

function updateMatchUI() {
  if (G.screen === 'match') renderScreen();
}

function togglePlayerSelection(id) {
  var p = G.squad.find(function(x){ return x.id === id; });
  if (!p) return;
  if (p.injured) { showToast('Cannot select injured player!'); return; }
  var selCount = G.squad.filter(function(x){ return x.selected; }).length;
  if (p.selected && selCount <= 7) { showToast('Need at least 7 selected players!'); return; }
  p.selected = !p.selected;
  closeModal();
  renderScreen();
  showToast(p.name + (p.selected ? ' added to starting XI' : ' moved to bench'));
}

function upgradeSkill(key) {
  if (G.manager.skillPoints <= 0) { showToast('No skill points!'); return; }
  if (G.manager.skills[key] >= 5) { showToast('Already maxed!'); return; }
  G.manager.skills[key]++;
  G.manager.skillPoints--;
  closeModal();
  showToast('Skill upgraded: ' + key + ' → Level ' + G.manager.skills[key]);
  renderScreen();
}

function upgradeFacility(key, cost) {
  if (G.club.gold < cost) { showToast('Not enough gold!'); return; }
  if (G.facilities[key] >= 5) { showToast('Already maxed!'); return; }
  G.club.gold -= cost;
  G.facilities[key]++;
  showToast('Facility upgraded to level ' + G.facilities[key] + '!');
  renderScreen();
}

function buyPlayer(id) {
  var p = G.transfers.find(function(x){ return x.id === id; });
  if (!p) return;
  if (G.club.gold < p.price) { showToast('Not enough gold!'); return; }
  G.club.gold -= p.price;
  p.selected = false;
  G.squad.push(p);
  G.transfers = G.transfers.filter(function(x){ return x.id !== id; });
  showToast('Signed ' + p.name + '!');
  renderScreen();
}

function sellPlayer(id, price) {
  if (G.squad.length <= 14) { showToast('Cannot sell - squad too small!'); return; }
  var p = G.squad.find(function(x){ return x.id === id; });
  if (!p) return;
  G.club.gold += price;
  G.squad = G.squad.filter(function(x){ return x.id !== id; });
  showToast('Sold ' + p.name + ' for ' + formatG(price));
  renderScreen();
}

function onRefreshTransfers() {
  refreshTransfers();
  showToast('Transfer market refreshed!');
  renderScreen();
}

// ─── WELCOME SCREEN ───────────────────────────────────────────────────────────
function showWelcomeScreen() {
  var app = document.getElementById('app');
  app.innerHTML = '<div class="welcome-screen">' +
    '<div class="welcome-logo">⚽ APEX MANAGER</div>' +
    '<div class="welcome-subtitle">Build your club to greatness</div>' +
    '<div class="welcome-form">' +
    '<label>Club Name</label>' +
    '<input id="club-name-input" type="text" placeholder="e.g. FC Phoenix" maxlength="20" />' +
    '<label>Manager Name</label>' +
    '<input id="manager-name-input" type="text" placeholder="e.g. Alex Ferguson" maxlength="20" />' +
    '<button id="start-game-btn" onclick="startNewGame()">🚀 Start Career</button>' +
    '</div></div>';
}

function startNewGame() {
  var clubNameInput = document.getElementById('club-name-input');
  var managerNameInput = document.getElementById('manager-name-input');
  var clubName = clubNameInput ? clubNameInput.value.trim() : '';
  var managerName = managerNameInput ? managerNameInput.value.trim() : '';
  if (!clubName) { showToast('Enter a club name!'); return; }
  if (!managerName) { showToast('Enter your name!'); return; }

  G.club.name = clubName;
  G.manager.name = managerName;
  G.squad = generateStartingSquad();
  var teamOVR = G.squad.filter(function(p){ return p.selected; }).reduce(function(s,p){ return s + p.ovr; }, 0) / 11;
  G.aiTeams = generateAITeams(teamOVR);
  G.season.fixtures = generateFixtures();
  refreshTransfers();
  G.screen = 'dashboard';
  renderScreen();
  showToast('Welcome, ' + managerName + '! Good luck!');
}

// ─── CSS INJECTION ────────────────────────────────────────────────────────────
function injectCSS() {
  var style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f1a; color: #eee; overflow-x: hidden; }
    #app { min-height: 100vh; padding-bottom: 70px; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    /* HEADER */
    .header { background: linear-gradient(135deg, #1a1a3e, #2d2d5e); padding: 10px 14px 6px; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
    .header-top { display: flex; justify-content: space-between; align-items: center; }
    .club-name { font-size: 16px; font-weight: 700; color: #fff; }
    .gold-display { font-size: 14px; font-weight: 600; color: #ffd700; }
    .live-bar { margin-top: 4px; font-size: 12px; color: #aaa; text-align: center; }
    .live-score { display: inline-block; }
    .live-dot { color: #e74c3c; animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

    /* NAV */
    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #1a1a2e; border-top: 1px solid #333; display: flex; z-index: 200; }
    .nav-btn { flex: 1; border: none; background: none; color: #888; padding: 8px 2px 6px; font-size: 18px; cursor: pointer; position: relative; transition: color 0.2s; }
    .nav-btn.active { color: #4a90e2; }
    .nav-btn small { font-size: 10px; display: block; margin-top: 2px; }
    .red-dot { position: absolute; top: 6px; right: 50%; margin-right: -12px; width: 8px; height: 8px; background: #e74c3c; border-radius: 50%; }

    /* SCREENS */
    .screen { padding: 12px; animation: fadeIn 0.2s; }
    .section-title { font-size: 15px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin: 12px 0 8px; }

    /* DASHBOARD */
    .rep-bar-wrap { margin-bottom: 8px; }
    .rep-label { font-size: 11px; color: #888; margin-bottom: 3px; }
    .rep-bar { background: #222; border-radius: 6px; height: 8px; overflow: hidden; }
    .rep-fill { height: 100%; background: linear-gradient(90deg, #4a90e2, #7b2ff7); border-radius: 6px; transition: width 0.5s; }
    .manager-card { background: #1a1a2e; border-radius: 12px; padding: 12px; margin-bottom: 12px; border: 1px solid #333; }
    .manager-info { font-size: 14px; margin-bottom: 8px; color: #ddd; }
    .xp-bar-wrap { display: flex; align-items: center; gap: 8px; }
    .xp-bar { flex: 1; background: #222; border-radius: 6px; height: 10px; overflow: hidden; }
    .xp-fill { height: 100%; background: linear-gradient(90deg, #f39c12, #e74c3c); border-radius: 6px; transition: width 0.5s; }
    .xp-label { font-size: 11px; color: #888; white-space: nowrap; }
    .btn-skill-up { margin-top: 10px; width: 100%; background: linear-gradient(135deg, #7b2ff7, #4a90e2); color: #fff; border: none; padding: 8px; border-radius: 8px; font-size: 13px; cursor: pointer; }

    .match-card { background: #1a1a2e; border-radius: 12px; padding: 14px; margin-bottom: 12px; border: 1px solid #4a90e2; }
    .match-card-title { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
    .match-teams { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .match-diff { font-size: 13px; color: #aaa; margin-bottom: 12px; }
    .stars { color: #f39c12; }
    .btn-start-match { width: 100%; background: linear-gradient(135deg, #4caf50, #2e7d32); color: #fff; border: none; padding: 12px; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; letter-spacing: 1px; }

    .quick-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
    .stat-box { background: #1a1a2e; border-radius: 10px; padding: 10px 6px; text-align: center; border: 1px solid #333; }
    .stat-val { font-size: 22px; font-weight: 700; }
    .stat-val.green { color: #4caf50; }
    .stat-val.yellow { color: #f39c12; }
    .stat-val.red { color: #e74c3c; }
    .stat-lbl { font-size: 10px; color: #888; margin-top: 2px; }

    .results-list { background: #1a1a2e; border-radius: 10px; padding: 8px; }
    .result-row { padding: 6px 4px; border-bottom: 1px solid #222; font-size: 13px; display: flex; align-items: center; gap: 8px; }
    .result-row:last-child { border-bottom: none; }
    .result-badge { display: inline-block; width: 22px; height: 22px; border-radius: 4px; text-align: center; line-height: 22px; font-size: 11px; font-weight: 700; }
    .result-badge.green { background: #4caf50; color: #fff; }
    .result-badge.yellow { background: #f39c12; color: #000; }
    .result-badge.red { background: #e74c3c; color: #fff; }

    .no-match { text-align: center; padding: 40px 20px; color: #888; }

    /* SQUAD */
    .player-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .player-card { background: #1a1a2e; border-radius: 12px; padding: 10px; border: 1px solid #2a2a4e; cursor: pointer; transition: border-color 0.2s; }
    .player-card:active { border-color: #4a90e2; }
    .player-card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
    .pos-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: #000; }
    .ovr-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
    .sel-badge { font-size: 12px; color: #4caf50; margin-left: auto; }
    .inj-badge { font-size: 10px; color: #e74c3c; }
    .player-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .player-meta { font-size: 10px; color: #888; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mini-bar-wrap { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; font-size: 10px; color: #888; }
    .mini-bar-wrap span { width: 24px; flex-shrink: 0; }
    .mini-bar { flex: 1; background: #222; border-radius: 3px; height: 5px; overflow: hidden; }
    .mini-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }

    /* MATCH */
    .match-screen { padding: 10px; }
    .match-header { display: flex; justify-content: space-between; align-items: center; background: #1a1a2e; border-radius: 12px; padding: 14px 10px; margin-bottom: 10px; }
    .team-name-sm { font-size: 12px; color: #aaa; max-width: 90px; text-align: center; line-height: 1.2; }
    .score-display { font-size: 40px; font-weight: 900; color: #fff; text-align: center; }
    .score-dash { color: #555; }
    .match-info-row { display: flex; justify-content: space-around; margin-bottom: 8px; }
    .match-time { font-size: 20px; font-weight: 700; color: #4a90e2; }
    .poss-label { font-size: 13px; color: #aaa; }
    .cond-label { font-size: 13px; color: #f39c12; }
    .mom-wrap { background: #1a1a2e; border-radius: 10px; padding: 8px; margin-bottom: 10px; }
    .mom-label { font-size: 11px; color: #888; margin-bottom: 4px; text-align: center; }
    .mom-bar { background: #222; border-radius: 6px; height: 12px; position: relative; overflow: hidden; }
    .mom-center { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: #444; }
    .mom-fill { position: absolute; top: 0; bottom: 0; border-radius: 6px; }
    .mom-val { text-align: center; font-size: 12px; color: #aaa; margin-top: 4px; }
    .tactic-row { display: flex; gap: 6px; margin-bottom: 8px; overflow-x: auto; }
    .tact-btn { flex: 1; min-width: 70px; background: #1a1a2e; color: #ccc; border: 1px solid #333; padding: 8px 4px; border-radius: 8px; font-size: 11px; cursor: pointer; text-align: center; transition: all 0.2s; }
    .tact-btn.active-tact { background: #2d4a8e; border-color: #4a90e2; color: #fff; }
    .tact-btn:disabled { opacity: 0.4; cursor: default; }
    .action-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .btn-timeout, .btn-motivate, .btn-resume-half, .btn-end-match { flex: 1; padding: 10px 6px; border-radius: 8px; border: none; font-size: 12px; cursor: pointer; font-weight: 600; }
    .btn-timeout { background: #2d5a2d; color: #fff; }
    .btn-motivate { background: #5a2d5a; color: #fff; }
    .btn-resume-half { background: #2d5a7b; color: #fff; }
    .btn-end-match { background: #333; color: #fff; }
    .btn-timeout:disabled, .btn-motivate:disabled { opacity: 0.4; }
    .events-feed { background: #1a1a2e; border-radius: 10px; padding: 8px; max-height: 180px; overflow-y: auto; }
    .event-row { padding: 5px 4px; border-bottom: 1px solid #222; font-size: 12px; display: flex; gap: 8px; }
    .event-row:last-child { border-bottom: none; }
    .ev-time { color: #666; min-width: 28px; }
    .ev-goal { color: #4caf50; font-weight: 700; }
    .ev-opp-goal { color: #e74c3c; font-weight: 700; }
    .ev-bad { color: #e74c3c; }
    .ev-good { color: #4caf50; }
    .ev-info { color: #aaa; }

    /* CRITICAL MOMENT */
    .cm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 500; padding: 20px; }
    .cm-card { background: linear-gradient(135deg, #1a1a3e, #2d2d5e); border-radius: 16px; padding: 24px; width: 100%; max-width: 360px; text-align: center; border: 2px solid #4a90e2; animation: fadeIn 0.3s; }
    .cm-icon { font-size: 36px; margin-bottom: 8px; }
    .cm-title { font-size: 20px; font-weight: 800; margin-bottom: 10px; color: #fff; }
    .cm-desc { font-size: 14px; color: #ccc; margin-bottom: 20px; line-height: 1.5; }
    .cm-btn { display: block; width: 100%; padding: 14px; border-radius: 10px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: 10px; }
    .cm-btn1 { background: linear-gradient(135deg, #4caf50, #2e7d32); color: #fff; }
    .cm-btn2 { background: linear-gradient(135deg, #f39c12, #e67e22); color: #fff; }

    /* MINI-GAME */
    .mg-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 500; padding: 20px; }
    .mg-card { background: #1a1a2e; border-radius: 16px; padding: 20px; width: 100%; max-width: 360px; text-align: center; border: 2px solid #f39c12; animation: fadeIn 0.3s; }
    .mg-title { font-size: 20px; font-weight: 800; margin-bottom: 6px; color: #f39c12; }
    .mg-desc { font-size: 13px; color: #ccc; margin-bottom: 12px; }
    .mg-canvas { border-radius: 10px; max-width: 100%; cursor: pointer; display: block; margin: 0 auto; touch-action: none; }
    .mg-countdown { font-size: 22px; font-weight: 700; color: #e74c3c; margin-top: 10px; }

    /* LEAGUE */
    .league-table { width: 100%; border-collapse: collapse; font-size: 12px; background: #1a1a2e; border-radius: 10px; overflow: hidden; }
    .league-table th { background: #111; color: #888; padding: 8px 4px; text-align: center; font-size: 11px; }
    .league-table td { padding: 7px 4px; text-align: center; border-bottom: 1px solid #222; }
    .league-table .your-team { background: rgba(74,175,80,0.15); color: #4caf50; }
    .team-name-cell { text-align: left; max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fixtures-list { background: #1a1a2e; border-radius: 10px; padding: 8px; }
    .fixture-row { padding: 8px 4px; border-bottom: 1px solid #222; font-size: 13px; }
    .fixture-row:last-child { border-bottom: none; }

    /* FACILITIES */
    .facility-card { background: #1a1a2e; border-radius: 12px; padding: 14px; margin-bottom: 12px; border: 1px solid #2a2a4e; }
    .fac-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .fac-icon { font-size: 24px; }
    .fac-name { font-size: 16px; font-weight: 700; }
    .fac-level { font-size: 13px; color: #f39c12; margin-bottom: 6px; }
    .fac-benefit { font-size: 13px; color: #4caf50; margin-bottom: 4px; }
    .fac-next { font-size: 12px; color: #aaa; margin-bottom: 8px; }
    .fac-desc { font-size: 11px; color: #666; margin-bottom: 8px; }
    .fac-maxed { font-size: 13px; color: #4caf50; font-weight: 700; }
    .btn-upgrade { width: 100%; background: linear-gradient(135deg, #4a90e2, #7b2ff7); color: #fff; border: none; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .disabled-btn { opacity: 0.5; cursor: default; }

    /* TRANSFERS */
    .btn-refresh { background: #2d5a2d; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-left: 8px; }
    .btn-buy { width: 100%; background: linear-gradient(135deg, #4caf50, #2e7d32); color: #fff; border: none; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; margin-top: 6px; }
    .btn-sell { width: 100%; background: linear-gradient(135deg, #e74c3c, #922b21); color: #fff; border: none; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; margin-top: 6px; }

    /* MODALS */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: #1a1a2e; border-radius: 16px; width: 100%; max-width: 380px; max-height: 85vh; overflow-y: auto; border: 1px solid #333; animation: fadeIn 0.2s; }
    .modal-header { background: #2d2d5e; padding: 14px 16px; font-size: 16px; font-weight: 700; border-radius: 16px 16px 0 0; text-align: center; }
    .modal-body { padding: 16px; }
    .modal-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .modal-meta { font-size: 13px; color: #aaa; margin-bottom: 6px; }
    .modal-ovr { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
    .stats-grid { margin-bottom: 12px; }
    .stat-row-m { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
    .stat-row-m > span:first-child { width: 28px; color: #888; }
    .stat-bar-m { flex: 1; background: #222; border-radius: 4px; height: 8px; overflow: hidden; }
    .stat-fill-m { height: 100%; border-radius: 4px; }
    .stat-row-m > span:last-child { width: 24px; text-align: right; }
    .modal-bars { margin-bottom: 10px; }
    .modal-contract { font-size: 12px; color: #888; margin-bottom: 10px; }
    .inj-info { font-size: 12px; color: #e74c3c; margin-bottom: 10px; }
    .modal-actions { display: flex; flex-direction: column; gap: 8px; }
    .btn-toggle-sel { padding: 10px; background: #2d5a7b; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .btn-close-modal { padding: 10px; background: #333; color: #ccc; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }

    /* SKILL TREE */
    .skill-row { background: #111; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
    .skill-info { font-size: 14px; margin-bottom: 4px; }
    .skill-desc { font-size: 11px; color: #888; margin-bottom: 6px; }
    .skill-stars { color: #f39c12; font-size: 14px; margin-bottom: 8px; }
    .btn-skill { width: 100%; padding: 8px; background: linear-gradient(135deg, #7b2ff7, #4a90e2); color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
    .skill-maxed { font-size: 12px; color: #4caf50; font-weight: 700; }

    /* WELCOME */
    .welcome-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 20px; background: linear-gradient(135deg, #0f0f1a, #1a1a3e); }
    .welcome-logo { font-size: 40px; font-weight: 900; color: #fff; text-align: center; margin-bottom: 8px; }
    .welcome-subtitle { font-size: 16px; color: #888; margin-bottom: 36px; text-align: center; }
    .welcome-form { width: 100%; max-width: 340px; display: flex; flex-direction: column; gap: 12px; }
    .welcome-form label { font-size: 13px; color: #aaa; }
    .welcome-form input { padding: 12px 14px; background: #1a1a2e; border: 1px solid #333; border-radius: 10px; color: #fff; font-size: 15px; }
    .welcome-form input:focus { outline: none; border-color: #4a90e2; }
    #start-game-btn { padding: 14px; background: linear-gradient(135deg, #4caf50, #2e7d32); color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; }
  `;
  document.head.appendChild(style);
}

// ─── EXPOSE GLOBAL FUNCTIONS ──────────────────────────────────────────────────
window.openPlayerModal = openPlayerModal;
window.openSkillTree = openSkillTree;
window.closeModal = closeModal;
window.onStartMatch = onStartMatch;
window.setTactic = setTactic;
window.useTimeout = useTimeout;
window.useMotivation = useMotivation;
window.resumeHalftime = resumeHalftime;
window.endMatchReturn = endMatchReturn;
window.onCMChoice = onCMChoice;
window.togglePlayerSelection = togglePlayerSelection;
window.upgradeSkill = upgradeSkill;
window.upgradeFacility = upgradeFacility;
window.buyPlayer = buyPlayer;
window.sellPlayer = sellPlayer;
window.onRefreshTransfers = onRefreshTransfers;
window.startNewGame = startNewGame;

// ─── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  injectCSS();
  var loaded = loadGame();
  if (loaded && G.club.name) {
    G.screen = 'dashboard';
    renderScreen();
    showToast('Welcome back, ' + G.manager.name + '!');
  } else {
    showWelcomeScreen();
  }
});

})();
