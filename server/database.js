const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

let db;

function initDatabase() {
  db = new DatabaseSync(DB_PATH);
  
  // Tabela de visitantes
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      user_agent TEXT,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_online INTEGER DEFAULT 1
    )
  `);

  // Tabela de publicações
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      likes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de likes (para evitar likes duplicados)
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      ip TEXT,
      liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);

  // Tabela de comentários das publicações
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      author TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);

  // Tabela de sessões admin
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ---------- Contas de utilizador (clips) ----------
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Coluna de admin (adicionada nesta versão; ignora se já existir)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
  } catch {
    /* já existe */
  }
  // Email da conta (obrigatório no registo; usado na recuperação de pass)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
  } catch {
    /* já existe */
  }
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`);
  } catch {
    /* já existe */
  }

  // Distinções atribuídas manualmente pelo admin (joias do perfil)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_badges (
      user_id INTEGER NOT NULL,
      badge TEXT NOT NULL,
      granted_by INTEGER,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, badge)
    )
  `);

  // Dados extras do perfil (foto por link + nick no CS2)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY,
      avatar_url TEXT,
      game_nick TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

// Pedidos de recuperação de palavra-passe (link enviado por email)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pass_recovery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'sent' | 'used' | 'locked'
      token TEXT,
      expires_at DATETIME,
      code TEXT,
      attempts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(username)
    )
  `);
  // Colunas novas do fluxo por email (ignora se a tabela já as tiver)
  for (const alter of [
    `ALTER TABLE pass_recovery ADD COLUMN email TEXT`,
    `ALTER TABLE pass_recovery ADD COLUMN token TEXT`,
    `ALTER TABLE pass_recovery ADD COLUMN expires_at DATETIME`,
  ]) {
    try {
      db.exec(alter);
    } catch {
      /* já existe */
    }
  }

  // Clips publicados (públicos ou privados)
  db.exec(`
    CREATE TABLE IF NOT EXISTS clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      file TEXT NOT NULL,
      start_sec REAL DEFAULT 0,
      end_sec REAL,
      visibility TEXT DEFAULT 'public',
      likes INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS clip_likes (
      clip_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (clip_id, user_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS clip_saves (
      clip_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (clip_id, user_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS clip_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clip_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      parent_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clip_id) REFERENCES clips(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('Base de dados inicializada');
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb };
