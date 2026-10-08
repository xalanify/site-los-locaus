const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./database');
const { youtubeRouter } = require('./routes/youtube');
const { postsRouter } = require('./routes/posts');
const { statsRouter } = require('./routes/stats');
const { gamesRouter } = require('./routes/games');
const { usersRouter } = require('./routes/users');
const { clipsRouter } = require('./routes/clips');
const { adminRouter } = require('./routes/admin');
const { trackVisitor } = require('./middleware/tracker');
const { backendInfo } = require('./usersStore');

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar base de dados
initDatabase();
console.log(`Contas de utilizador: ${backendInfo()}`);

// TOP 1 KILL (CS2) automático — líder do ranking ganha a distinção
const { syncTop1Badge } = require('./top1');
syncTop1Badge().then((r) => {
  if (r) {
    console.log(
      `Top 1 Kill (CS2): ${r.leader} com ${r.kills} kills${r.conta ? ` -> conta "${r.conta}"` : ' -> sem conta correspondente'}`,
    );
  }
});

// ---------- SEGURANÇA ----------
// Oculta tecnologias usadas
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Cabeçalhos de segurança
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://i.ytimg.com https://*.ytimg.com https://yt3.ggpht.com https://yt3.googleusercontent.com https://via.placeholder.com https:; connect-src 'self' https://www.googleapis.com; frame-ancestors 'none';"
  );
  next();
});

// Limita o tamanho do corpo dos pedidos
app.use(express.json({ limit: '32kb' }));

// CORS restrito (apenas desenvolvimento local)
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

// Limita a API geral: 300 pedidos / min por IP
const apiLimiter = makeRateLimit({ windowMs: 60 * 1000, max: 300 });

// Rastrear visitantes
app.use('/api', trackVisitor);
app.use('/api', apiLimiter);

// Rotas da API
app.use('/api/youtube', youtubeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/posts', postsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/users', usersRouter);
app.use('/api/clips', clipsRouter);

// 404 para APIs inexistentes
app.use('/api', (req, res) => res.status(404).json({ error: 'Não encontrado' }));

// Vídeos dos clips (ficheiros com nomes aleatórios)
app.use('/clips', express.static(path.join(__dirname, 'data/clips')));
// fotos de perfil escolhidas pelos utilizadores
app.use('/uploads/avatars', express.static(path.join(__dirname, 'data/avatars')));

// Servir o frontend (React build)
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Handler de erros — não expõe detalhes internos
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});
