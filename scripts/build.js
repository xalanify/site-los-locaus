/* ============================================================
   Build da Vercel (buildCommand)
   ------------------------------------------------------------
   1. Compila o client (npm install + npm run build em client/).
   2. Se estiver na Vercel E existir o marcador vercel-site/EM_BREVE,
      substitui client/dist/index.html pela página de placeholder —
      assim todas as rotas do site mostram "em breve" em produção.

   Em localhost este script não substitui nada (só corre na Vercel);
   o INICIAR.bat compila o client diretamente.
   ============================================================ */
const { spawnSync } = require('child_process');
const fs = require('fs');
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

const naVercel = process.env.VERCEL === '1';
const marcador = path.join(ROOT, 'vercel-site', 'EM_BREVE');
const placeholder = path.join(ROOT, 'vercel-site', 'index.html');
const distIndex = path.join(CLIENT, 'dist', 'index.html');

if (!naVercel) {
  console.log('Build local: site real mantido em client/dist.');
} else if (fs.existsSync(marcador)) {
  if (!fs.existsSync(placeholder)) {
    console.error('EM_BREVE existe mas falta vercel-site/index.html');
    process.exit(1);
  }
  fs.copyFileSync(placeholder, distIndex);
  console.log('MODO EM BREVE: produção serve a página de placeholder.');
} else {
  console.log('Site real publicado (sem marcador EM_BREVE).');
}
