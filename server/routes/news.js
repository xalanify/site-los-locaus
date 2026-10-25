const express = require('express');

const router = express.Router();

/* ============================================================
   Notícias de gaming — lidas dos feeds RSS oficiais dos sites
   (Eurogamer Portugal + PC Gamer / hardware). Cache de 10 min.
   ============================================================ */

const FEEDS = [
  {
    id: 'eurogamer-pt',
    fonte: 'Eurogamer Portugal',
    url: 'https://www.eurogamer.pt/feed',
    lingua: 'pt',
    prioridade: 0,
  },
  {
    id: 'pcgamer-hw',
    fonte: 'PC Gamer',
    url: 'https://www.pcgamer.com/rss/tag/graphics-card/',
    lingua: 'en',
    prioridade: 1,
  },
  {
    id: 'pcgamer',
    fonte: 'PC Gamer',
    url: 'https://www.pcgamer.com/rss/',
    lingua: 'en',
    prioridade: 2,
  },
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CACHE_MS = 10 * 60 * 1000;
let cache = { t: 0, dados: null };

function limparHtml(s) {
  return String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodificar(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&hellip;/gi, '…')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');
}

function tag(bloco, nome) {
  const m = bloco.match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`, 'i'));
  return m ? decodificar(m[1]).trim() : '';
}

function imagemDe(bloco, html) {
  const media = bloco.match(/<media:content[^>]*url=["']([^"']+)["']/i);
  if (media) return decodificar(media[1]);
  const enc = bloco.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
  if (enc) return decodificar(enc[1]);
  const img = String(html || '').match(/<img[^>]*src=["']([^"']+)["']/i);
  if (img) return decodificar(img[1]);
  return '';
}

function lerFeed(xml, feed) {
  const blocos = String(xml || '').split(/<item[\s>]/i).slice(1);
  return blocos
    .map((b) => {
      const titulo = limparHtml(tag(b, 'title'));
      const link = tag(b, 'link') || (b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] || '';
      const dataTxt = tag(b, 'pubDate') || tag(b, 'dc:date');
      const corpo = tag(b, 'content:encoded') || tag(b, 'dc:content') || tag(b, 'description');
      const imagem = imagemDe(b, corpo);
      const resumo = limparHtml(corpo).slice(0, 230);
      const categorias = [...b.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)]
        .map((m) => limparHtml(decodificar(m[1])))
        .filter(Boolean)
        .slice(0, 3);
      const data = new Date(dataTxt);
      if (!titulo || !link) return null;
      return {
        id: `${feed.id}:${link}`,
        titulo,
        link: String(link).trim(),
        imagem,
        resumo,
        fonte: feed.fonte,
        lingua: feed.lingua,
        prioridade: feed.prioridade || 0,
        categorias,
        data: Number.isNaN(data.getTime()) ? new Date().toISOString() : data.toISOString(),
      };
    })
    .filter(Boolean);
}

async function carregar() {
  const resultados = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const r = await fetch(feed.url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/rss+xml,application/xml,text/xml,*/*',
          'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`${feed.id} ${r.status}`);
      return lerFeed(await r.text(), feed);
    }),
  );

  const vistos = new Set();
  const noticias = [];
  for (const r of resultados) {
    if (r.status !== 'fulfilled') continue;
    for (const n of r.value) {
      const chave = n.link.replace(/[?#].*$/, '');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      noticias.push(n);
    }
  }
  noticias.sort(
    (a, b) => (a.prioridade || 0) - (b.prioridade || 0) || new Date(b.data) - new Date(a.data),
  );
  return noticias.slice(0, 60);
}

router.get('/', async (req, res) => {
  try {
    const agora = Date.now();
    if (cache.dados && agora - cache.t < CACHE_MS) {
      return res.json({ ok: true, atualizadoEm: new Date(cache.t).toISOString(), noticias: cache.dados });
    }
    const noticias = await carregar();
    if (noticias.length) cache = { t: agora, dados: noticias };
    res.json({
      ok: true,
      atualizadoEm: new Date(cache.t || agora).toISOString(),
      noticias: noticias.length ? noticias : cache.dados || [],
    });
  } catch (e) {
    console.error('Erro noticias:', e.message);
    res.status(502).json({ ok: false, error: 'Sem ligação às notícias.', noticias: cache.dados || [] });
  }
});

module.exports = { newsRouter: router };
