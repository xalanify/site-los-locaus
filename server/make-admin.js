// ============================================================
// Torna uma conta em admin (ou retira):
//   node make-admin.js <nome>          -> concede admin
//   node make-admin.js <nome> retira   -> retira admin
// Usa o mesmo backend das contas (Supabase ou local).
// ============================================================
require('dotenv').config();
const store = require('./usersStore');

(async () => {
  const name = process.argv[2];
  const retira = String(process.argv[3] || '').toLowerCase() === 'retira';

  if (!name) {
    console.log('Uso: node make-admin.js <nome> [retira]');
    process.exit(1);
  }

  console.log('Base de dados de contas:', store.backendInfo());
  try {
    const user = await store.setAdmin(name, !retira);
    if (!user) {
      console.log(`Conta "${name}" não encontrada.`);
      process.exit(1);
    }
    console.log(
      `${user.username} -> admin: ${user.is_admin ? 'SIM' : 'NÃO'}` +
        (retira ? ' (retirado)' : ''),
    );
  } catch (e) {
    console.log('Erro:', e.message);
    if (/is_admin/.test(e.message)) {
      console.log(
        '-> Falta a coluna: corre no painel Supabase (SQL Editor) o bloco "alter table ... is_admin" do supabase-schema.sql',
      );
    }
    process.exit(1);
  }
})();
