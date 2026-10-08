// ============================================================
//  Camada de dados — PostgreSQL (Supabase)
//
//  Mantém a MESMA API de sempre para não ter de reescrever as
//  rotas todas:
//
//      const db  = getDb();
//      const row = await db.prepare('SELECT ... WHERE id = ?').get(id);
//      const all = await db.prepare('SELECT ...').all();
//      const res = await db.prepare('INSERT ...').run(a, b);
//
//  Diferenças em relação ao SQLite antigo:
//    - todos os métodos passam a ser ASSÍNCRONOS (=> `await`)
//    - os placeholders `?` são convertidos automaticamente
//      para $1, $2, ... do PostgreSQL
//    - um INSERT que precise do id novo deve terminar em
//      `RETURNING id` (o `run()` devolve-o em lastInsertRowid)
// ============================================================
const { Pool, types } = require('pg');

// int8 e numeric voltam como número (os ids são pequenos;
// sem isto o pg devolve strings e os `===` às vezes falham).
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

let pool = null;
let info = 'não configurado';

function dbConfig() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const ref = url.replace(/^https?:\/\//, '').split('.')[0];
  return {
    host: process.env.SUPABASE_DB_HOST || (ref ? `db.${ref}.supabase.co` : ''),
    port: Number(process.env.SUPABASE_DB_PORT || 6543), // pooler (transaction mode)
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || '',
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
  };
}

const isConfigured = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD);

/**
 * Converte os placeholders `?` do SQLite em $1, $2, ... do PostgreSQL,
 * ignorando o que estiver dentro de literais ('...', "...") e comentários.
 */
function toPg(sql) {
  let n = 0;
  let out = '';
  let inStr = false;
  let quote = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inStr) {
      out += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          out += sql[++i]; // aspas escapadas
        } else {
          inStr = false;
        }
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      inStr = true;
      quote = ch;
      out += ch;
      continue;
    }

    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? sql.length : nl;
      out += sql.slice(i, end);
      i = end - 1;
      continue;
    }

    if (ch === '?') {
      out += '$' + ++n;
      continue;
    }

    out += ch;
  }

  return out;
}

/** O `undefined` não viaja bem no pg — tratamos como null. */
const normalise = (params) => params.map((p) => (p === undefined ? null : p));

function getPool() {
  if (!pool) {
    if (!isConfigured()) {
      throw new Error(
        'PostgreSQL não configurado: falta SUPABASE_URL / SUPABASE_DB_PASSWORD no .env'
      );
    }
    pool = new Pool(dbConfig());
    pool.on('error', (err) => {
      // Não rebenta o processo: o pg repõe a ligação sozinho.
      console.error('Erro na ligação à base de dados:', err.message);
    });
  }
  return pool;
}

/**
 * Objeto com a mesma cara do `DatabaseSync` do node:sqlite.
 * Todos os métodos devolvem Promises — é preciso `await`.
 */
const db = {
  prepare(sql) {
    const query = toPg(sql);
    return {
      async get(...params) {
        const r = await getPool().query(query, normalise(params));
        return r.rows[0]; // undefined quando não há linha (como no SQLite)
      },
      async all(...params) {
        const r = await getPool().query(query, normalise(params));
        return r.rows;
      },
      async run(...params) {
        const r = await getPool().query(query, normalise(params));
        const first = r.rows[0];
        return {
          changes: r.rowCount,
          lastInsertRowid:
            first && first.id !== undefined && first.id !== null ? first.id : 0,
        };
      },
    };
  },

  /** Para SQL sem parâmetros (e múltiplas instruções separadas por ;). */
  async exec(sql) {
    await getPool().query(sql);
  },
};

/** Arranca a ligação e confirma que responde. */
async function initDatabase() {
  if (!isConfigured()) {
    info = 'SEM POSTGRES (falta SUPABASE_DB_PASSWORD no .env)';
    console.log(`⚠ Base de dados: ${info}`);
    return false;
  }
  const p = getPool();
  await p.query('select 1');
  const n = await p.query(
    "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
  );
  info = `Supabase (PostgreSQL) — ${n.rows[0].n} tabelas`;
  console.log(`Base de dados: ${info}`);
  return true;
}

function getDb() {
  return db;
}

function backendInfo() {
  return info;
}

/** Fecha as ligações (útil em testes e no shutdown da Vercel). */
async function closeDatabase() {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end().catch(() => {});
  }
}

module.exports = { initDatabase, getDb, backendInfo, closeDatabase, isConfigured };
