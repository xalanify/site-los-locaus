/* ============================================================
   PREÇOS DE JOGOS — IsThereAnyDeal + CheapShark
   ------------------------------------------------------------
   O ITAD precisa de chave oficial (ITAD_API_KEY). Quando existe,
   usamos a API v3. Sem chave, usamos o CheapShark (gratuito e
   sem chave) e deixamos sempre o link para o ITAD.
   ============================================================ */
const UA = 'LocausSite/1.0 (https://www.locaus.fun; contacto@locaus.fun)';
const TTL = 30 * 60 * 1000;
const cache = new Map();

const limpar = (s) => String(s || '').replace(/\s+/g, ' ').trim();

async function json(url, opcoes = {}) {
  const r = await fetch(url, {
    ...opcoes,
    headers: { 'User-Agent': UA, Accept: 'application/json', ...(opcoes.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

/* ---------------- ITAD oficial (se houver chave) ---------------- */
async function itad(titulo) {
  const key = process.env.ITAD_API_KEY;
  if (!key) return null;
  const busca = await json(
    `https://api.isthereanydeal.com/games/search/v1?title=${encodeURIComponent(titulo)}&results=5&key=${encodeURIComponent(key)}`,
  );
  const jogo = Array.isArray(busca) ? busca[0] : null;
  if (!jogo || !jogo.id) return null;

  const precos = await json(
    `https://api.isthereanydeal.com/games/prices/v3?key=${encodeURIComponent(key)}&country=PT`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([jogo.id]),
    },
  );
  const bloco = Array.isArray(precos) ? precos[0] : null;
  const deals = ((bloco && bloco.deals) || [])
    .filter((d) => d && d.price && d.shop)
    .map((d) => ({
      loja: d.shop.name,
      preco: Number(d.price.amount) || 0,
      precoOriginal: Number(d.regular && d.regular.amount) || 0,
      desconto: Number(d.cut) || 0,
      url: d.url || null,
    }))
    .filter((d) => d.preco > 0)
    .sort((a, b) => a.preco - b.preco)
    .slice(0, 8);

  if (!deals.length) return null;
  return {
    fonte: 'IsThereAnyDeal',
    jogo: jogo.title || titulo,
    link: `https://isthereanydeal.com/game/${encodeURIComponent(jogo.slug || '')}/info/`,
    historico: bloco && bloco.historyLow ? Number(bloco.historyLow.amount) || null : null,
    deals,
  };
}

/* ---------------- CheapShark (fallback sem chave) ---------------- */
let lojasCache = { t: 0, mapa: new Map() };
async function nomesLojas() {
  if (Date.now() - lojasCache.t < 6 * 60 * 60 * 1000 && lojasCache.mapa.size) {
    return lojasCache.mapa;
  }
  const lista = await json('https://www.cheapshark.com/api/1.0/stores');
  const mapa = new Map((lista || []).map((s) => [String(s.storeID), s.storeName]));
  lojasCache = { t: Date.now(), mapa };
  return mapa;
}

async function cheapshark(titulo) {
  const busca = await json(
    `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(titulo)}&limit=6`,
  );
  const lista = Array.isArray(busca) ? busca : [];
  if (!lista.length) return null;

  const alvo = limpar(titulo).toLowerCase();
  const jogo =
    lista.find((x) => limpar(x.external).toLowerCase() === alvo) ||
    lista.find((x) => limpar(x.external).toLowerCase().startsWith(alvo)) ||
    lista[0];

  const detalhe = await json(
    `https://www.cheapshark.com/api/1.0/games?id=${encodeURIComponent(jogo.gameID)}`,
  );
  const nomes = await nomesLojas().catch(() => new Map());
  const deals = ((detalhe && detalhe.deals) || [])
    .map((d) => {
      const preco = Number(d.price) || 0;
      const original = Number(d.retailPrice) || 0;
      return {
        loja: nomes.get(String(d.storeID)) || `Loja ${d.storeID}`,
        preco,
        precoOriginal: original,
        desconto: Math.round(Number(d.savings) || 0),
        url: d.dealID
          ? `https://www.cheapshark.com/redirect?dealID=${d.dealID}`
          : null,
      };
    })
    .filter((d) => d.preco > 0)
    .sort((a, b) => a.preco - b.preco)
    .slice(0, 8);

  if (!deals.length) return null;
  return {
    fonte: 'CheapShark',
    jogo: jogo.external || titulo,
    link: `https://isthereanydeal.com/search/?q=${encodeURIComponent(titulo)}`,
    historico:
      detalhe && detalhe.cheapestPriceEver
        ? Number(detalhe.cheapestPriceEver.price) || null
        : null,
    deals,
  };
}

async function precos(titulo) {
  const termo = limpar(titulo).slice(0, 120);
  if (termo.length < 2) return { ok: false, deals: [], error: 'Falta o nome do jogo.' };
  const chave = termo.toLowerCase();
  const guardado = cache.get(chave);
  if (guardado) {
    const ttl = guardado.vazio ? 5 * 60 * 1000 : TTL;
    if (Date.now() - guardado.t < ttl) return guardado.dados;
  }

  let dados = null;
  try {
    dados = await itad(termo);
  } catch {
    dados = null;
  }
  if (!dados) {
    try {
      dados = await cheapshark(termo);
    } catch {
      dados = null;
    }
  }

  const resposta = dados
    ? { ok: true, ...dados }
    : {
        ok: true,
        fonte: 'IsThereAnyDeal',
        jogo: termo,
        link: `https://isthereanydeal.com/search/?q=${encodeURIComponent(termo)}`,
        deals: [],
        aviso: 'Sem preços agora — abre o IsThereAnyDeal para veres todas as lojas.',
      };

  cache.set(chave, { t: Date.now(), dados: resposta, vazio: !resposta.deals.length });
  if (cache.size > 200) {
    const primeira = cache.keys().next().value;
    cache.delete(primeira);
  }
  return resposta;
}

module.exports = { precos };
