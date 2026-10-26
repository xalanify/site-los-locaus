const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// O .env vive em server/ — o cwd pode ser a raiz (na Vercel), por isso
// dizemos a expressão onde procurar.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { initDatabase } = require('./database');
const { youtubeRouter } = require('./routes/youtube');
const { postsRouter } = require('./routes/posts');
const { statsRouter } = require('./routes/stats');
const { gamesRouter } = require('./routes/games');
const { usersRouter } = require('./routes/users');
const { clipsRouter } = require('./routes/clips');
const { adminRouter } = require('./routes/admin');
const { notificationsRouter } = require('./routes/notifications');
const { specsRouter } = require('./routes/specs');
const { ferramentasRouter } = require('./routes/ferramentas');
const { agenteRouter } = require('./routes/agente');
const { pcRouter } = require('./routes/pc');
const { trackVisitor } = require('./middleware/tracker');
const { backendInfo } = require('./usersStore');

const app = express();
const PORT = process.env.PORT || 3001;
// Na Vercel a app é exportada e não faz listen; localmente escuta na porta.
const IS_VERCEL = process.env.VERCEL === '1';

/* segurança extra: um erro assíncrono de um pedido (stream de download,
   socket abusada…) nunca pode derrubar o servidor inteiro */
process.on('unhandledRejection', (r) => {
  console.error('[async rejeitado — servidor continua]', r && r.stack ? r.stack : r);
});
process.on('uncaughtException', (e) => {
  console.error('[erro não apanhado — servidor continua]', e && e.stack ? e.stack : e);
});

// Inicializar base de dados (a ligação também é criada à 1.ª consulta)
const ready = initDatabase()
  .then(() => {
    console.log(`Contas de utilizador: ${backendInfo()}`);
    // TOP 1 KILL (CS2) automático — líder do ranking ganha a distinção
    const { syncTop1Badge } = require('./top1');
    // 1.º nas previsões automático — líder da classificação ganha a distinção
    const { syncTop1Previsoes } = require('./previsoestop1');
    const { syncStreaks } = require('./previsoesstreak');
    return Promise.allSettled([syncTop1Badge(), syncTop1Previsoes(), syncStreaks()]);
  })
  .then((r) => {
    const cs2 = r && r[0] && r[0].status === 'fulfilled' ? r[0].value : null;
    if (cs2) {
      console.log(
        `Top 1 Kill (CS2): ${cs2.leader} com ${cs2.kills} kills${cs2.conta ? ` -> conta "${cs2.conta}"` : ' -> sem conta correspondente'}`,
      );
    }
    const prev = r && r[1] && r[1].status === 'fulfilled' ? r[1].value : null;
    if (prev && prev.lider) {
      console.log(`1.º nas previsões: conta id ${prev.lider} com ${prev.acertos} acertos.`);
    }
  })
  .catch((err) => console.error('Erro no arranque:', err.message));

// ---------- SEGURANÇA ----------
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    // media-src: os vídeos dos clips vêm do Supabase Storage
    // worker-src: os Web Workers do bench da CPU (blob do próprio site)
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.supabase.co https://www.googleapis.com https://*.googleapis.com; frame-ancestors 'none';"
  );
  next();
});



// O import do R6 manda páginas HTML grandes (dezenas de MB) — esse
// caminho tem o seu próprio parser com limite maior na rota.
app.use((req, res, next) => {
  if (
    req.path === '/api/admin/r6/import' ||
    req.path === '/api/admin/fortnite/import' ||
    req.path === '/api/clips/pub/confirm' ||
    req.path.startsWith('/api/agente')
  ) {
    return next();
  }
  express.json({ limit: '32kb' })(req, res, next);
});

// A publicação no YouTube manda a capa (frame em base64) - precisa de
// um limite maior do que o das outras rotas.
app.use('/api/clips/pub/confirm', express.json({ limit: '6mb' }));

// O agente local envia logs e, no fim, a saída das specs/saúde.
app.use('/api/agente', express.json({ limit: '2mb' }));

