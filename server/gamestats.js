// ============================================================
// Números reais de jogadores + notícias oficiais dos jogos
// (fontes: Steam Web API e Steam Charts) para a página
// "Atualizações > Jogos".
//   - agora ........ Steam Web API (GetNumberOfCurrentPlayers)
//   - pico 24h ..... Steam Charts
//   - pico máximo .. Steam Charts
//   - notícias ..... Steam Web API (GetNewsForApp)
// ============================================================
const fetch = require('node-fetch');

// AppIDs oficiais na Steam (todos PC)
const GAMES = {
  cs2: { name: 'CS2', appid: 730 },
  bf6: { name: 'Battlefield 6', appid: 2807960 },
  bfv: { name: 'Battlefield V', appid: 1238810 },
  bf1: { name: 'Battlefield 1', appid: 1238840 },
  codmw3: { name: 'COD MW3 2023', appid: 3595270 },
  r6: { name: 'Rainbow Six Siege', appid: 359550 },
};

const UA = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
};

async function request(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 8000);
  try {
    const res = await fetch(url, { headers: UA, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

const getJSON = async (url) => (await request(url)).json();
const getText = async (url) => (await request(url)).text();

// ---------------- tradução em tempo real EN -> PT ----------------
// As notícias da Steam chegam em inglês; traduzimos título e resumo
// aqui (uma vez por notícia, guardado em memória) para o site ficar
// todo em português. Se a tradução falhar, fica o original.
const transCache = new Map();
const SOURCE_PT = {
  'Steam News': 'Notícias Steam',
  'Community Announcements': 'Anúncios da comunidade',
  'PlayGround.ru - официальная группа': 'PlayGround.ru — grupo oficial',
};

async function translateToPt(text) {
  const src = String(text || '').trim();
  if (!src) return '';
  if (transCache.has(src)) return transCache.get(src);
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=' +
      encodeURIComponent(src);
    const j = await getJSON(url);
    const pt =
      Array.isArray(j) && Array.isArray(j[0])
        ? j[0].map((s) => (Array.isArray(s) ? String(s[0] || '') : '')).join('')
        : '';
    const out = pt.trim() ? pt.trim() : src;
    transCache.set(src, out);
    return out;
  } catch {
    return src;
  }
}

// Corre `fn` sobre cada item com no máximo `limit` em paralelo
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// Lê o HTML do Steam Charts: 1º número = a jogar, 2º = pico 24h,
// 3º = pico máximo de sempre. Devolve {} se o jogo não existir lá.
function parseCharts(html) {
  const out = {};
  const nums = [];
  const re = /class="num">([\d,]+)</g;
  let m;
  const text = String(html || '');
  while ((m = re.exec(text)) !== null && nums.length < 3) {
    const n = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(n)) nums.push(n);
  }
  if (nums.length >= 3) {
    out.chartsNow = nums[0];
    out.peak24 = nums[1];
    out.peakAll = nums[2];
    const at = text.match(/class="timeago" title="([^"]+)"/);
    if (at) out.chartsAt = at[1];
  }
  return out;
}

// Limpa BBCode/HTML das notícias da Steam
function cleanText(s) {
  return String(s || '')
    .replace(/\[(\/)?img[^\]]*\][\s\S]*?\[(\/)?img[^\]]*\]/gi, ' ')
    .replace(/\[(\/)?(url|b|i|u|list|olist|h[1-3]|spoiler|center|quote|code)[^\]]*\]/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\\+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420);
}

// ---------------- números ao vivo ----------------
let liveCache = null;
const LIVE_TTL = 5 * 60 * 1000;

async function fetchGameLive(g) {
  const [nowR, chartsR] = await Promise.allSettled([
    getJSON(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${g.appid}`,
    ),
    getText(`https://steamcharts.com/app/${g.appid}`),
  ]);

  const out = { now: null, peak24: null, peakAll: null };

  if (nowR.status === 'fulfilled') {
    const n = nowR.value && nowR.value.response && nowR.value.response.player_count;
    out.now = Number.isFinite(n) ? n : null;
  }
  if (chartsR.status === 'fulfilled') {
    const c = parseCharts(chartsR.value);
    if (Number.isFinite(c.peak24)) out.peak24 = c.peak24;
    if (Number.isFinite(c.peakAll)) out.peakAll = c.peakAll;
    if (out.now == null && Number.isFinite(c.chartsNow)) out.now = c.chartsNow;
  }
  return out;
}

// Capas atuais dos jogos — o caminho com hash da arte muda quando a
// Steam atualiza a imagem, por isso vamos buscá-lo à loja (cacheado).
const coverCache = new Map();

async function fetchCover(appid) {
  if (coverCache.has(appid)) return coverCache.get(appid);
  try {
    const j = await getJSON(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=english`,
    );
    const d = j && j[String(appid)];
    const url =
      d && d.success && d.data && d.data.header_image ? String(d.data.header_image) : null;
    if (url) coverCache.set(appid, url);
    return url;
  } catch {
    return null;
  }
}

async function getCovers() {
  const pairs = await Promise.all(
    Object.entries(GAMES).map(async ([id, g]) => [id, await fetchCover(g.appid)]),
  );
  return Object.fromEntries(pairs);
}

async function getLive() {
  if (liveCache && Date.now() - liveCache.t < LIVE_TTL) return liveCache.v;

  const pairs = await Promise.all(
    Object.entries(GAMES).map(async ([id, g]) => {
      try {
        const nums = await fetchGameLive(g);
        return [id, { ...nums, url: `https://steamcharts.com/app/${g.appid}` }];
      } catch (e) {
        return [id, { now: null, peak24: null, peakAll: null, url: `https://steamcharts.com/app/${g.appid}` }];
      }
    }),
  );

  const v = {
    updated: new Date().toISOString(),
    covers: await getCovers(),
    games: Object.fromEntries(pairs),
  };
  liveCache = { t: Date.now(), v };
  return v;
}

// ---------------- notícias / atualizações ----------------
const newsCache = new Map();
const NEWS_TTL = 10 * 60 * 1000;

async function getNews(id) {
  const g = GAMES[id];
  if (!g) return null;

  const hit = newsCache.get(id);
  if (hit && Date.now() - hit.t < NEWS_TTL) return hit.v;

  const data = await getJSON(
    `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${g.appid}&count=25&maxlength=400&format=json`,
  );
  const raw = (data && data.appnews && data.appnews.newsitems) || [];
  // Título e resumo traduzidos para português (cache — só a 1ª vez demora)
  const items = await pool(raw, 3, async (n) => {
    const titleRaw = String(n.title || '').trim();
    const textRaw = cleanText(n.contents);
    const [title, text] = await Promise.all([translateToPt(titleRaw), translateToPt(textRaw)]);
    const sourceRaw = String(n.feedlabel || 'Steam').trim();
    return {
      id: String(n.gid || ''),
      date: new Date((Number(n.date) || 0) * 1000).toISOString(),
      title,
      text,
      url: String(n.url || ''),
      source: SOURCE_PT[sourceRaw] || sourceRaw,
      patch: Array.isArray(n.tags) && n.tags.indexOf('patchnotes') !== -1,
    };
  });

  const v = { game: id, name: g.name, updated: new Date().toISOString(), items };
  newsCache.set(id, { t: Date.now(), v });
  return v;
}

module.exports = { GAMES, parseCharts, cleanText, getLive, getNews };
