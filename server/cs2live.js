// ============================================================
// CS2 AO VIVO — via Steam Web API oficial (ISteamUserStats)
// Autorizacao: key gratuita criada uma vez em
// https://steamcommunity.com/dev/apikey → STEAM_API_KEY no
// server/.env. Depois desta configuracao NUNCA MAIS HAVERRA
// exports manuais: a Steam mantem os numeros atualizados.
// Lista de membros: server/data/cs2-steam.json
//   [ { nick: "xalanix", steam: "7656119..." } ]
// ============================================================
const fs = require('fs');
const path = require('path');

const FILES = path.join(__dirname, 'data', 'cs2-steam.json');

function env() {
  try {
    const txt = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const m = txt.match(/STEAM_API_KEY\s*=\s*(\S+)/);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function membros() {
  try {
    const l = JSON.parse(fs.readFileSync(FILES, 'utf8'));
    return Array.isArray(l) ? l.filter((x) => x && x.steam) : [];
  } catch {
    return [];
  }
}

async function statsSteam(steamid, key) {
  const url =
    `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?appid=730&steamid=${steamid}&key=${key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error(`Steam ${r.status}`);
    const j = await r.json();
    const kv = j?.playerstats?.stats || [];
    const mapa = Object.fromEntries(kv.map((s) => [s.name, s.value]));
    const n = (k) => (Number.isFinite(mapa[k]) ? mapa[k] : null);
    const kills = n('total_kills');
    const deaths = n('total_deaths');
    const tiros = n('total_shots_fired');
    const certos = n('total_shots_hit');
    const horas = n('total_time_played');
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
      horas: horas != null ? Number((horas / 60).toFixed(0)) : null, // segundos → horas? Steam devolve minutos
      plants: n('total_defusas') != null ? n('total_defusas') : n('total_planted_bombs'),
    };
  } catch (e) {
    return { ok: false, steam: steamid, erro: String((e && e.message) || e) };
  } finally {
    clearTimeout(timer);
  }
}

// cache de 3 minutos por steamid
const cache = new Map();

async function aoVivo() {
  const key = env();
  if (!key) return { ok: false, motivo: 'sem-key' };
  const lista = membros();
  if (!lista.length) return { ok: false, motivo: 'sem-membros' };
  // steamid64 = 17 dígitos a começar por 7656
  const mortos = lista.filter((x) => !/^7656\d{13}$/.test(String(x.steam)));
  if (mortos.length) return { ok: false, motivo: 'ids-invalidos' };

  const agora = Date.now();
  const res = await Promise.all(
    lista.map(async (m) => {
      const hit = cache.get(m.steam);
      if (hit && agora - hit.t < 3 * 60 * 1000) return { ...hit.v, nick: m.nick };
      const v = await statsSteam(m.steam, key);
      cache.set(m.steam, { t: agora, v });
      return { ...v, nick: m.nick };
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
  if (lista.some((x) => String(x.steam) === steamid)) {
    return { ok: true, jaEstava: true };
  }
  lista.push({ nick, steam: steamid });
  fs.writeFileSync(FILES, JSON.stringify(lista, null, 2));
  return { ok: true, adicionado: true };
}

module.exports = { aoVivo, membros, resolveNick, ligar };
