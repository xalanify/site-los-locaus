// ============================================================
//  Armazenamento de ficheiros (avatares, capas de clips...)
//
//  Ordem de preferência:
//    1. Cloudflare R2  (se R2_* estiver no .env — grátis e rápido)
//    2. PostgreSQL     (fallback imediato, sem depender de quotas)
//    3. Supabase       (só leitura/remoção de ficheiros antigos)
//
//  Todos os uploads novos devolvem um link do próprio site
//  (/api/files/...) — assim mudar de fornecedor no futuro não
//  obriga a reescrever links guardados na base de dados.
// ============================================================

const { getDb } = require('./database');
const r2 = require('./r2');

const SUPA = () => String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = () => String(process.env.SUPABASE_SERVICE_KEY || '').trim();

const supabaseConfigured = () => Boolean(SUPA() && KEY());

/** Há armazenamento utilizável? (R2 ou base de dados). */
const isConfigured = () => true;

/** O browser consegue enviar ficheiros grandes direto para o R2? */
const podeUploadDireto = () => r2.isConfigured();

function appUrl(bucket, path) {
  const b = encodeURIComponent(String(bucket || ''));
  const p = String(path || '')
    .split('/')
    .map((x) => encodeURIComponent(x))
    .join('/');
  return `/api/files/${b}/${p}`;
}

/* ---------------- PostgreSQL (fallback) ---------------- */

let tabela = null;
function garantirTabela() {
  if (!tabela) {
    tabela = getDb()
      .exec(`
        CREATE TABLE IF NOT EXISTS public.ficheiros (
          caminho text primary key,
          tipo text not null,
          bytes bytea not null,
          criado_em timestamptz not null default now()
        );
      `)
      .then(() => true)
      .catch(() => false);
  }
  return tabela;
}

const caminho = (bucket, path) => `${bucket}/${path}`;

async function dbPut(bucket, path, buffer, contentType) {
  await garantirTabela();
  await getDb()
    .prepare(
      `INSERT INTO public.ficheiros (caminho, tipo, bytes)
       VALUES (?, ?, ?)
       ON CONFLICT (caminho) DO UPDATE SET tipo = EXCLUDED.tipo, bytes = EXCLUDED.bytes`,
    )
    .run(caminho(bucket, path), contentType || 'application/octet-stream', buffer);
  return true;
}

async function dbGet(bucket, path) {
  try {
    await garantirTabela();
    const row = await getDb()
      .prepare('SELECT tipo, bytes FROM public.ficheiros WHERE caminho = ?')
      .get(caminho(bucket, path));
    return row || null;
  } catch {
    return null;
  }
}

async function dbRemove(bucket, path) {
  try {
    await garantirTabela();
    await getDb().prepare('DELETE FROM public.ficheiros WHERE caminho = ?').run(caminho(bucket, path));
    return true;
  } catch {
    return false;
  }
}

/* ---------------- Uploads ---------------- */

async function upload(bucket, path, buffer, contentType = 'application/octet-stream') {
  if (r2.isConfigured()) {
    try {
      await r2.put(bucket, path, buffer, contentType);
      return appUrl(bucket, path);
    } catch (e) {
      console.warn('R2 indisponível, a guardar na base de dados:', String(e.message).slice(0, 140));
    }
  }
  await dbPut(bucket, path, buffer, contentType);
  return appUrl(bucket, path);
}

/** Link de leitura estável — passa sempre pelo próprio site.
    A rota /api/files decide se serve da base de dados ou se
    redireciona para o R2/Supabase. Assim os links antigos e novos
    continuam válidos mesmo mudando de fornecedor. */
function publicUrl(bucket, path) {
  return appUrl(bucket, path);
}

function readUrl(bucket, path) {
  return publicUrl(bucket, path);
}

/** URL do R2 para redirecionar (ou null). */
function r2PublicUrl(bucket, path) {
  return r2.isConfigured() && r2.hasPublicUrl() ? r2.publicUrl(bucket, path) : null;
}

