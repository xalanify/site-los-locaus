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

function precoApp(d) {
  if (!d) return null;
  if (d.price_overview) {
    return {
      texto: d.price_overview.final_formatted,
      original: d.price_overview.initial_formatted || null,
      desconto: Number(d.price_overview.discount_percent) || 0,
      gratis: false,
    };
  }
  if (d.is_free) return { texto: 'Grátis', original: null, desconto: 0, gratis: true };
  if (d.release_date && d.release_date.coming_soon) {
    return { texto: 'Em breve', original: null, desconto: 0, gratis: false };
  }
  return { texto: 'Sem preço na Steam', original: null, desconto: 0, gratis: false };
}

async function infoApp(appid) {
  const id = Number(appid);
  if (!id) return null;
  const chave = `app:${id}`;
  const hit = ler(chave);
  if (hit) return hit;
  try {
    const r = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${id}&cc=${CC}&l=${L}`,
      { headers: { 'User-Agent': UA }, timeout: 20000 },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const d = j && j[id] && j[id].success ? j[id].data : null;
    if (d) guardar(chave, d, TTL_JOGO);
    return d;
  } catch {
    return null;
  }
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
    const desconto = Number((bloco.match(/data-discount="(\d+)"/) || [])[1]) || 0;
    const precoFinal = limpar(
      (bloco.match(/discount_final_price[^>]*>([^<]+)/) || [])[1],
    );
    const precoOriginal = limpar(
      (bloco.match(/discount_original_price[^>]*>([^<]+)/) || [])[1],
    );
    const precoTxt = limpar(
      (bloco.match(/class="search_price(?!_)[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1],
    );
    let preco = normalizarPreco(precoFinal || precoTxt);
    if (preco && desconto > 0) {
      preco = { ...preco, original: precoOriginal || preco.original || null, desconto };
    }
    out.push({
      appid,
      nome,
      imagem,
      imagemFallback: capsule,
      lancamento: lancamento || null,
      preco,
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
  const jogos = (await pesquisa({ filter: 'popularcomingsoon' })).map((j) => ({
    ...j,
    emBreve: true,
  }));
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
  const base = Object.values(lista || {})
    .map((g) => ({
      appid: Number(g.appid),
      nome: g.name,
      ccu: Number(g.ccu) || 0,
      precoSpy: Number(g.price) || 0,
    }))
    .filter((g) => g.appid && g.nome)
    .sort((a, b) => b.ccu - a.ccu)
    .slice(0, 10);

  // Ficha real na Steam: nome, preço e imagem corretos (o SteamSpy
  // às vezes tem nomes/preços desatualizados).
  const jogos = await Promise.all(
    base.map(async (g) => {
      const d = await infoApp(g.appid);
      let nome = (d && d.name) || g.nome;
      let imagem =
        (d && d.header_image) ||
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`;
      let preco = precoApp(d);
      let desconto = (preco && preco.desconto) || 0;

      // GTA V Legacy não é grátis: vem incluído no GTA V Enhanced.
      if (g.appid === 271590) {
        nome = 'Grand Theft Auto V Legacy';
        preco = { texto: 'Incluído no GTA V Enhanced', original: null, desconto: 0, gratis: false };
        desconto = 0;
      }
      // Call of Duty HQ (Warzone + MW) — mostrar só "Call of Duty"
      // com a imagem do MW4, como o utilizador pediu.
      if (g.appid === 1938090) {
        nome = 'Call of Duty';
        const mw4 = await infoApp(4435490);
        if (mw4 && mw4.header_image) imagem = mw4.header_image;
        preco = { texto: 'Grátis', original: null, desconto: 0, gratis: true };
        desconto = 0;
      }

      return {
        appid: g.appid,
        nome,
        ccu: g.ccu,
        preco: (preco && preco.texto) || (g.precoSpy > 0 ? precoDeCentavos(g.precoSpy) : 'Ver na Steam'),
        desconto,
        imagem,
        url: `https://store.steampowered.com/app/${g.appid}`,
      };
    }),
  );

  const dados = { ok: true, atualizadoEm: new Date().toISOString(), jogos };
  guardar(chave, dados);
  return dados;
}

