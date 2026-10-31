/* ============================================================
   Áudio das músicas do perfil (proxy).

   O browser pede /api/musica/stream/<id> e nós vamos buscar o
   áudio ao YouTube com o yt-dlp. Assim funciona em qualquer
   dispositivo (PC, telemóvel, PWA), com seek e sem anúncios.
   ============================================================ */
const express = require('express');
const { Readable } = require('stream');
const { requireAdmin } = require('../middleware/auth');
const { resolverAudio, buscar, ID_RE } = require('../musica');

const router = express.Router();

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/* Pesquisa de música (só admin). */
router.get('/search', requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    if (!q) return res.json({ ok: true, resultados: [] });
    const resultados = await buscar(q, 14);
    res.json({ ok: true, resultados });
  } catch (e) {
    console.error('Erro musica/search:', e.message);
    res.status(502).json({
      ok: false,
      error: 'Não foi possível pesquisar músicas.',
      resultados: [],
    });
  }
});

function passarCabecalhos(origem, res) {
  const uteis = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'last-modified',
    'etag',
  ];
  for (const nome of uteis) {
    const valor = origem.headers.get(nome);
    if (valor) res.setHeader(nome, valor);
  }
  if (!res.getHeader('accept-ranges')) res.setHeader('accept-ranges', 'bytes');
}

router.get('/stream/:id', async (req, res) => {
  const id = String(req.params.id || '');
  if (!ID_RE.test(id)) {
    return res.status(400).json({ error: 'Música inválida.' });
  }

  const buscar = async (url) =>
    fetch(url, {
      headers: {
        'user-agent': UA,
        ...(req.headers.range ? { range: String(req.headers.range) } : {}),
      },
      redirect: 'follow',
    });

  try {
    let origem;
    try {
      const { url } = await resolverAudio(id);
      origem = await buscar(url);
    } catch {
      origem = null;
    }

    // URL expirada / recusada: limpa a cache e tenta uma vez com URL nova
    if (!origem || (origem.status !== 200 && origem.status !== 206)) {
      const { limparCaches } = require('../musica');
      limparCaches();
      const { url } = await resolverAudio(id);
      origem = await buscar(url);
    }

    if (!origem || (origem.status !== 200 && origem.status !== 206)) {
      return res.status(502).json({ error: 'Não foi possível abrir o áudio desta música.' });
    }

    res.status(origem.status);
    passarCabecalhos(origem, res);
    res.setHeader('cache-control', 'private, max-age=3600');

    if (!origem.body) return res.end();

    const stream = Readable.fromWeb(origem.body);
    stream.on('error', () => {
      try {
        res.end();
      } catch {
        /* nada */
      }
    });
    req.on('close', () => {
      try {
        stream.destroy();
      } catch {
        /* nada */
      }
    });
    stream.pipe(res);
  } catch (e) {
    if (!res.headersSent) {
      res.status(502).json({ error: e.message || 'Falha ao abrir o áudio.' });
    } else {
      res.end();
    }
  }
});

module.exports = { musicaRouter: router };
