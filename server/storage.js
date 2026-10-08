// ============================================================
//  Supabase Storage — ficheiros (avatares e clips)
//
//  O Vercel só aceita corpos de 4,5 MB, por isso os vídeos NÃO
//  podem passar pelo servidor: o ideal é o browser subir direto
//  (URL de subida assinada) e o servidor apenas guardar o caminho.
//  Aqui ficam as operações do servidor para quando for preciso.
// ============================================================

const SUPA = () => String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = () => String(process.env.SUPABASE_SERVICE_KEY || '').trim();

const isConfigured = () => Boolean(SUPA() && KEY());

function headers(extra = {}) {
  return { apikey: KEY(), Authorization: `Bearer ${KEY()}`, ...extra };
}

/** URL pública (só serve para buckets públicos). */
function publicUrl(bucket, path) {
  return `${SUPA()}/storage/v1/object/public/${bucket}/${path}`;
}

/** URL de subida assinada — o browser usa esta para enviar o ficheiro. */
async function signedUploadUrl(bucket, path, { expiresIn = 3600 } = {}) {
  const res = await fetch(`${SUPA()}/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`Storage sign ${res.status} — ${(await res.text()).slice(0, 140)}`);
  const data = await res.json();
  return `${SUPA()}${data.signedURL}`;
}

/** URL de leitura temporária (clips privados). */
async function signedReadUrl(bucket, path, { expiresIn = 3600 } = {}) {
  const res = await fetch(`${SUPA()}/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`Storage sign ${res.status} — ${(await res.text()).slice(0, 140)}`);
  const data = await res.json();
  return `${SUPA()}${data.signedURL}`;
}

/** Subida direta do servidor (avatares são pequenos; clips não). */
async function upload(bucket, path, buffer, contentType = 'application/octet-stream') {
  const res = await fetch(`${SUPA()}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': contentType, 'x-upsert': 'true' }),
    body: buffer,
  });
  if (!res.ok) throw new Error(`Storage upload ${res.status} — ${(await res.text()).slice(0, 140)}`);
  return publicUrl(bucket, path);
}

/** Apagar um objeto. */
async function remove(bucket, path) {
  const res = await fetch(`${SUPA()}/storage/v1/object/${bucket}/${path}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Storage delete ${res.status} — ${(await res.text()).slice(0, 140)}`);
  }
  return true;
}

/** URL de leitura: pública se o bucket for público, assinada caso contrário. */
function readUrl(bucket, path, isPublic = true) {
  return isPublic ? publicUrl(bucket, path) : publicUrl(bucket, path);
}

module.exports = {
  isConfigured,
  publicUrl,
  signedUploadUrl,
  signedReadUrl,
  upload,
  remove,
  readUrl,
};
