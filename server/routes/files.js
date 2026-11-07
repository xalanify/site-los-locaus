// ============================================================
//  Ficheiros do site — /api/files/:bucket/<caminho>
//
//  Serve as imagens guardadas na base de dados e, quando o ficheiro
//  está no Cloudflare R2 (ou ainda no Supabase antigo), redireciona
//  para lá. Os links ficam estáveis mesmo mudando de fornecedor.
// ============================================================
const express = require('express');
const storage = require('../storage');

const router = express.Router();

const BUCKET_OK = /^[a-z0-9_-]{1,40}$/i;
const SEGMENTO_OK = /^[A-Za-z0-9._-]{1,180}$/;

router.get('/:bucket/*', async (req, res, next) => {
  try {
    const bucket = String(req.params.bucket || '');
    const caminho = String(req.params[0] || '');
    const partes = caminho.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
    const valido =
      BUCKET_OK.test(bucket) &&
      partes.length > 0 &&
      partes.every((p) => SEGMENTO_OK.test(p) && p !== '.' && p !== '..');
    if (!valido) {
      return res.status(400).json({ error: 'Ficheiro inválido.' });
    }
    const nome = partes.join('/');

    // 1) cópia na base de dados (upload feito sem R2 ou migrado)
    const ficheiro = await storage.ler(bucket, nome);
    if (ficheiro) {
      res.setHeader('Content-Type', ficheiro.tipo || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(ficheiro.bytes);
    }

    // 2) Cloudflare R2 (bucket público)
    const r2Url = storage.r2PublicUrl(bucket, nome);
    if (r2Url) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.redirect(302, r2Url);
    }

    // 3) Supabase antigo (enquanto a quota não reinicia)
    const supa = storage.supabasePublicUrl(bucket, nome);
    if (supa) {
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.redirect(302, supa);
    }

    return res.status(404).json({ error: 'Ficheiro não encontrado.' });
  } catch (e) {
    return next(e);
  }
});

module.exports = { filesRouter: router };
