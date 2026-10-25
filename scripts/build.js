/* ============================================================
   Build da Vercel (buildCommand)
   ------------------------------------------------------------
   Compila o client (npm install + npm run build em client/).
   O site real fica em client/dist — sem página "em breve".
   ============================================================ */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CLIENT = path.join(ROOT, 'client');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(args, cwd) {
  const r = spawnSync(npm, args, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`Falha ao executar: npm ${args.join(' ')}`);
    process.exit(r.status || 1);
  }
}

run(['install'], CLIENT);
run(['run', 'build'], CLIENT);

console.log('Build concluído: site real em client/dist.');
