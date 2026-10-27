/* ============================================================
   Estado "em live" automático (só contas admin, para testes)
   ------------------------------------------------------------
   O servidor vê os canais públicos ligados ao perfil (YouTube,
   Twitch, TikTok e Kick) e devolve quem está em direto. Há uma
   cache de 2 minutos para não repetir pedidos.
   ============================================================ */
const { getDb } = require('./database');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const TTL = 120 * 1000;
const cache = new Map();
const PLATAFORMAS = ['youtube', 'twitch', 'tiktok', 'kick'];

function limparHandle(valor, plataforma) {
  const bruto = String(valor || '').trim();
  if (!bruto) return null;

  if (!/^https?:\/\//i.test(bruto)) {
    const limpo = bruto.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 80);
    return limpo || null;
  }

  try {
    const u = new URL(bruto);
    const partes = u.pathname.split('/').filter(Boolean);
    if (plataforma === 'youtube') {
      const p = partes[0] || '';
      if (p.startsWith('@')) return p;
      if (p === 'channel' && partes[1]) return partes[1];
      if ((p === 'c' || p === 'user') && partes[1]) return `@${partes[1]}`;
      if (u.hostname.includes('youtu.be')) return null;
      return p ? `@${p}` : null;
    }
    return (partes[0] || '').replace(/^@/, '') || null;
  } catch {
    return null;
  }
}

function urlDoCanal(plataforma, handle) {
  const h = String(handle || '').replace(/^@/, '');
  if (plataforma === 'youtube') {
    if (String(handle).startsWith('@')) return `https://www.youtube.com/${handle}`;
    if (/^UC[A-Za-z0-9_-]{10,}$/.test(handle)) return `https://www.youtube.com/channel/${handle}`;
    return `https://www.youtube.com/@${h}`;
  }
  if (plataforma === 'twitch') return `https://www.twitch.tv/${h}`;
  if (plataforma === 'tiktok') return `https://www.tiktok.com/@${h}`;
  if (plataforma === 'kick') return `https://kick.com/${h}`;
  return null;
}

async function buscar(url, tipo = 'texto') {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const r = await fetch(url, {
      headers: {
        'user-agent': UA,
        'accept-language': 'en-US,en;q=0.9',
        accept: tipo === 'json' ? 'application/json' : 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return tipo === 'json' ? await r.json() : await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function detetar(plataforma, handle) {
  const chave = `${plataforma}:${String(handle).toLowerCase()}`;
  const agora = Date.now();
  const guardado = cache.get(chave);
  if (guardado && agora - guardado.em < TTL) return guardado.live;

  let live = null;
  try {
    if (plataforma === 'kick') {
      const d = await buscar(
        `https://kick.com/api/v2/channels/${encodeURIComponent(handle.replace(/^@/, ''))}`,
        'json',
      );
      if (d && d.livestream) {
        live = {
          platform: 'kick',
          url: `https://kick.com/${handle.replace(/^@/, '')}`,
          title: d.livestream.session_title || null,
        };
      }
    } else if (plataforma === 'twitch') {
      const html = await buscar(`https://www.twitch.tv/${encodeURIComponent(handle.replace(/^@/, ''))}`);
      if (html && /"isLiveBroadcast"\s*:\s*true/.test(html)) {
        live = {
          platform: 'twitch',
          url: `https://www.twitch.tv/${handle.replace(/^@/, '')}`,
        };
      }
    } else if (plataforma === 'youtube') {
      const base = urlDoCanal('youtube', handle);
      if (base) {
        const html = await buscar(`${base}/live`);
        if (html) {
          const estaVivo =
            /"liveBroadcastDetails"\s*:\s*\{\s*"isLiveNow"\s*:\s*true/.test(html) ||
            /itemprop="isLiveBroadcast"\s+content="True"/i.test(html);
          if (estaVivo) {
            const m =
              html.match(/<link rel="canonical" href="(https:\/\/www\.youtube\.com\/watch\?v=[^"]+)"/) ||
              html.match(/"canonicalBaseUrl":"(https:\/\/www\.youtube\.com\/watch\?v=[^"]+)"/);
            live = {
              platform: 'youtube',
              url: m ? m[1].replace(/\\u0026/g, '&') : `${base}/live`,
            };
          }
        }
      }
    } else if (plataforma === 'tiktok') {
      const h = handle.replace(/^@/, '');
      const html = await buscar(`https://www.tiktok.com/@${encodeURIComponent(h)}/live`);
      if (html) {
        const i = html.indexOf('"liveRoom":');
        if (i >= 0) {
          const trecho = html.slice(i, i + 700);
          if (/"status"\s*:\s*[24]/.test(trecho)) {
            live = {
              platform: 'tiktok',
              url: `https://www.tiktok.com/@${h}/live`,
            };
          }
        }
      }
    }
  } catch {
    live = null;
  }

  cache.set(chave, { em: agora, live });
  return live;
}

function lerSocials(valor) {
  if (!valor) return {};
  if (typeof valor === 'string') {
    try {
      const d = JSON.parse(valor);
      return d && typeof d === 'object' ? d : {};
    } catch {
      return {};
    }
  }
  return typeof valor === 'object' ? valor : {};
}

async function getLiveSnapshot() {
  const db = getDb();
  // Por agora só contas admin entram na deteção automática.
  const rows = await db
    .prepare(
      `SELECT u.username, p.socials
         FROM user_profiles p
         JOIN users u ON u.id = p.user_id
        WHERE u.is_admin = true
          AND COALESCE(u.password_hash, '') NOT LIKE '!%'
          AND p.socials IS NOT NULL
          AND p.socials <> '{}'::jsonb
        ORDER BY u.username
        LIMIT 40`,
    )
    .all();

  const live = [];

  await Promise.all(
    rows.map(async (r) => {
      const socials = lerSocials(r.socials);
      const achados = await Promise.all(
        PLATAFORMAS.map(async (plataforma) => {
          const handle = limparHandle(socials[plataforma], plataforma);
          if (!handle) return null;
          const achado = await detetar(plataforma, handle);
          return achado ? { username: r.username, ...achado, automatic: true } : null;
        }),
      );
      const achado = achados.find(Boolean);
      if (achado) live.push(achado);
    }),
  );

  return live;
}

module.exports = { getLiveSnapshot };