/** URL antiga do Supabase (legado). */
function supabasePublicUrl(bucket, path) {
  if (!supabaseConfigured()) return null;
  return `${SUPA()}/storage/v1/object/public/${bucket}/${path}`;
}

/** Ler um ficheiro guardado na base de dados. */
async function ler(bucket, path) {
  return dbGet(bucket, path);
}

async function remove(bucket, path) {
  let feito = false;
  if (r2.isConfigured()) {
    try {
      await r2.remove(bucket, path);
      feito = true;
    } catch (e) {
      console.warn('R2 delete:', String(e.message).slice(0, 120));
    }
  }
  const db = await dbRemove(bucket, path);
  return feito || db;
}

/** Apagar no Supabase antigo (best-effort). */
async function removeSupabase(bucket, path) {
  if (!supabaseConfigured()) return false;
  try {
    const r = await fetch(`${SUPA()}/storage/v1/object/${bucket}/${path}`, {
      method: 'DELETE',
      headers: headers(),
    });
    return r.ok || r.status === 404;
  } catch {
    return false;
  }
}

/** Remover a partir de um URL (novo, R2 ou Supabase antigo). */
async function removeUrl(url) {
  const texto = String(url || '').trim();
  if (!texto) return false;

  const proprio = texto.match(/\/api\/files\/([^/]+)\/(.+)$/);
  if (proprio) {
    return remove(decodeURIComponent(proprio[1]), decodeURIComponent(proprio[2]));
  }

  if (r2.hasPublicUrl()) {
    const base = String(process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
    if (base && texto.startsWith(base + '/')) {
      const resto = decodeURIComponent(texto.slice(base.length + 1));
      const [bucket, ...partes] = resto.split('/');
      return remove(bucket, partes.join('/'));
    }
  }

  const supa = texto.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (supa) {
    const bucket = decodeURIComponent(supa[1]);
    const nome = decodeURIComponent(supa[2]);
    await removeSupabase(bucket, nome);
    return remove(bucket, nome);
  }

  return false;
}

/* ---------------- Supabase (legado) ---------------- */

function headers(extra = {}) {
  return { apikey: KEY(), Authorization: `Bearer ${KEY()}`, ...extra };
}

async function ensureBucket(bucket, isPublic = true) {
  if (!supabaseConfigured()) throw new Error('Storage por configurar');
  const r = await fetch(`${SUPA()}/storage/v1/bucket`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: bucket, name: bucket, public: isPublic }),
  });
  if (r.ok || r.status === 409) return true;
  const txt = await r.text();
  if (/exist|duplicate/i.test(txt)) return true;
  throw new Error(`Storage bucket ${r.status} — ${txt.slice(0, 140)}`);
}

async function signedUploadUrl(bucket, path, { expiresIn = 3600 } = {}) {
  if (r2.isConfigured()) {
    return r2.presignPut(bucket, path, expiresIn);
  }
  if (!supabaseConfigured()) throw new Error('Uploads diretos por configurar (R2).');
  const res = await fetch(`${SUPA()}/storage/v1/object/upload/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`Storage sign ${res.status} — ${(await res.text()).slice(0, 140)}`);
  const data = await res.json();
  const rel = String(data.url || data.signedURL || '').replace(/^\/storage\/v1/, '');
  if (!rel) throw new Error('Storage sign sem URL de subida');
  return `${SUPA()}/storage/v1${rel}`;
}

async function signedReadUrl(bucket, path, { expiresIn = 3600 } = {}) {
  if (r2.isConfigured() && r2.hasPublicUrl()) return r2.publicUrl(bucket, path);
  if (!supabaseConfigured()) throw new Error('Storage por configurar');
  const res = await fetch(`${SUPA()}/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`Storage sign ${res.status} — ${(await res.text()).slice(0, 140)}`);
  const data = await res.json();
  return `${SUPA()}${data.signedURL}`;
}

module.exports = {
  isConfigured,
  podeUploadDireto,
  appUrl,
  publicUrl,
  r2PublicUrl,
  supabasePublicUrl,
  readUrl,
  ler,
  upload,
  remove,
  removeUrl,
  ensureBucket,
  signedUploadUrl,
  signedReadUrl,
};
