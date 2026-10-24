/* ============================================================
   Atualização automática do R6 (Ubisoft) — usada pelo GitHub
   Actions (cron). Faz 1 ciclo completo e sai.

   Credenciais vêm das variáveis de ambiente (Secrets do GitHub):
     UBI_EMAIL / UBI_PASSWORD
   ============================================================ */
const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
} catch {}

const r6ubi = require('../server/r6ubi');

r6ubi
  .atualizar()
  .then((r) => {
    console.log('R6 atualizado:', JSON.stringify(r));
    process.exit(r && r.ok ? 0 : 1);
  })
  .catch((e) => {
    console.error('Erro ao atualizar R6:', e && e.message);
    process.exit(1);
  });
