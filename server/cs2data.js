/* ============================================================
   CS2 — leitura direta das páginas HTML do histórico da Steam
   (ficheiros "historico-*.html" guardados na raiz do projeto)

   A Steam não deixa ir buscar o histórico sem login, por isso o
   utilizador guarda as páginas e o servidor analisa-as aqui.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const MODES = [
  {
    id: 'bracodireito',
    label: 'Braço Direito',
    game: 'CS2',
    note: '',
    file: 'historico-bracodireito.html',
  },
  {
    id: 'classificatorios',
    label: 'Competitivo Normal CSGO',
    game: 'CS:GO',
    note: '',
    file: 'historico-classificatorioscomp.html',
  },
  {
    id: 'competitivas',
    label: 'Competitivas (CS:GO)',
    game: 'CS:GO',
    note: 'CS:GO antigo (não CS2) — resultados e mapas no formato antigo.',
    file: 'historico-partidascompetitivas.html',
  },
  {
    id: 'premier',
    label: 'Premier',
    game: 'CS2',
    note: '',
    file: 'historico-premier.html',
  },
];

// Jogadores que queremos seguir (identificados pelo data-miniprofile
// da Steam, para aguentar mudanças de nome)
const TRACKED = [
  { key: 'xalanix', name: 'xalanix', minis: ['1254632038'], names: ['xalanix'] },
  { key: 'sonojo', name: 'so nojo', minis: ['1504512434'], names: ['so nojo'] },
  { key: 'jrm', name: 'jrm.v2', minis: ['1161806675'], names: ['jrm.v2'] },
  { key: 'take', name: '_.TaKe.EASy._', minis: ['1158387061'], names: ['_.take.easy._'] },
  { key: 'habibi', name: 'HABIBI GIRL', minis: ['1268771955'], names: ['habibi girl'] },
  { key: 'rabixo', name: 'RABIXO', minis: ['830585176'], names: ['rabixo'] },
];

const TRACK_BY_MINI = new Map();
const TRACK_BY_NAME = new Map();
for (const t of TRACKED) {
  for (const m of t.minis) TRACK_BY_MINI.set(m, t.key);
  for (const n of t.names) TRACK_BY_NAME.set(n, t.key);
}

// Dono do perfil Steam de onde vieram as páginas (xalanix)
const OWNER_MINI = '1254632038';

function decode(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function parseDate(s) {
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toISOString();
}

function parsePlayers(block) {
  const out = [];
  for (const row of block.split('<tr>')) {
    if (!row.includes('playerNickname')) continue;
    const nm = row.match(
      /linkTitle"\s+href="([^"]*)"(?:\s+data-miniprofile="(\d*)")?[^>]*>([\s\S]*?)<\/a>/,
    );
    if (!nm) continue;

    // Células simples depois da coluna do nome: ping, K, A, D, ★, HSP, Score
    const cells = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) =>
      decode(m[1]),
    );
    const num = (v) => {
      const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
      return Number.isFinite(n) ? n : 0;
    };

    const mvpRaw = cells[4] || '';
    const name = decode(nm[3]);
    const mini = nm[2] || '';

    out.push({
      name,
      url: nm[1] || '',
      mini,
      ping: num(cells[0]),
      k: num(cells[1]),
      a: num(cells[2]),
      d: num(cells[3]),
      mvp: String(mvpRaw).includes('★')
        ? Math.max(1, num(String(mvpRaw).replace('★', '')))
        : 0,
      hsp: num(cells[5]),
      score: num(cells[6]),
      tracked: TRACK_BY_MINI.get(mini) || TRACK_BY_NAME.get(name.trim().toLowerCase()) || null,
    });
  }
  return out;
}

function parseMatch(chunk, mode, index) {
  const leftM = chunk.match(
    /<table class="csgo_scoreboard_inner_left">([\s\S]*?)<\/table>/,
  );
  const rightM = chunk.match(
    /<table class="csgo_scoreboard_inner_right">([\s\S]*?)<\/table>/,
  );
  if (!leftM || !rightM) return null;

  const tds = [...leftM[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => decode(m[1]));
  if (tds.length < 2) return null;

  const label = tds[0]; // ex.: "Premier Ancient", "Wingman Vertigo"
  const date = parseDate(tds[1]);
  let duration = '';
  let waitTime = '';
  let ranked = null;
  for (const t of tds) {
    if (t.startsWith('Match Duration:')) duration = t.slice('Match Duration:'.length).trim();
    else if (t.startsWith('Wait Time:')) waitTime = t.slice('Wait Time:'.length).trim();
    else if (t.startsWith('Ranked:')) ranked = /yes/i.test(t);
  }
  const demoM = chunk.match(/href="(https?:\/\/replay[^"]+)"/);

  const right = rightM[1];
  const parts = right.split(
    /<td colspan="8" class="csgo_scoreboard_score">\s*(\d+)\s*:\s*(\d+)\s*<\/td>/,
  );
  if (parts.length < 4) return null; // sem marcador = partida incompleta

  const scoreA = parseInt(parts[1], 10);
  const scoreB = parseInt(parts[2], 10);
  const teamA = parsePlayers(parts[0]);
  const teamB = parsePlayers(parts[3]);
  if (!teamA.length || !teamB.length) return null;

  // Quem é a "nossa" equipa: a do dono do perfil (xalanix)
  let ourTeam = null;
  if (teamA.some((p) => p.mini === OWNER_MINI)) ourTeam = 0;
  else if (teamB.some((p) => p.mini === OWNER_MINI)) ourTeam = 1;
  else {
    const idxA = teamA.findIndex((p) => p.tracked);
    const idxB = teamB.findIndex((p) => p.tracked);
    if (idxA >= 0) ourTeam = 0;
    else if (idxB >= 0) ourTeam = 1;
  }

  const ourScore = ourTeam === 0 ? scoreA : scoreB;
  const oppScore = ourTeam === 0 ? scoreB : scoreA;
  let result = null;
  if (ourTeam !== null) {
    result = ourScore > oppScore ? 'win' : ourScore < oppScore ? 'loss' : 'draw';
  }

  // "Premier Ancient" -> prefixo = modo escrito no site da Steam, resto = mapa
  const sp = label.indexOf(' ');
  const prefix = sp > 0 ? label.slice(0, sp) : label;
  const map = sp > 0 ? label.slice(sp + 1) : '';

  return {
    id: `${mode.id}-${index}`,
    mode: mode.id,
    label,
    prefix,
    map,
    date,
    duration,
    waitTime,
    ranked,
    demo: demoM ? demoM[1] : null,
    scoreA,
    scoreB,
    ourScore,
    oppScore,
    result,
    ourTeam,
    teamA,
    teamB,
  };
}

function parseFile(fullPath, mode) {
  let html;
  try {
    html = fs.readFileSync(fullPath, 'utf8');
  } catch {
    return null;
  }
  const chunks = html.split('<td class="val_left">').slice(1);
  const matches = [];
  chunks.forEach((chunk, i) => {
    const m = parseMatch(chunk, mode, i);
    if (m) matches.push(m);
  });
  return matches;
}

// ---------- agregação ----------
function newStats() {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    roundsFor: 0,
    roundsAgainst: 0,
    players: {},
  };
}

function emptyPlayer() {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    mvps: 0,
    hspSum: 0,
    scoreSum: 0,
  };
}

function finishPlayer(p) {
  const n = p.matches || 1;
  return {
    matches: p.matches,
    wins: p.wins,
    losses: p.losses,
    draws: p.draws,
    winRate: p.matches ? Math.round(((p.wins + p.draws * 0.5) / p.matches) * 100) : 0,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    mvps: p.mvps,
    kd: p.deaths ? Math.round((p.kills / p.deaths) * 100) / 100 : p.kills,
    avgKills: Math.round((p.kills / n) * 10) / 10,
    avgDeaths: Math.round((p.deaths / n) * 10) / 10,
    avgScore: Math.round(p.scoreSum / n),
    avgHsp: Math.round((p.hspSum / n) * 10) / 10,
  };
}

function finishStats(s) {
  const players = {};
  for (const [k, v] of Object.entries(s.players)) players[k] = finishPlayer(v);
  return {
    matches: s.matches,
    wins: s.wins,
    losses: s.losses,
    draws: s.draws,
    winRate: s.matches ? Math.round(((s.wins + s.draws * 0.5) / s.matches) * 100) : 0,
    roundsFor: s.roundsFor,
    roundsAgainst: s.roundsAgainst,
    players,
  };
}

function aggregate(matches) {
  const s = newStats();
  for (const m of matches) {
    s.matches++;
    if (m.result === 'win') s.wins++;
    else if (m.result === 'loss') s.losses++;
    else if (m.result === 'draw') s.draws++;
    if (m.ourTeam !== null) {
      s.roundsFor += m.ourScore;
      s.roundsAgainst += m.oppScore;
    }

    for (const team of [m.teamA, m.teamB]) {
      const teamIdx = team === m.teamA ? 0 : 1;
      const teamWon = m.scoreA > m.scoreB ? 0 : m.scoreB > m.scoreA ? 1 : -1;
      for (const p of team) {
        if (!p.tracked) continue;
        const ps = (s.players[p.tracked] = s.players[p.tracked] || emptyPlayer());
        ps.matches++;
        if (teamWon === teamIdx) ps.wins++;
        else if (teamWon === -1) ps.draws++;
        else ps.losses++;
        ps.kills += p.k;
        ps.deaths += p.d;
        ps.assists += p.a;
        ps.mvps += p.mvp;
        ps.hspSum += p.hsp;
        ps.scoreSum += p.score;
      }
    }
  }
  return finishStats(s);
}

// ---------- cache com verificação de data de modificação ----------
let cache = null;
let cacheKey = '';

function statMtime(fullPath) {
  try {
    return fs.statSync(fullPath).mtimeMs;
  } catch {
    return 0;
  }
}

function getData() {
  const files = MODES.map((m) => {
    const full = path.join(ROOT, m.file);
    return { mode: m, full, found: fs.existsSync(full), mtime: statMtime(full) };
  });

  const key = files.map((f) => `${f.mode.id}:${f.found ? f.mtime : 'x'}`).join('|');
  if (cache && cacheKey === key) return cache;

  const byMode = {};
  const all = [];
  const missing = [];

  for (const f of files) {
    if (!f.found) {
      missing.push(f.mode.file);
      byMode[f.mode.id] = [];
      continue;
    }
    const matches = parseFile(f.full, f.mode);
    matches.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    byMode[f.mode.id] = matches;
    all.push(...matches);
  }

  const perMode = {};
  for (const m of MODES) perMode[m.id] = aggregate(byMode[m.id] || []);

  // Estatísticas dos jogadores em cada modo + no global
  const players = TRACKED.map((t) => ({
    key: t.key,
    name: t.name,
    global: perModeAllPlayers(perMode, t.key, null),
    byMode: Object.fromEntries(MODES.map((m) => [m.id, perModeAllPlayers(perMode, t.key, m.id)])),
  }));

  const data = {
    configured: missing.length === 0,
    missing,
    modes: MODES.map((m) => ({
      id: m.id,
      label: m.label,
      game: m.game,
      note: m.note,
      file: m.file,
      count: (byMode[m.id] || []).length,
    })),
    global: aggregate(all),
    perMode,
    players,
    matches: [...all].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    updatedAt: new Date().toISOString(),
  };

  cache = data;
  cacheKey = key;
  return data;
}

// Junta as estatísticas de um jogador dentro de um modo (ou global com modeId=null)
function perModeAllPlayers(perMode, playerKey, modeId) {
  const list = modeId ? [perMode[modeId]] : Object.values(perMode);
  const acc = emptyPlayer();
  let any = false;
  for (const st of list) {
    const p = st.players[playerKey];
    if (!p) continue;
    any = true;
    acc.matches += p.matches;
    acc.wins += p.wins;
    acc.losses += p.losses;
    acc.draws += p.draws;
    acc.kills += p.kills;
    acc.deaths += p.deaths;
    acc.assists += p.assists;
    acc.mvps += p.mvps;
    acc.hspSum += p.avgHsp * p.matches;
    acc.scoreSum += p.avgScore * p.matches;
  }
  void any;
  return finishPlayer(acc);
}

module.exports = { getData, MODES, TRACKED };
