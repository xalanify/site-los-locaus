// ============================================================
// Ligação à base de dados SUPABASE (contas de utilizador).
//   - Só o SERVIDOR fala com o Supabase (chave service_role,
//     nunca vai para o browser).
//   - Ligar em server/.env:
//       SUPABASE_URL=https://xxxxxxxx.supabase.co
//       SUPABASE_SERVICE_KEY=eyJhbGci...
//   - Sem esses valores o site usa a base de dados local
//     (server/database.sqlite) — tudo continua a funcionar.
// ============================================================
const fetch = require('node-fetch');

const baseUrl = () => String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceKey = () => String(process.env.SUPABASE_SERVICE_KEY || '');
const isConfigured = () => Boolean(baseUrl() && serviceKey());

// Pedido genérico à REST API do Supabase (PostgREST)
async function request(pathAndQuery, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${baseUrl()}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status} — ${txt.slice(0, 180)}`);
  }
  const txt = await res.text();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

// Primeira linha ou null
const firstRow = async (query) => {
  const rows = await request(query);
  return Array.isArray(rows) ? rows[0] || null : null;
};

// Conta por nome (sem distinção de maiúsculas — usa a coluna username_lower)
async function findUserByUsername(username) {
  const lower = String(username || '').toLowerCase();
  return firstRow(`users?username_lower=eq.${encodeURIComponent(lower)}&limit=1`);
}

// Conta por id
async function findUserById(id) {
  return firstRow(`users?id=eq.${encodeURIComponent(Number(id) || 0)}&limit=1`);
}

// Criar conta (devolve a linha criada, com id)
async function createUser({ username, password_hash, email }) {
  if (email && !(await emailSupported())) {
    // Não cria conta "às cegas" sem email — seria impossível recuperar a pass
    throw new Error('EMAIL_COLUMN_MISSING');
  }
  const withEmail = email && (await emailSupported());
  const rows = await request('users', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      username,
      username_lower: String(username).toLowerCase(),
      password_hash,
      ...(withEmail ? { email: String(email).toLowerCase() } : {}),
    },
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

// Guardar/alterar o email de uma conta (painel admin ou registo)
async function setEmail(id, email) {
  if (!(await emailSupported())) {
    throw new Error('Coluna "email" em falta na tabela Supabase.');
  }
  const rows = await request(`users?id=eq.${encodeURIComponent(Number(id))}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { email: email ? String(email).toLowerCase() : null },
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

// Conta por email (unicidade)
async function findUserByEmail(email) {
  if (!email) return null;
  if (!(await emailSupported())) return null;
  return firstRow(
    `users?email=eq.${encodeURIComponent(String(email).toLowerCase())}&limit=1`,
  );
}

// A tabela Supabase já tem a coluna "email"?
// (sonda uma vez e guarda o resultado — evita partir o registo se faltar)
let emailColState = null;
async function emailSupported() {
  if (emailColState !== null) return emailColState;
  try {
    await request('users?select=email&limit=1');
    emailColState = true;
  } catch (error) {
    emailColState = false;
    console.warn(
      'AVISO: a tabela Supabase não tem a coluna "email".\n' +
        '       Adenta no Supabase > SQL Editor e corre:\n' +
        '       ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;\n' +
        `       (${String(error.message).slice(0, 90)})`,
    );
  }
  return emailColState;
}

// Concede ou retira o admin (coluna is_admin)
async function setAdmin(id, value) {
  await request(`users?id=eq.${encodeURIComponent(Number(id))}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { is_admin: Boolean(value) },
  });
}

// Lista todas as contas (painel admin)
async function listUsers() {
  return request('users?select=*&order=id.asc');
}

module.exports = {
  isConfigured,
  findUserByUsername,
  findUserById,
  createUser,
  setAdmin,
  listUsers,
  setEmail,
  findUserByEmail,
  emailSupported,
};
