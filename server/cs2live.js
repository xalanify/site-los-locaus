// ============================================================
// CS2 AO VIVO — via Steam Web API oficial (ISteamUserStats)
// Autorizacao: key gratuita criada uma vez em
// https://steamcommunity.com/dev/apikey → STEAM_API_KEY no
// server/.env. Depois desta configuração NUNCA MAIS HÁ exports
// manuais: a Steam mantem os numeros atualizados.
// Lista de membros: server/data/cs2-steam.json
//   ACEITA SÓ NOMES, tipo o R6:
//     ["xalanix", "sonojo", ...]
//   (ou objetos { nick, steam: "7656119..." } se preferires)
//   O servidor resolve cada nome → SteamID64 sozinho (perfil
//   publico da Steam) e grava o ID no proprio ficheiro.
// ============================================================
const fs = require('fs');
const path = require('path');

const FILES = path.join(__dirname, 'data', 'cs2-steam.json');

function env() {
  // No Vercel (serverless) o ficheiro .env local nao e lido — a key vem
  // injetada em process.env. No local, continua a ler de server/.env.
  if (process.env.STEAM_API_KEY) return String(process.env.STEAM_API_KEY).trim();
  try {
    const linhas = fs
      .readFileSync(path.join(__dirname, '.env'), 'utf8')
      .split(/\r?\n/)
      .filter((l) => !/^\s*#/.test(l)) // ignora comentários
      .join('\n');
    const m = linhas.match(/STEAM_API_KEY\s*=\s*(\S+)/);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function escrever(l) {
  fs.writeFileSync(FILES, JSON.stringify(l, null, 2));
}

// aceita strings simples ["nome"] OU objetos {nick, steam}
function membros() {
  try {
    const l = JSON.parse(fs.readFileSync(FILES, 'utf8'));
    return Array.isArray(l)
      ? l.filter((x) => x && (typeof x === 'string' ? x.trim() : x.steam))
      : [];
  } catch {
    return [];
  }
}

/* Converte nomes em SteamID64 (uma vez por nome): para cada
   entrada que ainda é string/busca o ID no perfil público
   steamcommunity.com/id/NOME?xml=1 e grava no próprio ficheiro. */
const EM_CURSO = new Set();

async function normalizar() {
  const l = membros();
  let mudou = false;
  for (let i = 0; i < l.length; i++) {
    const x = l[i];
    if (typeof x !== 'string') continue;
    const nick = x.trim();
    if (EM_CURSO.has(nick)) continue; // já estamos a resolver este
    EM_CURSO.add(nick);
    try {
      const id = await resolveNick(nick);
      if (id) {
        l[i] = { nick, steam: id };
        mudou = true;
      }
    } finally {
      EM_CURSO.delete(nick);
    }
  }
  if (mudou) {
    try {
      escrever(l);
    } catch {}
  }
  return l;
}

async function statsSteam(steamid, key) {
  const url =
    `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?appid=730&steamid=${steamid}&key=${key}`;

  // A Steam falha de forma intermitente (400/429/5xx) quando há muitos
  // pedidos ao mesmo tempo. Tentamos até 3 vezes antes de desistir.
  let ultimoErro = null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch(url, { signal: controller.signal });
      if (r.ok) {
        const j = await r.json();
        const kv = j?.playerstats?.stats || [];
        const mapa = Object.fromEntries(kv.map((s) => [s.name, s.value]));
        const n = (k) => (Number.isFinite(mapa[k]) ? mapa[k] : null);
        const kills = n('total_kills');
        const deaths = n('total_deaths');
        const tiros = n('total_shots_fired');
        const certos = n('total_shots_hit');
        const tempoSegundos = n('total_time_played');
        const hs = n('total_kills_headshot');
        return {
          ok: true,
          steam: steamid,
          nome: j?.playerstats?.steamID || steamid,
          kills,
          deaths,
          kd: kills != null && deaths ? Number((kills / deaths).toFixed(2)) : null,
          mvps: n('total_mvps'),
          tiros,
          precisao: tiros && certos != null ? Number(((certos / tiros) * 100).toFixed(1)) : null,
          hs: hs != null && kills ? Number(((hs / kills) * 100).toFixed(1)) : null,
          vitorias: n('total_wins'),
          rondas: n('total_rounds_played'),
          faca: n('total_kills_knife'),
          he: n('total_kills_hegrenade'),
          dano: n('total_damage'),
          partidas: n('total_matches_played'),
          vencidas: n('total_matches_won'),
          pistola: n('total_kills_deagle') != null ? n('total_kills_deagle') : n('total_kills_pistol'),
          planted: n('total_planted_bombs'),
          defused: n('total_defused_bombs'),
          horas: tempoSegundos != null ? Number((tempoSegundos / 3600).toFixed(0)) : null,
        };
      }
      ultimoErro = `Steam ${r.status}`;
      // 403 é definitivo (privado). 400/429/5xx podem ser temporários.
      if (![400, 429, 500, 502, 503].includes(r.status)) break;
      await new Promise((res) => setTimeout(res, 500 * (tentativa + 1)));
    } catch (e) {
      ultimoErro = String((e && e.message) || e);
      await new Promise((res) => setTimeout(res, 500 * (tentativa + 1)));
    } finally {
      clearTimeout(timer);
    }
  }

  // Depois das tentativas, o erro de achievements diz se é privado ou não.
  const msg = String(ultimoErro || '');
  let motivo = 'outro';
  const m = /Steam (\d+)/.exec(msg);
  const cod = m ? Number(m[1]) : 0;
  if (cod === 403) motivo = 'nao-publico';
  if (cod === 400 || cod === 429 || cod === 500 || !cod) {
    try {
      const r2 = await fetch(
        `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=730&steamid=${steamid}&key=${key}`,
      );
      if (r2.status === 403) motivo = 'nao-publico';
      else if (r2.ok) motivo = 'sem-stats';
    } catch {}
  }
  return { ok: false, steam: steamid, erro: msg, motivo };
}

// cache de 3 minutos por steamid
const cache = new Map();

async function aoVivo() {
  const key = env();
  if (!key) return { ok: false, motivo: 'sem-key' };
  // nomes simples vêm de cs2-steam.json → resolve-os para IDs sozinho
  const lista = (await normalizar())
    .map((m) => (typeof m === 'object' ? m : { nick: m, steam: m }))
    .filter((m) => /^7656\d{13}$/.test(String(m.steam)));
  if (!lista.length) {
    return membros().length
      ? { ok: false, motivo: 'ids-invalidos' }
      : { ok: false, motivo: 'sem-membros' };
  }

  const agora = Date.now();
  // avatars + nomes públicos de perfil (1 pedido por todos, barato)
  let avatares = {};
  try {
    const ids = lista.map((m) => m.steam).join(',');
    const r = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${ids}`,
    );
    const pj = await r.json();
    for (const pr of pj?.response?.players || []) {
      avatares[pr.steamid] = { avatar: pr.avatarfull, nome: pr.personaname };
    }
    // renames da Steam: se a pessoa mudou o nome público, grava já no
    // ficheiro — assim o site (e o admin) seguem sempre o nome atual
    let mudou = false;
    for (let i = 0; i < lista.length; i++) {
      const m = lista[i];
      if (!m || !m.steam) continue;
      const nome = avatares[m.steam]?.nome;
      if (nome && m.nick && nome !== m.nick) {
        lista[i] = { ...m, nick: nome };
        mudou = true;
      }
    }
    if (mudou) {
      try {
        escrever(lista);
      } catch {}
    }
  } catch {}

  const res = await Promise.all(
    lista.map(async (m) => {
      const hit = cache.get(m.steam);
      // só cacheia SUCESSO: quem estiver privado volta a tentar
      // no pedido seguinte, logo que os amigos tornem público
      if (hit && hit.v.ok && agora - hit.t < 3 * 60 * 1000)
        return { ...hit.v, nick: m.nick, avatar: avatares[m.steam]?.avatar || hit.v.avatar };
      const v = await statsSteam(m.steam, key);
      if (v.ok) cache.set(m.steam, { t: agora, v });
      else cache.delete(m.steam);
      return {
        ...v,
        nick: m.nick,
        avatar: avatares[m.steam]?.avatar || null,
        nome: avatares[m.steam]?.nome || m.nick,
      };
    }),
  );
  return { ok: true, jogadores: res };
}

/* ---------- Ligação de jogadores por NOME (sem à mão de IDs) ----------
   steamcommunity.com é público: resolve o nickname → SteamID64 sem
   key nenhuma. O admin só escreve o NOME no site, nunca IDs.
------------------------------------------------------------------------ */
async function resolveNick(nick) {
  try {
    // se já é steamid64, devolve logo
    if (/^7656\d{13}$/.test(nick)) return nick;
    const r = await fetch(
      `https://steamcommunity.com/id/${encodeURIComponent(nick)}/?xml=1`,
      { headers: { 'user-agent': 'Mozilla/5.0' } },
    );
    if (!r.ok) return null;
    const t = await r.text();
    const m = t.match(/<steamID64>(\d{17})<\/steamID64>/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function ligar(nick, steamid) {
  const lista = membros();
  const jáExiste = lista.some((x) =>
    typeof x === 'string'
      ? x.trim().toLowerCase() === String(nick).toLowerCase()
      : String(x.steam) === steamid || String(x.nick).toLowerCase() === String(nick).toLowerCase(),
  );
  if (jáExiste) return { ok: true, jaEstava: true };
  lista.push({ nick, steam: steamid });
  escrever(lista);
  return { ok: true, adicionado: true };
}

module.exports = { aoVivo, membros, resolveNick, ligar };
