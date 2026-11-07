// ============================================================
//  Migração de ficheiros antigos (Supabase) para o R2 / base de dados
//
//  Como usar:
//      node server/migrar-storage.js
//
//  O que faz:
//    1. tenta copiar avatares, capas de clips e imagens de posts que
//       ainda apontam para o Supabase Storage;
//    2. gera capas a partir do YouTube (funciona sempre, mesmo com a
//       quota do Supabase esgotada);
//    3. limpa cartas retiradas do mercado (volta à carta padrão).
//
//  Pode ser corrido quantas vezes for preciso: só copia o que falta.
// ============================================================
require('dotenv').config({ path: __dirname + '/.env' });

const { getDb } = require('./database');
const storage = require('./storage');

const SUPA = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');

const CARTAS_RETIRADAS = [
  'foto-remember',
  'foto-nightops',
  'foto-stealth',
  'foto-apex',
  'foto-nfsu1',
  'foto-nfsu2',
  'foto-guerra',
  'foto-neon',
];

const ITENS_RETIRADOS = CARTAS_RETIRADAS.map((v) => `carta-${v}`);

function partesSupabase(url) {
  const m = String(url || '').match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { bucket: decodeURIComponent(m[1]), nome: decodeURIComponent(m[2]) };
}

async function descarregar(url) {
  const r = await fetch(url);
  if (!r.ok) return { ok: false, status: r.status, corpo: (await r.text()).slice(0, 80) };
  const tipo = r.headers.get('content-type') || 'application/octet-stream';
  const bytes = Buffer.from(await r.arrayBuffer());
  return { ok: true, tipo, bytes };
}

async function copiarUrl(url) {
  const p = partesSupabase(url);
  if (!p) return { ok: false, motivo: 'não é do Supabase' };
  const ja = await storage.ler(p.bucket, p.nome);
  if (ja) return { ok: true, url: storage.appUrl(p.bucket, p.nome), jaExistia: true };

  const d = await descarregar(url);
  if (!d.ok) return { ok: false, motivo: `HTTP ${d.status}`, corpo: d.corpo };

  await storage.upload(p.bucket, p.nome, d.bytes, d.tipo);
  return { ok: true, url: storage.appUrl(p.bucket, p.nome) };
}

