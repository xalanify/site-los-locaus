const express = require('express');
const notify = require('../notify');

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
    prioridade: 1,
  },
  {
    id: 'ign',
    fonte: 'IGN',
    url: 'https://feeds.ign.com/ign/all',
    lingua: 'en',
    prioridade: 1,
  },
  {
    id: 'vgc',
    fonte: 'VGC',
    url: 'https://www.videogameschronicle.com/feed/',
    lingua: 'en',
    prioridade: 1,
  },
  {
    id: 'dexerto',
    fonte: 'Dexerto',
    url: 'https://www.dexerto.com/feed/',
    lingua: 'en',
    prioridade: 1,
  },
  {
    id: 'gamesradar',
    fonte: 'GamesRadar',
    url: 'https://www.gamesradar.com/rss/',
    lingua: 'en',
    prioridade: 1,
  },
  {
    id: 'pcgamer',
    fonte: 'PC Gamer',
    url: 'https://www.pcgamer.com/rss/',
    lingua: 'en',
    prioridade: 1,
  },
  {
    id: 'rockstar-google',
    fonte: 'Rockstar Newswire',
    url: 'https://news.google.com/rss/search?q=site%3Arockstargames.com%2Fnewswire&hl=en-US&gl=US&ceid=US:en',
    lingua: 'en',
    prioridade: 4,
  },
  {
    id: 'amd-google',
    fonte: 'AMD Newsroom',
    url: 'https://news.google.com/rss/search?q=site%3Aamd.com%2Fen%2Fnewsroom&hl=en-US&gl=US&ceid=US:en',
    lingua: 'en',
    prioridade: 4,
  },
  {
    id: 'cod-google',
    fonte: 'Call of Duty · oficial',
    url: 'https://news.google.com/rss/search?q=site%3Acallofduty.com&hl=en-US&gl=US&ceid=US:en',
    lingua: 'en',
    prioridade: 4,
  },
  {
    id: 'cod-rumores',
    fonte: 'Call of Duty · rumores',
    url: 'https://news.google.com/rss/search?q=Call+of+Duty+leak+OR+rumor&hl=en-US&gl=US&ceid=US:en',
    lingua: 'en',
    prioridade: 3,
  },
  {
    id: 'bf-google',
    fonte: 'Battlefield · oficial',
    url: 'https://news.google.com/rss/search?q=site%3Aea.com%2Fgames%2Fbattlefield&hl=en-US&gl=US&ceid=US:en',
    lingua: 'en',
    prioridade: 4,
  },
  {
    id: 'bf-rumores',
    fonte: 'Battlefield · rumores',
    url: 'https://news.google.com/rss/search?q=Battlefield+leak+OR+rumor&hl=en-US&gl=US&ceid=US:en',
    lingua: 'en',
    prioridade: 3,
  },
  {
    id: 'gta-rumores',
    fonte: 'Rockstar / GTA · rumores',
    url: 'https://news.google.com/rss/search?q=GTA+6+OR+Rockstar+leak+OR+rumor&hl=en-US&gl=US&ceid=US:en',
    lingua: 'en',
    prioridade: 3,
  },
  {
    id: 'jailbreak-google',
    fonte: 'PS4/PS5 · jailbreak',
    url: 'https://news.google.com/rss/search?q=PS4+OR+PS5+jailbreak+OR+exploit&hl=en-US&gl=US&ceid=US:en',
    lingua: 'en',
    prioridade: 3,
  },
  {
    id: 'gamesradar-cod',
    fonte: 'GamesRadar · Call of Duty',
    url: 'https://www.gamesradar.com/feeds/tag/call-of-duty/',
    lingua: 'en',
    prioridade: 0,
  },
  {
    id: 'gamesradar-gta',
    fonte: 'GamesRadar · GTA',
    url: 'https://www.gamesradar.com/feeds/tag/grand-theft-auto/',
    lingua: 'en',
    prioridade: 0,
  },
  {
    id: 'gamesradar-rockstar',
    fonte: 'GamesRadar · Rockstar',
    url: 'https://www.gamesradar.com/feeds/tag/rockstar/',
    lingua: 'en',
    prioridade: 0,
  },
  {
    id: 'gamesradar-amd',
    fonte: 'GamesRadar · AMD',
    url: 'https://www.gamesradar.com/feeds/tag/amd/',
    lingua: 'en',
    prioridade: 0,
  },
  {
    id: 'gamesradar-nvidia',
    fonte: 'GamesRadar · NVIDIA',
    url: 'https://www.gamesradar.com/feeds/tag/nvidia/',
    lingua: 'en',
    prioridade: 0,
  },
  {
    id: 'pcgamer-amd',
    fonte: 'PC Gamer · AMD',
    url: 'https://www.pcgamer.com/rss/tag/amd/',
    lingua: 'en',
    prioridade: 0,
  },
  {
    id: 'pcgamer-nvidia',
    fonte: 'PC Gamer · NVIDIA',
    url: 'https://www.pcgamer.com/rss/tag/nvidia/',
    lingua: 'en',
    prioridade: 0,
  },
  {
    id: 'nvidia',
    fonte: 'NVIDIA',
    url: 'https://nvidianews.nvidia.com/releases.xml',
    lingua: 'en',
    prioridade: 3,
  },
  {
    id: 'wololo',
    fonte: 'Wololo.net · Jailbreak',
    url: 'https://wololo.net/feed/',
    lingua: 'en',
    prioridade: 2,
  },
  {
    id: 'tomshardware',
    fonte: "Tom's Hardware",
    url: 'https://www.tomshardware.com/feeds/all',
    lingua: 'en',
    prioridade: 3,
  },
  {
    id: 'techpowerup',
    fonte: 'TechPowerUp',
    url: 'https://www.techpowerup.com/rss/news',
    lingua: 'en',
    prioridade: 3,
  },
  {
    id: 'pplware',
    fonte: 'Pplware',
    url: 'https://pplware.sapo.pt/feed/',
    lingua: 'pt',
    prioridade: 3,
  },
];