const ORIGENS_PERMITIDAS = new Set(
  [process.env.SITE_URL, 'https://locaus.vercel.app', 'https://locaus.fun', 'https://www.locaus.fun']
    .filter(Boolean)
    .map((o) => String(o).replace(/\/+$/, ''))
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const limpo = origin.replace(/\/+$/, '');
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(limpo)) {
        return cb(null, true);
      }
      if (ORIGENS_PERMITIDAS.has(limpo)) return cb(null, true);
      // Previews da Vercel deste projeto (locaus-*.vercel.app)
      if (
        /^https:\/\/locaus(?:-[a-z0-9]+)*(?:-alexandregumes2017-1990s-projects)?\.vercel\.app$/.test(
          limpo
        )
      ) {
        return cb(null, true);
      }
      cb(new Error('Origem não permitida'));
    },
  })
);

// ---------- RATE LIMIT simples ----------
function makeRateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs).unref();

  // Na Vercel cada instância tem a sua memória — o limite é por instância.
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Demasiados pedidos, tenta mais tarde' });
    }
    next();
  };
}

const apiLimiter = makeRateLimit({ windowMs: 60 * 1000, max: 300 });

app.use('/api', trackVisitor);
app.use('/api', apiLimiter);

app.use('/api/youtube', youtubeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/news', require('./routes/news').newsRouter);
app.use('/api/ferramentas', ferramentasRouter);
// Agente local: permite ao site na nuvem correr as ferramentas no PC
app.use('/api/agente', agenteRouter);
// PC embutido: o servidor local executa os trabalhos no próprio PC
app.use('/api/pc', pcRouter);
// InfoAoVivo (beta): app nativo de overlays do PC
const infoaovivoRouter = require('./routes/infoaovivo');
app.use('/api/infoaovivo', infoaovivoRouter);
// /api/users/specs tem de vir ANTES de /api/users — senão "specs"
// seria interpretado como um :username.
app.use('/api/users/specs', specsRouter);
app.use('/api/users', usersRouter);
app.use('/api/clips', clipsRouter);
// Chat geral (polling curto; funciona na Vercel e no telemóvel)
const { chatRouter } = require('./routes/chat');
app.use('/api/chat', chatRouter);
// Previsões R6 (dados oficiais da Ubisoft)
const { previsoesRouter } = require('./routes/previsoes');
app.use('/api/previsoes', previsoesRouter);
// Equipas de esports (CS2 / R6) — pesquisa e ficha
const { equipasRouter } = require('./routes/equipas');
app.use('/api/equipas', equipasRouter);
// Loja de cosméticos (só admin, paga com acertos das previsões)
const { cosmeticosRouter } = require('./routes/cosmeticos');
app.use('/api/cosmeticos', cosmeticosRouter);
// Componentes e periféricos (catálogo + comparação de preços; só admin)
const { componentesRouter } = require('./routes/componentes');
app.use('/api/componentes', componentesRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Não encontrado' }));

// Em produção os ficheiros ficam no Supabase Storage; mantemos um
// redirecionamento para que links antigos continuem a funcionar.
app.use('/uploads/avatars', (req, res) => {
  const name = String(req.params[0] || '').split('/').pop();
  if (/^avatar-[\w-]+\.(jpg|png|webp|gif)$/.test(name || '')) {
    return res.redirect(
      `${process.env.SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/avatars/${name}`
    );
  }
  res.status(404).end();
});

// Localmente servimos o build do React; na Vercel isso é tratado
// pelo próprio Vercel (outputDirectory = client/dist).
if (!IS_VERCEL) {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.message);
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      error: 'O ficheiro é demasiado grande para este pedido. Usa a caixa de import própria (R6/Fortnite) no painel.',
    });
  }
  res.status(500).json({ error: 'Erro interno do servidor' });
});

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
  });
}

// R6 — modo manual (tracker.gg importado no painel admin).
// Não há ciclo automático: a Ubisoft/tracker.gg bloqueiam os servidores.

module.exports = app;