/* ---------- mais comprados (top sellers da Steam) ---------- */
async function maisComprados() {
  const chave = 'mais-comprados';
  const hit = ler(chave);
  if (hit) return hit;
  const r = await fetch(
    `https://store.steampowered.com/api/featuredcategories?cc=${CC}&l=${L}`,
    { headers: { 'User-Agent': UA }, timeout: 20000 },
  );
  if (!r.ok) throw new Error('steam featured ' + r.status);
  const j = await r.json();
  const itens = (j && j.top_sellers && j.top_sellers.items) || [];
  const jogos = itens.slice(0, 12).map((g) => ({
    appid: Number(g.id),
    nome: g.name,
    imagem: g.header_image || g.large_capsule_image || null,
    lancamento: null,
    preco: {
      texto:
        Number(g.final_price) > 0
          ? `€ ${(Number(g.final_price) / 100).toFixed(2).replace('.', ',')}`
          : 'Grátis',
      original:
        Number(g.original_price) > 0
          ? `€ ${(Number(g.original_price) / 100).toFixed(2).replace('.', ',')}`
          : null,
      desconto: Number(g.discount_percent) || 0,
      gratis: Number(g.final_price) === 0,
      valor: Number(g.final_price) > 0 ? Number(g.final_price) / 100 : 0,
    },
    url: `https://store.steampowered.com/app/${g.id}`,
  }));
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

async function procurar({ q, genero, maxpreco, ordenar, pagina }) {
  const termo = String(q || '').trim().slice(0, 80);
  const pag = Math.max(1, Number(pagina) || 1);
  const porPagina = 25;
  const chave = `procurar:${termo}|${genero || ''}|${maxpreco || ''}|${ordenar || ''}|${pag}`;
  const hit = ler(chave);
  if (hit) return hit;

  const params = {
    term: termo,
    sort_by: ORDENAR[ordenar] || '',
    count: String(porPagina),
    start: String((pag - 1) * porPagina),
  };
  if (genero && GENEROS[genero]) params.category1 = String(GENEROS[genero]);
  if (String(maxpreco) === '0') params.maxprice = 'free';
  else if (Number(maxpreco) > 0) params.maxprice = String(Number(maxpreco));

  const r = await fetch(
    `https://store.steampowered.com/search/results/?${new URLSearchParams({
      query: '',
      cc: CC,
      l: L,
      infinite: '1',
      ...params,
    })}`,
    { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8' }, timeout: 20000 },
  );
  if (!r.ok) throw new Error('steam search ' + r.status);
  const bruto = await r.json();
  const jogos = parseResultados(bruto.results_html);

  const total = Number(bruto.total_count) || jogos.length;

  const dados = {
    ok: true,
    atualizadoEm: new Date().toISOString(),
    jogos,
    total,
    pagina: pag,
    porPagina,
    paginas: Math.max(1, Math.ceil(total / porPagina)),
  };
  guardar(chave, dados);
  return dados;
}

/* ---------- ficha do jogo ---------- */
function linksDaLoja(nome, appid) {
  const q = encodeURIComponent(nome);
  return [
    { nome: 'Steam', tipo: 'Loja oficial', url: `https://store.steampowered.com/app/${appid}` },
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

  let preco = precoApp(d) || { texto: 'Sem preço na Steam', original: null, desconto: 0, gratis: false };
  if (id === 271590) {
    preco = { texto: 'Incluído no GTA V Enhanced', original: null, desconto: 0, gratis: false };
  }
  if (id === 1938090) {
    preco = { texto: 'Grátis', original: null, desconto: 0, gratis: true };
    d.name = 'Call of Duty';
  }

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
      links: preco.gratis
        ? [
            {
              nome: 'Steam',
              tipo: 'Loja oficial',
              url: `https://store.steampowered.com/app/${id}`,
            },
          ]
        : linksDaLoja(d.name, id),
    },
  };
  guardar(chave, dados, TTL_JOGO);
  return dados;
}

module.exports = { emBreve, maisJogados, maisComprados, procurar, jogo };
