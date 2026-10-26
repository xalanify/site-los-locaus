// ============================================================
//  Notificações — guarda na BD e avisa por Web Push
//
//  Uma notificação é criada quando alguém comenta, responde ou
//  dá "gosto" num clip teu, ou quando recebes uma distinção.
//  O mesmo registo alimenta o sino do site E o push do PWA.
// ============================================================
const webpush = require('web-push');
const { getDb } = require('./database');

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
let pushPronto = false;

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@locaus.local',
      publicKey,
      privateKey,
    );
    pushPronto = true;
  } catch (e) {
    console.error('VAPID inválido:', e.message);
  }
}

/**
 * Cria a notificação e (se estiver tudo configurado) envia o push.
 * Nunca rebenta a rota que a chama.
 */
async function notify({
  userId,
  actorId = null,
  type,
  entity,
  entityId = null,
  title,
  body = '',
  link = null,
  image = null,
}) {
  if (!userId) return null;
  if (actorId && Number(actorId) === Number(userId)) return null; // não se avisa a si próprio
  try {
    const db = getDb();
    const r = await db
      .prepare(
        `INSERT INTO notifications (user_id, actor_id, type, entity, entity_id, title, body, link)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .run(userId, actorId || null, type, entity, entityId, title, body, link);
    enviarPush({ userId, title, body, link, image }).catch(() => {});
    return Number(r.lastInsertRowid);
  } catch (e) {
    console.error('notify:', e.message);
    return null;
  }
}

/** Envia o mesmo aviso a todos os dispositivos registados. */
async function enviarPush({
  userId,
  title,
  body,
  link,
  image = null,
  icon = null,
  tag = 'locaus',
  tipo = 'geral',
}) {
  if (!pushPronto) return;
  const db = getDb();
  let subs = [];
  try {
    subs = await db
      .prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?')
      .all(userId);
  } catch {
    return;
  }
  if (!subs.length) return;

  const base = (process.env.SITE_URL || 'https://www.locaus.fun').replace(/\/+$/, '');
  const absoluto = (u) => {
    if (!u) return null;
    const s = String(u);
    if (/^https?:\/\//i.test(s)) return s;
    return `${base}${s.startsWith('/') ? '' : '/'}${s}`;
  };

  const payload = JSON.stringify({
    title,
    body,
    link,
    image: absoluto(image),
    icon: absoluto(icon),
    tag,
    tipo,
    sound: 'default',
    silent: false,
  });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: tipo === 'chat' ? 'high' : 'normal' },
        );
      } catch (e) {
        // dispositivo apagado / subscribe revogado -> limpa
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await db
            .prepare('DELETE FROM push_subs WHERE endpoint = ?')
            .run(s.endpoint)
            .catch(() => {});
        }
      }
    }),
  );
}

/* Avisa todos os dispositivos de todos os utilizadores (menos o autor). */
async function pushTodos({ excluirUserId = null, excluirIds = [], ...dados }) {
  if (!pushPronto) return;
  const db = getDb();
  let ids = [];
  try {
    ids = await db
      .prepare('SELECT DISTINCT user_id FROM push_subs WHERE user_id IS NOT NULL')
      .all();
  } catch {
    return;
  }
  const bloquear = new Set(
    (Array.isArray(excluirIds) ? excluirIds : []).map((x) => Number(x)).filter(Boolean),
  );
  await Promise.all(
    ids
      .map((r) => Number(r.user_id))
      .filter((id) => id && id !== Number(excluirUserId || 0) && !bloquear.has(id))
      .map((id) => enviarPush({ userId: id, ...dados }).catch(() => {})),
  );
}

/* Garante que um aviso só é enviado uma vez (notícias/jogos ao vivo). */
async function avisarUmaVez(chave, dados) {
  if (!pushPronto) return false;
  try {
    const db = getDb();
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS public.avisos_push (
           chave text primary key,
           criado_em timestamptz not null default now()
         )`,
      )
      .run()
      .catch(() => {});
    const r = await db
      .prepare(
        `INSERT INTO public.avisos_push (chave) VALUES (?)
         ON CONFLICT (chave) DO NOTHING RETURNING chave`,
      )
      .get(chave);
    if (!r) return false; // já tinha sido enviado
    await pushTodos(dados);
    // limpa avisos antigos (mais de 30 dias)
    await db
      .prepare("DELETE FROM public.avisos_push WHERE criado_em < now() - interval '30 days'")
      .run()
      .catch(() => {});
    return true;
  } catch {
    return false;
  }
}

async function notificarNoticias(noticias) {
  const lista = (Array.isArray(noticias) ? noticias : []).slice(0, 2);
  for (const n of lista) {
    if (!n || !n.titulo) continue;
    const quando = n.data ? new Date(n.data).getTime() : 0;
    // não avisa de notícias antigas (ex.: primeira vez que a cache enche)
    if (quando && Date.now() - quando > 24 * 60 * 60 * 1000) continue;
    const id = n.id || n.link || n.titulo;
    let imagem = n.imagem || null;
    // se só temos a imagem SVG de recurso, tenta a capa real do artigo
    if (!imagem || /\.svg(?:$|\?)/i.test(imagem)) {
      imagem = (await ogImage(n.link)) || imagem;
    }
    await avisarUmaVez(`noticia:${id}`, {
      title: `📰 ${n.fonte || 'Notícia nova'}`,
      body: n.titulo,
      link: n.link || '/jogos-steam?aba=noticias',
      image: imagem,
      tag: `noticia-${id}`,
      tipo: 'noticia',
    }).catch(() => {});
  }
}

async function ogImage(url) {
  if (!url || !/^https?:\/\//i.test(String(url))) return null;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) return null;
    const html = await r.text();
    const m =
      html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    return m ? m[1].replace(/&amp;/g, '&') : null;
  } catch {
    return null;
  }
}

async function avisarJogoAoVivo(jogo, match) {
  if (!match || !match.id) return;
  const nomeA = (match.team_a && (match.team_a.name || match.team_a)) || 'Equipa A';
  const nomeB = (match.team_b && (match.team_b.name || match.team_b)) || 'Equipa B';
  const logoA =
    (match.team_a && (match.team_a.logo || match.team_a.logo_url)) ||
    match.team_a_logo ||
    null;
  const logoB =
    (match.team_b && (match.team_b.logo || match.team_b.logo_url)) ||
    match.team_b_logo ||
    null;
  await avisarUmaVez(`live:${jogo}:${match.id}`, {
    title: `🔴 Ao vivo · ${jogo === 'cs2' ? 'CS2' : 'Rainbow Six'}`,
    body: `${nomeA} vs ${nomeB} — o jogo começou!`,
    link: '/previsoes',
    image: logoA || logoB || (jogo === 'cs2' ? '/nukecs2.png' : '/coastliner6.jpg'),
    icon: logoB || logoA || '/icon-192.png',
    tag: `live-${jogo}-${match.id}`,
    tipo: 'live',
  }).catch(() => {});
}

module.exports = {
  notify,
  enviarPush,
  pushTodos,
  avisarUmaVez,
  notificarNoticias,
  avisarJogoAoVivo,
  pushAtivo: () => pushPronto,
};
