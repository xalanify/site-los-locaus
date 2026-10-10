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
    enviarPush({ userId, title, body, link }).catch(() => {});
    return Number(r.lastInsertRowid);
  } catch (e) {
    console.error('notify:', e.message);
    return null;
  }
}

/** Envia o mesmo aviso a todos os dispositivos registados. */
async function enviarPush({ userId, title, body, link }) {
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

  const payload = JSON.stringify({ title, body, link });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: 'normal' },
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

module.exports = { notify, pushAtivo: () => pushPronto };
