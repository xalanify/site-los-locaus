/* ============================================================
   Steam Store — catálogo de jogos (legal)
   ------------------------------------------------------------
   - Em breve: pesquisa "comingsoon" da Steam
   - Mais jogados: SteamSpy (top100in2weeks, ordenado por CCU)
   - Procurar: pesquisa da Steam com filtros
   - Ficha: appdetails (preço, descrição, ecrãs, etc.)
   Cache em memória para não abusar da Steam.
   ============================================================ */
const fetch = require('node-fetch');

const CC = 'PT';
const L = 'portuguese';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

const cache = new Map();
const TTL = 10 * 60 * 1000;
const TTL_JOGO = 30 * 60 * 1000;

function guardar(chave, dados, ttl = TTL) {
  cache.set(chave, { t: Date.now(), ttl, dados });
}
function ler(chave) {
  const hit = cache.get(chave);
  if (!hit) return null;
  if (Date.now() - hit.t > hit.ttl) {
    cache.delete(chave);
    return null;
  }
  return hit.dados;
}

const limpar = (s) =>
  String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

function normalizarPreco(txt) {
  const s = limpar(txt);
  if (!s) return null;
  if (/gr[áa]tis|free/i.test(s)) return { texto: 'Grátis', gratis: true, valor: 0 };
  const m = s.replace(/\./g, '').match(/(\d+(?:[.,]\d{2})?)/);
  const valor = m ? Number(m[1].replace(',', '.')) : null;
  return { texto: s, gratis: false, valor: Number.isFinite(valor) ? valor : null };
}

function precoDeCentavos(cents) {
  const n = Number(cents) || 0;
  if (!n) return null;
  return `€ ${(n / 100).toFixed(2).replace('.', ',')}`;
}

/* ---------- pesquisa HTML da Steam ---------- */
function parseResultados(html) {
  const out = [];
  const blocos = [...String(html || '').matchAll(/<a[^>]*data-ds-appid="(\d+)"[^>]*>([\s\S]*?)<\/a>/g)];
  for (const b of blocos) {
    const appid = Number(b[1]);
    const bloco = b[2];
    const nome = limpar((bloco.match(/class="title"[^>]*>([\s\S]*?)<\/span>/) || [])[1]);
    if (!appid || !nome) continue;
    const capsule = (bloco.match(/search_capsule[^>]*>\s*<img[^>]*src="([^"]+)"/) || [])[1] || null;
    const imagem = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
    const lancamento = limpar(
      (bloco.match(/search_released[^>]*>([\s\S]*?)<\/div>/) || [])[1],
    );
    const precoTxt = limpar(
      (bloco.match(/class="search_price[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1],
    );
    out.push({
      appid,
      nome,
      imagem,
      imagemFallback: capsule,
      lancamento: lancamento || null,
      preco: normalizarPreco(precoTxt),
      url: `https://store.steampowered.com/app/${appid}`,
    });
  }
  return out;
}

async function pesquisa(params) {
  const qs = new URLSearchParams({
    query: '',
    start: '0',
    count: '24',
    cc: CC,
    l: L,
    infinite: '1',
    ...params,
  });
  const r = await fetch(`https://store.steampowered.com/search/results/?${qs}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8' },
    timeout: 20000,
  });
  if (!r.ok) throw new Error('steam search ' + r.status);
  const j = await r.json();
  return parseResultados(j.results_html);
}

async function emBreve() {
  const chave = 'em-breve';
  const hit = ler(chave);
  if (hit) return hit;
  const jogos = await pesquisa({ filter: 'popularcomingsoon' });
  const dados = { ok: true, atualizadoEm: new Date().toISOString(), jogos };
  guardar(chave, dados);
  return dados;
}

/* ---------- mais jogados (SteamSpy) ---------- */
async function maisJogados() {
  const chave = 'top';
  const hit = ler(chave);
  if (hit) return hit;

  const r = await fetch('https://steamspy.com/api.php?request=top100in2weeks', {
    headers: { 'User-Agent': UA },
    timeout: 20000,
  });
  if (!r.ok) throw new Error('steamspy ' + r.status);
  const lista = await r.json();
  const jogos = Object.values(lista || {})
    .map((g) => ({
      appid: Number(g.appid),
      nome: g.name,
      ccu: Number(g.ccu) || 0,
      preco: Number(g.price) > 0 ? precoDeCentavos(g.price) : 'Grátis',
      imagem: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
      url: `https://store.steampowered.com/app/${g.appid}`,
    }))
    .filter((g) => g.appid && g.nome)
    .sort((a, b) => b.ccu - a.ccu)
    .slice(0, 10);

  const dados = { ok: true, atualizadoEm: new Date().toISOString(), jogos };
  guardar(chave, dados);
  return dados;
}

