const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'los-locaus-secret-key';

const store = require('../usersStore');

// Exige token admin válido (Bearer token).
// Aceita sessão admin antiga OU conta de utilizador com is_admin
// (verificado na base de dados — vale também sem nova entrada).
async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    let ok = false;
    if (payload.admin) ok = true;
    else if (payload.uid) {
      const user = await store.findById(payload.uid);
      if (user && user.is_admin) ok = true;
    }
    if (!ok) return res.status(401).json({ error: 'Sessão inválida ou expirada' });
    req.auth = { admin: true };
    if (payload.uid) {
      req.auth.uid = Number(payload.uid);
      req.auth.username = String(payload.username || '');
    }
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

// Lê o token (utilizador OU admin) sem exigir — coloca em req.auth
function attachAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  req.auth = null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.uid || payload.admin) {
        req.auth = {};
        if (payload.admin) req.auth.admin = true;
        if (payload.uid) {
          req.auth.uid = Number(payload.uid);
          req.auth.username = String(payload.username || '');
        }
      }
    } catch {
      /* token inválido -> anónimo */
    }
  }
  next();
}

// Exige conta de utilizador normal (clips e respetivas interações)
function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Inicia sessão para continuares' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.uid) {
      return res.status(401).json({ error: 'Esta ação é só para contas de utilizador' });
    }
    req.auth = { uid: Number(payload.uid), username: String(payload.username || '') };
    next();
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

// Exige conta de utilizador OU sessão de admin
// (o admin pode publicar clips de teste no painel)
function requireUserOrAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Inicia sessão para continuares' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.uid) {
      req.auth = { uid: Number(payload.uid), username: String(payload.username || '') };
      return next();
    }
    if (payload.admin) {
      req.auth = { admin: true };
      return next();
    }
    res.status(401).json({ error: 'Esta ação é só para contas de utilizador' });
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

module.exports = { requireAdmin, requireUser, requireUserOrAdmin, attachAuth, JWT_SECRET };
