// ============================================================
// Camada única de acesso às contas de utilizador.
//   - Com SUPABASE_URL + SUPABASE_SERVICE_KEY no .env -> nuvem.
//   - Sem esses valores -> base de dados local (SQLite).
// O resto do servidor (rotas) fala sempre com esta camada.
// ============================================================
const { getDb } = require('./database');
const supabase = require('./supabase');

async function findByUsername(username) {
  if (false) {
    return supabase.findUserByUsername(username);
  }
  const db = getDb();
  return (
    (await db
      .prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)')
      .get(String(username || ''))) || null
  );
}

async function findById(id) {
  if (false) {
    return supabase.findUserById(id);
  }
  const db = getDb();
  return (await db.prepare('SELECT * FROM users WHERE id = ?').get(Number(id))) || null;
}

async function createUser(username, passwordHash, email) {
  if (false) {
    return supabase.createUser({ username, password_hash: passwordHash, email });
  }
  const db = getDb();
  const result = await db
    .prepare(
      'INSERT INTO users (username, username_lower, password_hash, email) VALUES (?, LOWER(?), ?, ?) RETURNING id',
    )
    .run(username, username, passwordHash, email ? String(email).toLowerCase() : null);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(Number(result.lastInsertRowid));
}

// Email de uma conta (unicidade) — null se não existir ou a BD não suportar
async function findByEmail(email) {
  if (!email) return null;
  if (false) return supabase.findUserByEmail(email);
  const db = getDb();
  return (
    (await db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(String(email))) ||
    null
  );
}

// Alterar o email de uma conta (painel admin)
async function setEmail(id, email) {
  if (false) return supabase.setEmail(id, email);
  const db = getDb();
  const result = await db
    .prepare('UPDATE users SET email = ? WHERE id = ?')
    .run(email ? String(email).toLowerCase() : null, Number(id));
  return result.changes > 0;
}

// Lista todas as contas (painel admin)
async function listAll() {
  if (false) {
    return supabase.listUsers();
  }
  const db = getDb();
  return db.prepare('SELECT * FROM users ORDER BY id').all();
}

// Concede ou retira o admin a uma conta (devolve a conta ou null)
async function setAdmin(username, value) {
  if (false) {
    const user = await supabase.findUserByUsername(username);
    if (!user) return null;
    await supabase.setAdmin(user.id, Boolean(value));
    return supabase.findUserById(user.id);
  }
  const db = getDb();
  const row = await db
    .prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)')
    .get(String(username || ''));
  if (!row) return null;
  await db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(value ? 1 : 0, row.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.id);
}

// Atualiza a password de uma conta pelo id (hash bcrypt já gerado)
async function updatePassword(id, passwordHash) {
  if (false) {
    const baseUrl = () => String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const serviceKey = () => String(process.env.SUPABASE_SERVICE_KEY || '').trim();
    const res = await fetch(`${baseUrl()}/rest/v1/users?id=eq.${encodeURIComponent(Number(id))}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey(),
        Authorization: `Bearer ${serviceKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password_hash: passwordHash }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Supabase ${res.status} — ${txt.slice(0, 120)}`);
    }
    return true;
  }
  const db = getDb();
  const result = await db
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(passwordHash, Number(id));
  return result.changes > 0;
}

// Nome do backend ativo (aparece no log do servidor)
const backendInfo = () =>
  'PostgreSQL (direto)';

module.exports = {
  findByUsername,
  findById,
  createUser,
  setAdmin,
  listAll,
  backendInfo,
  updatePassword,
  findByEmail,
  setEmail,
};