/* ---------- pesquisa com filtros ---------- */
const GENEROS = {
  acao: 998,
  aventura: 599,
  estrategia: 9,
  rpg: 492,
  simulacao: 113,
  indie: 37,
  corrida: 699,
  desporto: 251,
};

const ORDENAR = {
  relevancia: '',
  lancamento: 'Released_DESC',
  preco_asc: 'Price_ASC',
  preco_desc: 'Price_DESC',
  avaliacao: 'Reviews_DESC',
  nome: 'Name_ASC',
};

async function procurar({ q, genero, maxpreco, ordenar }) {
  const termo = String(q || '').trim().slice(0, 80);
  const chave = `procurar:${termo}|${genero || ''}|${maxpreco || ''}|${ordenar || ''}`;
  const hit = ler(chave);
  if (hit) return hit;

  const params = {
    term: termo,
    sort_by: ORDENAR[ordenar] || '',
    count: maxpreco ? '40' : '24',
  };
  if (genero && GENEROS[genero]) params.category1 = String(GENEROS[genero]);

  let jogos = await pesquisa(params);
  const limite = (Number(maxpreco) || 0) / 100;
  if (limite > 0) {
    jogos = jogos.filter((j) => {
      const v = j.preco && j.preco.valor;
      return j.preco && (j.preco.gratis || (v != null && v <= limite));
    });
  }
  const dados = { ok: true, atualizadoEm: new Date().toISOString(), jogos };
  guardar(chave, dados);
  return dados;
}

/* ---------- ficha do jogo ---------- */
function linksDaLoja(nome) {
  const q = encodeURIComponent(nome);
  return [
    { nome: 'Steam', tipo: 'Loja oficial', url: `https://store.steampowered.com/search/?term=${q}` },
    { nome: 'Epic Games', tipo: 'Loja oficial', url: `https://store.epicgames.com/pt-PT/search?q=${q}` },
    { nome: 'GOG', tipo: 'Loja oficial', url: `https://www.gog.com/en/games?query=${q}` },
    { nome: 'Microsoft Store', tipo: 'Chave / loja', url: `https://www.microsoft.com/pt-pt/search?q=${q}` },
    { nome: 'Fanatical', tipo: 'Chave Steam', url: `https://www.fanatical.com/en/search?search=${q}` },
    { nome: 'Green Man Gaming', tipo: 'Chave Steam', url: `https://www.greenmangaming.com/search/${q}` },
    { nome: 'Humble Store', tipo: 'Chave Steam', url: `https://www.humblebundle.com/store/search?search=${q}` },
    { nome: 'Instant Gaming', tipo: 'Chave Steam', url: `https://www.instant-gaming.com/en/search/?q=${q}` },
    { nome: 'Eneba', tipo: 'Chave Steam', url: `https://www.eneba.com/store/all?text=${q}` },
  ];
}

async function jogo(appid) {
  const id = Number(appid);
  if (!id) throw new Error('AppID inválido');
  const chave = `jogo:${id}`;
  const hit = ler(chave);
  if (hit) return hit;

  const r = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${id}&cc=${CC}&l=${L}`,
    { headers: { 'User-Agent': UA }, timeout: 20000 },
  );
  if (!r.ok) throw new Error('steam appdetails ' + r.status);
  const j = await r.json();
  const d = j && j[id] && j[id].success ? j[id].data : null;
  if (!d) throw new Error('Jogo não encontrado');

  const preco = d.price_overview
    ? {
        texto: d.price_overview.final_formatted,
        original: d.price_overview.initial_formatted || null,
        desconto: Number(d.price_overview.discount_percent) || 0,
        gratis: false,
      }
    : d.is_free
      ? { texto: 'Grátis', original: null, desconto: 0, gratis: true }
      : { texto: 'Em breve / sem preço', original: null, desconto: 0, gratis: false };

  const dados = {
    ok: true,
    jogo: {
      appid: id,
      nome: d.name,
      imagem: d.header_image || null,
      imagens: (d.screenshots || []).slice(0, 6).map((s) => s.path_full),
      descricao: limpar(d.short_description || d.about_the_game || ''),
      descricaoLonga: limpar(d.detailed_description || '').slice(0, 4000),
      desenvolvedor: (d.developers || []).join(', ') || null,
      editor: (d.publishers || []).join(', ') || null,
      generos: (d.genres || []).map((g) => g.description),
      lancamento: d.release_date ? d.release_date.date : null,
      emBreve: Boolean(d.release_date && d.release_date.coming_soon),
      preco,
      url: `https://store.steampowered.com/app/${id}`,
      links: linksDaLoja(d.name),
    },
  };
  guardar(chave, dados, TTL_JOGO);
  return dados;
}

module.exports = { emBreve, maisJogados, procurar, jogo };
