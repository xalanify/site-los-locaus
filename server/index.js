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
const { trackVisitor } = require('./middleware/tracker');
const { backendInfo } = require('./usersStore');

const app = express();
const PORT = process.env.PORT || 3001;
// Na Vercel a app é exportada e não faz listen; localmente escuta na porta.
const IS_VERCEL = process.env.VERCEL === '1';

// Inicializar base de dados (a ligação também é criada à 1.ª consulta)
const ready = initDatabase()
  .then(() => {
    console.log(`Contas de utilizador: ${backendInfo()}`);
    // TOP 1 KILL (CS2) automático — líder do ranking ganha a distinção
    const { syncTop1Badge } = require('./top1');
    return syncTop1Badge();
  })
  .then((r) => {
    if (r) {
      console.log(
        `Top 1 Kill (CS2): ${r.leader} com ${r.kills} kills${r.conta ? ` -> conta "${r.conta}"` : ' -> sem conta correspondente'}`,
      );
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
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com https://fonts.googleapis.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.supabase.co https://www.googleapis.com; frame-ancestors 'none';"
  );
  next();
});

// ---------- MODO "EM BREVE" (só na Vercel) ----------
// Enquanto existir o marcador vercel-site/EM_BREVE no repositório,
// a produção devolve a página de placeholder em todos os pedidos
// (páginas e API). O site real continua a correr em localhost.
// Para publicar: apagar o marcador e fazer push.
let emBreveHtml = null;
if (IS_VERCEL) {
  try {
    const marcador = path.join(__dirname, '../vercel-site/EM_BREVE');
    const pagina = path.join(__dirname, '../vercel-site/index.html');
    if (fs.existsSync(marcador) && fs.existsSync(pagina)) {
      emBreveHtml = fs.readFileSync(pagina, 'utf8');
      console.log('Modo EM BREVE ativo: produção serve só a página de placeholder.');
    }
  } catch (err) {
    console.error('EM_BREVE (a ignorar):', err.message);
  }
}
if (emBreveHtml) {
  app.use((req, res, next) => {
    // clientes que esperam JSON (a API) recebem 503; o resto vê a página
    const wantsHtml = String(req.headers.accept || '').includes('text/html');
    if (!wantsHtml && req.path.startsWith('/api')) {
      return res.status(503).json({ error: 'Site em desenvolvimento — em breve.' });
    }
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.status(200).type('html').send(emBreveHtml);
  });
}

app.use(express.json({ limit: '32kb' }));

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
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
app.use('/api/ferramentas', ferramentasRouter);
// /api/users/specs tem de vir ANTES de /api/users — senão "specs"
// seria interpretado como um :username.
app.use('/api/users/specs', specsRouter);
app.use('/api/users', usersRouter);
app.use('/api/clips', clipsRouter);

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
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
  });
}

// R6 automático — atualiza o r6.json de 3 em 3 minutos (com TRACKER_API_KEY)
try {
  require('./r6auto').start();
} catch (e) {
  console.warn('R6 automático (a ignorar):', e.message);
}

module.exports = app;
