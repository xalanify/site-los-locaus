// ============================================================
//  Cloudflare R2 — armazenamento de ficheiros (S3 compatível)
//
//  Sem dependências: assinatura AWS Signature V4 feita à mão.
//  Variáveis no .env:
//    R2_ACCOUNT_ID
//    R2_ACCESS_KEY_ID
//    R2_SECRET_ACCESS_KEY
//    R2_BUCKET
//    R2_PUBLIC_URL   (ex.: https://pub-xxxxxxxx.r2.dev ou domínio próprio)
//
//  Os ficheiros ficam com a chave "<bucket>/<nome>" (ex.:
//  "avatars/avatar-1-....jpg"), para manter a mesma organização
//  que já existia no Supabase Storage.
// ============================================================
const crypto = require('crypto');

const cfg = () => ({
  accountId: String(process.env.R2_ACCOUNT_ID || '').trim(),
  accessKeyId: String(process.env.R2_ACCESS_KEY_ID || '').trim(),
  secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY || '').trim(),
  bucket: String(process.env.R2_BUCKET || '').trim(),
  publicUrl: String(process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, ''),
});

function isConfigured() {
  const c = cfg();
  return Boolean(c.accountId && c.accessKeyId && c.secretAccessKey && c.bucket);
}

function hasPublicUrl() {
  return Boolean(cfg().publicUrl);
}

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
const enc = (s) =>
  encodeURIComponent(String(s)).replace(/[!'()*]/g, (ch) =>
    '%' + ch.charCodeAt(0).toString(16).toUpperCase(),
  );

function chave(bucket, path) {
  return `${String(bucket || '').replace(/^\/+|\/+$/g, '')}/${String(path || '').replace(/^\/+/, '')}`;
}

/** URL pública de um objeto (só faz sentido com R2_PUBLIC_URL definido). */
function publicUrl(bucket, path) {
  const c = cfg();
  if (!c.publicUrl) return null;
  return `${c.publicUrl}/${chave(bucket, path).split('/').map(enc).join('/')}`;
}

function assinatura({ method, key, body = '', contentType = '', expires = null }) {
  const c = cfg();
  if (!isConfigured()) throw new Error('R2 por configurar');

  const host = `${c.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${enc(c.bucket)}/${String(key).split('/').map(enc).join('/')}`;

  if (expires) {
    // URL pré-assinada (o browser envia o ficheiro diretamente para o R2)
    const query = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${c.accessKeyId}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(Math.max(60, Math.min(604800, Number(expires) || 3600))),
      'X-Amz-SignedHeaders': 'host',
    };
    const canonicalQuery = Object.keys(query)
      .sort()
      .map((k) => `${enc(k)}=${enc(query[k])}`)
      .join('&');
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuery,
      `host:${host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      sha256(canonicalRequest),
    ].join('\n');
    const k = chaveAssinatura(c.secretAccessKey, dateStamp);
    const signature = hmac(k, stringToSign).toString('hex');
    return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  const payloadHash = sha256(body || '');
  const headers = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) headers['content-type'] = contentType;
  const nomes = Object.keys(headers).sort();
  const canonicalHeaders = nomes.map((h) => `${h}:${headers[h]}\n`).join('');
  const signedHeaders = nomes.join(';');
  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const k = chaveAssinatura(c.secretAccessKey, dateStamp);
  const signature = hmac(k, stringToSign).toString('hex');

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${c.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

function chaveAssinatura(secret, dateStamp) {
  let k = hmac('AWS4' + secret, dateStamp);
  k = hmac(k, 'auto');
  k = hmac(k, 's3');
  return hmac(k, 'aws4_request');
}

async function put(bucket, path, buffer, contentType = 'application/octet-stream') {
  const { url, headers } = assinatura({
    method: 'PUT',
    key: chave(bucket, path),
    body: buffer,
    contentType,
  });
  // o fetch calcula o Content-Length; o header Host é reservado
  delete headers.host;
  const r = await fetch(url, { method: 'PUT', headers, body: buffer });
  if (!r.ok) throw new Error(`R2 upload ${r.status} — ${(await r.text()).slice(0, 160)}`);
  return publicUrl(bucket, path);
}

async function remove(bucket, path) {
  const { url, headers } = assinatura({ method: 'DELETE', key: chave(bucket, path) });
  delete headers.host;
  const r = await fetch(url, { method: 'DELETE', headers });
  if (!r.ok && r.status !== 404) {
    throw new Error(`R2 delete ${r.status} — ${(await r.text()).slice(0, 160)}`);
  }
  return true;
}

function presignPut(bucket, path, expiresIn = 3600) {
  return assinatura({
    method: 'PUT',
    key: chave(bucket, path),
    expires: expiresIn,
  });
}

module.exports = {
  isConfigured,
  hasPublicUrl,
  publicUrl,
  put,
  remove,
  presignPut,
};