/* Temas aceites: Call of Duty, Rockstar/GTA, NVIDIA, AMD/placas gráficas,
   processadores/memórias e desbloqueios de PS4/PS5. */
const TEMAS =
  /call of duty|warzone|\bcod\b|modern warfare|black ops|battlefield|\bdice\b|rockstar|grand theft auto|\bgta\b|red dead|nvidia|geforce|\brtx\b|\bgtx\b|\bamd\b|radeon|ryzen|placa gr[áa]fica|gr[áa]fica|\bgpu\b|processador|\bcpu\b|mem[oó]ria|\bram\b|ddr[45]/i;

const JAILBREAK = /jailbreak|unlock|desbloque|\bcfw\b|\bhen\b/i;
const PS = /ps4|ps5|playstation/i;

function temaAceite(titulo) {
  const t = String(titulo || '');
  if (JAILBREAK.test(t)) return PS.test(t);
  return TEMAS.test(t);
}

const GRANDES =
  /call of duty|warzone|\bcod\b|modern warfare|black ops|rockstar|grand theft auto|\bgta\b|red dead|nvidia|geforce|\brtx\b|\bgtx\b|\bamd\b|radeon|ryzen/i;

/* Fora do tema: notícias de IA/segurança que só falam de CPU/cache por acaso. */
const NAO_TEMA =
  /openai|intelig[eê]ncia artificial|red team|sandbox|microvm|malware|ransomware|phishing|vulnerab|exploit|hackead|hacked|laptop|notebook|portatil|roubo de dados|conta hackeada/i;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CACHE_MS = 60 * 60 * 1000;
let cache = { t: 0, dados: null };
const TRAD_CACHE = new Map();

/* Tradução para português (Google Translate público, sem chave).
   Cache em memória para não repetir pedidos a cada atualização. */