async function capaYoutube(videoId) {
  const id = String(videoId || '').trim();
  if (!id) return null;
  const nome = `capa_${id.replace(/[^A-Za-z0-9_-]/g, '')}.jpg`;
  const ja = await storage.ler('clips', nome);
  if (ja) return storage.appUrl('clips', nome);

  for (const variante of ['maxresdefault', 'sddefault', 'hqdefault']) {
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${encodeURIComponent(id)}/${variante}.jpg`);
      if (!r.ok) continue;
      const bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length < 8 * 1024) continue;
      await storage.upload('clips', nome, bytes, 'image/jpeg');
      return storage.appUrl('clips', nome);
    } catch {
      /* tenta a variante seguinte */
    }
  }
  return null;
}

async function main() {
  const db = getDb();
  const relatorio = {
    avatares: { copiados: 0, falhas: 0 },
    capas: { copiadas: 0, falhas: 0 },
    posts: { copiados: 0, falhas: 0 },
    chat: { copiadas: 0, falhas: 0 },
    cartas: { limpas: 0 },
  };

  console.log('R2 configurado:', storage.podeUploadDireto());

  // ---------- avatares ----------
  const perfis = await db
    .prepare(
      `SELECT user_id, avatar_url FROM user_profiles
       WHERE avatar_url LIKE '%/storage/v1/object/public/%'`,
    )
    .all();
  for (const p of perfis) {
    const r = await copiarUrl(p.avatar_url);
    if (r.ok) {
      await db
        .prepare('UPDATE user_profiles SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(r.url, p.user_id);
      relatorio.avatares.copiados++;
      console.log(`  avatar ${p.user_id}: OK${r.jaExistia ? ' (já existia)' : ''}`);
    } else {
      relatorio.avatares.falhas++;
      console.log(`  avatar ${p.user_id}: ${r.motivo}`);
    }
  }

  // ---------- capas dos clips ----------
  const clips = await db
    .prepare('SELECT id, youtube_id, thumb FROM clips')
    .all();
  for (const c of clips) {
    let url = null;
    if (c.thumb && c.thumb.includes('/storage/v1/object/public/')) {
      const r = await copiarUrl(c.thumb);
      if (r.ok) url = r.url;
    }
    if (!url && c.youtube_id) url = await capaYoutube(c.youtube_id);
    if (url && url !== c.thumb) {
      await db.prepare('UPDATE clips SET thumb = ? WHERE id = ?').run(url, c.id);
      relatorio.capas.copiadas++;
      console.log(`  capa do clip ${c.id}: OK`);
    } else if (!url) {
      relatorio.capas.falhas++;
    }
  }

  // ---------- imagens dos posts ----------
  const posts = await db
    .prepare(
      `SELECT id, image_url FROM posts
       WHERE image_url LIKE '%/storage/v1/object/public/%'`,
    )
    .all();
  for (const p of posts) {
    let url = null;
    const r = await copiarUrl(p.image_url);
    if (r.ok) url = r.url;
    if (!url) {
      const m = String(p.image_url).match(/capa_([A-Za-z0-9_-]+)\.(?:jpg|jpeg|png|webp)$/i);
      if (m) url = await capaYoutube(m[1]);
    }
    if (url) {
      await db.prepare('UPDATE posts SET image_url = ? WHERE id = ?').run(url, p.id);
      relatorio.posts.copiados++;
      console.log(`  imagem do post ${p.id}: OK`);
    } else {
      relatorio.posts.falhas++;
    }
  }

  // ---------- imagens do chat ----------
  const mensagens = await db
    .prepare(
      `SELECT id, media_url FROM chat_messages
       WHERE media_url LIKE '%/storage/v1/object/public/%'`,
    )
    .all();
  for (const m of mensagens) {
    const r = await copiarUrl(m.media_url);
    if (r.ok) {
      await db.prepare('UPDATE chat_messages SET media_url = ? WHERE id = ?').run(r.url, m.id);
      relatorio.chat.copiadas++;
      console.log(`  imagem do chat ${m.id}: OK`);
    } else {
      relatorio.chat.falhas++;
    }
  }

  // ---------- cartas retiradas ----------
  const marcadores = CARTAS_RETIRADAS.map(() => '?').join(',');
  const limpas = await db
    .prepare(
      `UPDATE user_profiles SET card_style = 'padrao', updated_at = CURRENT_TIMESTAMP
       WHERE card_style IN (${marcadores})`,
    )
    .run(...CARTAS_RETIRADAS);
  relatorio.cartas.limpas = Number(limpas.changes) || 0;

  if (ITENS_RETIRADOS.length) {
    const m2 = ITENS_RETIRADOS.map(() => '?').join(',');
    await db
      .prepare(`DELETE FROM mercado_anuncios WHERE item_id IN (${m2})`)
      .run(...ITENS_RETIRADOS)
      .catch(() => {});
    await db
      .prepare(`DELETE FROM mercado_precos WHERE item_id IN (${m2})`)
      .run(...ITENS_RETIRADOS)
      .catch(() => {});
    await db
      .prepare(`DELETE FROM mercado_historico WHERE item_id IN (${m2})`)
      .run(...ITENS_RETIRADOS)
      .catch(() => {});
  }

  console.log('\nResumo:', JSON.stringify(relatorio));
  if (relatorio.avatares.falhas) {
    console.log(
      '\nAlguns avatares ainda não puderam ser copiados (Supabase com quota excedida).' +
        '\nCorre este script outra vez quando a quota reiniciar — não é preciso ninguém voltar a subir fotos.',
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Erro na migração:', e.message);
    process.exit(1);
  });
