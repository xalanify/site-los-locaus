/* ============================================================
   Fortnite — próximos torneios (TODOS, incluindo copas diárias)
   ------------------------------------------------------------
   Fonte: FNJPNews (uefn.fnjpnews.com), que espelha o calendário
   oficial da Epic (Compete): FNCS, Cash Cups, Ranked Cups, copas
   comunitárias, mobile, etc. — por região.

   A API devolve o histórico todo (grande), por isso filtramos só
   as janelas que ainda não terminaram e escolhemos a próxima de
   cada evento. Cache de 15 min por região.
   ============================================================ */
const BASE = 'https://uefn.fnjpnews.com/api/fortnite/tournaments';

const REGIOES = ['EU', 'NAC', 'NAE', 'NAW', 'OCE', 'ME', 'BR', 'ASIA'];
const TTL = 5 * 60 * 1000;
const cache = new Map(); // regiao -> { t, dados }

const limpar = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function nomeDoEvento(e) {
  const a = limpar(e.name_line1);
  const b = limpar(e.name_line2);
  let nome = !b || b.toLowerCase() === a.toLowerCase() ? a || 'Torneio' : `${a} - ${b}`;

  // em algumas regiões o nome não diz “Zero Build”; o id diz
  const id = `${e.id || ''} ${e.displayId || ''}`.toLowerCase();
  if (/(^|[_-])zb([_-]|$)/.test(id) && !/zero build/i.test(nome)) nome += ' (Zero Build)';
  return nome;
}

/* Solo / Duo / Trio / Squad — o nome nem sempre diz, por isso
   olhamos também para o id, displayId e descrição do evento. */
function modoDoEvento(e) {
  const nome = `${e.id || ''} ${e.displayId || ''} ${e.name_line1 || ''} ${e.name_line2 || ''}`.toLowerCase();
  const desc = String(e.long_description || e.short_description || '').toLowerCase();

  // copas de marca: o nome não diz o modo, mas já sabemos qual é
  if (/hami\s*kuma/.test(nome)) return /mobile/.test(nome) ? 'solo' : 'trio';
  if (/inoxtag/.test(nome)) return /mobile/.test(nome) ? 'solo' : 'duo';
  if (/mobile.*(lan|series)|(lan|series).*mobile/.test(nome)) return 'solo';

  // o nome é a fonte mais fiável
  if (/\b(solo|solos)\b/.test(nome)) return 'solo';
  if (/\b(duo|duos)\b/.test(nome)) return 'duo';
  if (/\b(trio|trios)\b/.test(nome)) return 'trio';
  if (/\b(squad|squads)\b/.test(nome)) return 'squad';

  // descrição oficial (quando o nome não ajuda)
  if (/\b(solo|solos)\b/.test(desc)) return 'solo';
  if (/\bduo up\b|\bduos?\b/.test(desc)) return 'duo';
  if (/\btrios?\b/.test(desc)) return 'trio';
  if (/\bsquads?\b/.test(desc)) return 'squad';

  // Arenas = partidas de 8 jogadores (solo)
  if (/arenas?\b/.test(nome)) return 'solo';
  return 'outro';
}

/* escolhe a janela atual ou a próxima que ainda não terminou */
function janelaDe(e, agora) {
  const lista = (Array.isArray(e.windows) && e.windows.length
    ? e.windows
    : [{ beginTime: e.beginTime, endTime: e.endTime }]
  )
    .filter((w) => w && w.beginTime && w.endTime)
    .map((w) => ({
      id: w.windowId || null,
      inicio: w.beginTime,
      fim: w.endTime,
      tIni: new Date(w.beginTime).getTime(),
      tFim: new Date(w.endTime).getTime(),
    }))
    .filter((w) => Number.isFinite(w.tIni) && Number.isFinite(w.tFim))
    .sort((a, b) => a.tIni - b.tIni);

  if (!lista.length) return null;
  const aoVivo = lista.find((w) => w.tIni <= agora && w.tFim >= agora);
  if (aoVivo) return { ...aoVivo, estado: 'live' };
  const proxima = lista.find((w) => w.tIni > agora);
  if (proxima) return { ...proxima, estado: 'upcoming' };
  return null;
}

function normalizar(lista, agora) {
  const out = [];
  for (const e of Array.isArray(lista) ? lista : []) {
    if (!e || !e.id) continue;
    const janela = janelaDe(e, agora);
    if (!janela) continue;
    const nome = nomeDoEvento(e);
    out.push({
      id: e.id,
      nome,
      modo: modoDoEvento(e),
      regiao: e.region || null,
      estado: janela.estado,
      inicio: janela.inicio,
      fim: janela.fim,
      imagem: e.tileImage || e.poster || e.posterBack || null,
      descricao: limpar(e.short_description || e.long_description || ''),
      link: `https://uefn.fnjpnews.com/tournaments/${encodeURIComponent(e.id)}?region=${encodeURIComponent(e.region || 'EU')}`,
      janela: janela.id,
    });
  }

  const vistos = new Set();
  return out
    .filter((t) => {
      const k = `${t.id}|${t.inicio}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .sort((a, b) => {
      // ao vivo primeiro, depois por hora de início
      if (a.estado !== b.estado) return a.estado === 'live' ? -1 : 1;
      return new Date(a.inicio) - new Date(b.inicio);
    })
    .slice(0, 80);
}

async function pedirLista(alvo, tentativa = 1) {
  try {
    const r = await fetch(`${BASE}?region=${encodeURIComponent(alvo)}&lang=en`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error('fnjpnews ' + r.status);
    const lista = await r.json();
    if (!Array.isArray(lista)) throw new Error('resposta inesperada');
    return lista;
  } catch (e) {
    if (tentativa < 3) {
      await new Promise((ok) => setTimeout(ok, 700 * tentativa));
      return pedirLista(alvo, tentativa + 1);
    }
    throw e;
  }
}

async function listar(regiao = 'EU') {
  const reg = String(regiao || 'EU').toUpperCase();
  const alvo = REGIOES.includes(reg) ? reg : 'EU';

  const hit = cache.get(alvo);
  if (hit && Date.now() - hit.t < TTL) return hit.dados;

  try {
    const lista = await pedirLista(alvo);

    const torneios = normalizar(lista, Date.now());
    const dados = {
      ok: true,
      fonte: 'FNJPNews (calendário oficial da Epic)',
      fonteUrl: 'https://uefn.fnjpnews.com/en/tournaments',
      regiao: alvo,
      regioes: REGIOES,
      atualizadoEm: new Date().toISOString(),
      total: torneios.length,
      torneios,
    };
    cache.set(alvo, { t: Date.now(), dados });
    return dados;
  } catch (e) {
    console.warn('Fortnite torneios:', e.message);
    if (hit) return { ...hit.dados, aviso: e.message };
    return {
      ok: false,
      erro: e.message,
      regiao: alvo,
      regioes: REGIOES,
      torneios: [],
    };
  }
}

module.exports = { listar, normalizar, REGIOES };