async function traduzirLote(textos) {
  const unicos = [...new Set(textos.filter(Boolean))];
  const falta = unicos.filter((t) => !TRAD_CACHE.has(t));
  for (let i = 0; i < falta.length; i += 8) {
    const grupo = falta.slice(i, i + 8);
    try {
      const r = await fetch('https://translate.googleapis.com/translate_a/single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': UA,
        },
        body: new URLSearchParams({
          client: 'gtx',
          sl: 'auto',
          tl: 'pt',
          dt: 't',
          q: grupo.map((t) => String(t).replace(/\s+/g, ' ').trim()).join('\n'),
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw new Error('translate ' + r.status);
      const j = await r.json();
      const bruto = (Array.isArray(j) && Array.isArray(j[0]) ? j[0] : [])
        .map((seg) => (seg && seg[0]) || '')
        .join('');
      const partes = bruto.split('\n');
      if (partes.length === grupo.length) {
        grupo.forEach((original, idx) => {
          const t = String(partes[idx] || '').trim();
          if (t) TRAD_CACHE.set(original, t);
        });
      }
    } catch (e) {
      console.warn('Tradução falhou:', e.message);
    }
  }
  return textos.map((t) => TRAD_CACHE.get(t) || t);
}

async function traduzirNoticias(noticias) {
  const alvo = noticias.filter((n) => n.lingua !== 'pt');
  if (!alvo.length) return noticias;
  const textos = [];
  for (const n of alvo) {
    textos.push(n.titulo);
    if (n.resumo) textos.push(n.resumo);
  }
  const trad = await traduzirLote(textos);
  let i = 0;
  for (const n of alvo) {
    n.titulo = trad[i++] || n.titulo;
    if (n.resumo) n.resumo = trad[i++] || n.resumo;
  }
  return noticias;
}

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

/* Imagem de recurso quando o feed não traz nenhuma — garante que
   todos os cartões têm sempre uma imagem. */
function imagemFallback(titulo, fonte) {
  const t = `${titulo || ''} ${fonte || ''}`.toLowerCase();
  if (/gta|rockstar|red dead/.test(t)) return '/noticias/gta.svg';
  if (/call of duty|warzone|modern warfare|black ops|\bcod\b/.test(t)) return '/noticias/cod.svg';
  if (/battlefield|\bdice\b/.test(t)) return '/bf1.jpg';
  if (/rainbow six|\br6\b|siege/.test(t)) return '/skyr6.jpg';
  if (/fortnite/.test(t)) return '/fortnite.jpg';
  if (/nvidia|geforce|\brtx\b|dlss/.test(t)) return '/noticias/nvidia.svg';
  if (/\bamd\b|radeon|ryzen|fsr/.test(t)) return '/noticias/amd.svg';
  if (/jailbreak|ps4|ps5|playstation|cfw|\bhen\b/.test(t)) return '/noticias/playstation.svg';
  if (/cpu|gpu|processador|placa gr|mem[oó]ria|\bram\b|ssd|hardware/.test(t)) return '/noticias/hardware.svg';
  return '/noticias/gaming.svg';
}

function imagemDe(bloco, html) {  const media = bloco.match(/<media:content[^>]*url=["']([^"']+)["']/i);
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
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) throw new Error(`${feed.id} ${r.status}`);
      let itens = lerFeed(await r.text(), feed);
      itens = itens.filter((n) => temaAceite(n.titulo) && !NAO_TEMA.test(n.titulo));
      const cap = feed.prioridade === 0 ? 5 : feed.prioridade === 1 ? 5 : 4;
      return itens.slice(0, cap);
    }),
  );
  for (const r of resultados) {
    if (r.status === 'rejected') console.warn('Notícias feed falhou:', r.reason && r.reason.message);
  }

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
    (a, b) => new Date(b.data) - new Date(a.data) || (a.prioridade || 0) - (b.prioridade || 0),
  );
  const selecionadas = noticias.slice(0, 80);
  await traduzirNoticias(selecionadas);
  for (const n of selecionadas) {
    if (!n.imagem) n.imagem = imagemFallback(n.titulo, n.fonte);
  }
  // avisa no Windows/PWA só das duas mais recentes (uma vez por notícia)
  notify.notificarNoticias(selecionadas.slice(0, 2)).catch(() => {});
  return selecionadas;
}

async function obterNoticias() {
  const agora = Date.now();
  if (cache.dados && agora - cache.t < CACHE_MS) return cache.dados;
  const noticias = await carregar();
  if (noticias.length) cache = { t: agora, dados: noticias };
  return noticias.length ? noticias : cache.dados || [];
}

router.get('/', async (req, res) => {
  try {
    const noticias = await obterNoticias();
    res.json({
      ok: true,
      atualizadoEm: new Date(cache.t || Date.now()).toISOString(),
      noticias,
    });
  } catch (e) {
    console.error('Erro noticias:', e.message);
    res.status(502).json({ ok: false, error: 'Sem ligação às notícias.', noticias: cache.dados || [] });
  }
});

/* As 4 notícias da home — só Call of Duty, Rockstar/GTA, NVIDIA, AMD/hardware
   e desbloqueios de PS4/PS5. */
router.get('/destaques', async (req, res) => {
  try {
    const noticias = await obterNoticias();
    const filtradas = noticias.filter(
      (n) => temaAceite(n.titulo) && !NAO_TEMA.test(n.titulo),
    );
    // Até 2 notícias das grandes franquias + as restantes de hardware/desbloqueios.
    const grandes = filtradas.filter((n) => GRANDES.test(n.titulo));
    const outros = filtradas.filter((n) => !GRANDES.test(n.titulo));
    const escolhidas = [];
    for (const n of [...grandes.slice(0, 2), ...outros, ...grandes.slice(2)]) {
      if (escolhidas.length >= 4) break;
      if (!escolhidas.includes(n)) escolhidas.push(n);
    }
    escolhidas.sort((a, b) => new Date(b.data) - new Date(a.data));
    res.json({
      ok: true,
      atualizadoEm: new Date(cache.t || Date.now()).toISOString(),
      noticias: escolhidas,
    });
  } catch (e) {
    console.error('Erro noticias destaques:', e.message);
    res.status(502).json({ ok: false, error: 'Sem ligação às notícias.', noticias: [] });
  }
});

module.exports = { newsRouter: router };
